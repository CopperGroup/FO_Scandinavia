"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import Product from "../models/product.model";
import Category from "../models/category.model";
import User from "../models/user.model";
import Order from "../models/order.model";
import { connectToDB } from "../mongoose";
import { CreateUrlParams, ProductType } from "../types/types";
import clearCache from "./cache";
import { addPromo } from "./user.actions";
import { getSessionUser } from "@/lib/auth/guards";
import { requireCatalogAdmin, currentUserEmail } from "@/lib/admin/catalog-auth";
import {
  findCategoryByName,
  loadCategoryOptions,
  syncCategoryMembership,
  toObjectIds,
} from "@/lib/admin/categories";
import { resolveProductIds, type ProductListFilter } from "@/lib/admin/products";
import {
  DELETED_PRODUCT_ID,
  adjustPrice,
  categoryNameProblem,
  isObjectIdLike,
  normalizeCategoryName,
  productsWord,
  splitCategoryInput,
} from "@/lib/admin/catalog-shared";

type Oid = mongoose.Types.ObjectId;
const { ObjectId } = mongoose.Types;

interface CreateParams {
  _id?: string;
  id: string;
  name: string;
  quantity: number;
  images: string[];
  url: string;
  price: number;
  priceToShow: number;
  vendor: string;
  category: string[];
  description: string;
  isAvailable: boolean;
  articleNumber?: string;
  params?: { name: string; value: string }[];
  customParams?: { name: string; value: string }[];
  /** Names of categories to find (case-insensitively) or create. */
  newCategories?: string[];
}

interface InterfaceProps {
  productId: string;
  /** Ignored: the shopper is read from the session, never from the request. */
  email?: string;
  path: string;
}

const DELETED_PRODUCT_OID = new ObjectId(DELETED_PRODUCT_ID);

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

type CatalogEvent = "createProduct" | "updateProduct" | "updateProducts" | "deleteProduct";

/**
 * One cache call per user action, after the writes. clearCache (lib/actions/cache.ts)
 * also invalidates the storefront catalog snapshot for these events.
 */
async function afterCatalogWrite(event: CatalogEvent, productId?: string) {
  await clearCache(event, productId);
}

/** Only real ObjectIds survive; strings such as "No-category" or undefined never reach the database. */
function cleanCategoryIds(values: unknown): Oid[] {
  return Array.isArray(values) ? toObjectIds(values) : [];
}

/**
 * Keeps Category.products in step for a single product without a full
 * recount (used by the per-product importer actions). Bulk actions use
 * syncCategoryMembership instead.
 */
async function setProductMembership(productId: Oid, categoryIds: Oid[]) {
  await Promise.all([
    categoryIds.length ? Category.updateMany({ _id: { $in: categoryIds } }, { $addToSet: { products: productId } }) : null,
    Category.updateMany({ _id: { $nin: categoryIds }, products: productId }, { $pull: { products: productId } }),
  ]);
}

/**
 * Turns the form's category list into ids of existing categories. Unknown
 * id-like values are dropped (they are deleted categories, never names); new
 * names are trimmed, matched case-insensitively against existing categories
 * and created only when nothing matches.
 */
async function resolveCategoryInput(values: unknown[], newNames: unknown[]): Promise<Oid[]> {
  const existing = await loadCategoryOptions();
  const split = splitCategoryInput(values, newNames, existing);
  const ids = split.ids.map((id) => new ObjectId(id));

  for (const name of split.newNames) {
    const found = await findCategoryByName(name);
    if (found) {
      ids.push(new ObjectId(found.id));
      continue;
    }
    const created = await Category.create({ name, products: [], totalValue: 0, subCategories: [] });
    ids.push(created._id);
  }

  return toObjectIds(ids);
}

function cleanParams(params: unknown): { name: string; value: string }[] {
  if (!Array.isArray(params)) return [];
  return params
    .map((param) => ({ name: String(param?.name ?? "").trim(), value: String(param?.value ?? "").trim() }))
    .filter((param) => param.name && param.value);
}

function cleanImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return Array.from(new Set(images.map((image) => String(image ?? "").trim()).filter(Boolean)));
}

function money(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

function plain<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/* -------------------------------------------------------------------------- */
/*                         XML importer (per product)                         */
/* -------------------------------------------------------------------------- */

export async function createUrlProduct({ id, name, isAvailable, quantity, url, priceToShow, price, images, vendor, description, articleNumber, params, isFetched, category }: CreateUrlParams) {
  try {
    await requireCatalogAdmin();
    await connectToDB();

    const categoryIds = cleanCategoryIds(category);
    const created = await Product.create({
      id,
      name,
      isAvailable,
      quantity,
      url,
      priceToShow,
      price,
      images,
      vendor,
      description,
      params,
      articleNumber,
      isFetched,
      category: categoryIds,
    });
    await setProductMembership(created._id, categoryIds);
    // No cache work here: the importer calls this once per product and invalidates once at the end.
  } catch (error: any) {
    throw new Error(`Error creating url-product, ${error.message}`);
  }
}

export async function updateUrlProduct({ _id, id, name, isAvailable, quantity, url, priceToShow, price, images, vendor, description, params, isFetched, category }: CreateUrlParams) {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    if (!isObjectIdLike(_id)) throw new Error("Invalid product id");

    const categoryIds = cleanCategoryIds(category);
    await Product.updateOne(
      { _id },
      { $set: { id, name, isAvailable, quantity, url, priceToShow, price, images, vendor, description, params, isFetched, category: categoryIds } },
    );
    await setProductMembership(new ObjectId(_id), categoryIds);
  } catch (error: any) {
    throw new Error(`Error updating url-product, ${error.message}`);
  }
}

/** Bulk version for the importer: one bulkWrite and one membership sync. */
export async function updateUrlProductsMany(products: Partial<CreateUrlParams>[]) {
  try {
    await requireCatalogAdmin();
    await connectToDB();

    const valid = products.filter((product) => isObjectIdLike(product._id));
    if (valid.length === 0) return;

    const touched = new Set<string>();
    const before = await Product.find({ _id: { $in: valid.map((product) => product._id) } }).select("category").lean<{ category?: Oid[] }[]>();
    for (const row of before) for (const id of row.category ?? []) touched.add(String(id));

    await Product.bulkWrite(
      valid.map((product) => {
        const { _id, ...rest } = product;
        const update: Record<string, unknown> = { ...rest };
        if ("category" in rest) {
          const ids = cleanCategoryIds(rest.category);
          ids.forEach((id) => touched.add(String(id)));
          update.category = ids;
        }
        return { updateOne: { filter: { _id }, update: { $set: update } } };
      }),
      { ordered: false },
    );

    await syncCategoryMembership(Array.from(touched));
    await afterCatalogWrite("updateProducts");
  } catch (error: any) {
    throw new Error(`Error updating url-products in bulk, ${error.message}`);
  }
}

export async function fetchUrlProducts(type?: "json") {
  try {
    await requireCatalogAdmin();
    await connectToDB();

    const urlProducts = await Product.find({ _id: { $ne: DELETED_PRODUCT_OID }, isFetched: true })
      .select("_id id articleNumber category")
      .lean();

    return type === "json" ? JSON.stringify(urlProducts) : plain(urlProducts);
  } catch (error: any) {
    throw new Error(`Error finding url-added products: ${error.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                               Admin reads                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every product with one image, as JSON. Still used by the order page's
 * "add product" dialog (orders slice); the products admin no longer loads it.
 */
export async function fetchProducts() {
  try {
    await requireCatalogAdmin();
    await connectToDB();

    const products = await Product.find(
      { _id: { $ne: DELETED_PRODUCT_OID } },
      { id: 1, vendor: 1, name: 1, isAvailable: 1, price: 1, priceToShow: 1, images: { $slice: 1 }, category: 1, articleNumber: 1, quantity: 1, createdAt: 1, updatedAt: 1 },
    ).lean();

    return JSON.stringify(products);
  } catch (error: any) {
    throw new Error(`Error fetching products, ${error.message}`);
  }
}

export async function fetchProductById(_id: string): Promise<ProductType>;
export async function fetchProductById(_id: string, type: "json"): Promise<string>;

export async function fetchProductById(_id: string, type?: "json") {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    if (!isObjectIdLike(_id)) throw new Error("Product not found");

    const product = await Product.findById(_id)
      .select("_id id name description images price priceToShow quantity isAvailable articleNumber vendor url category params isFetched createdAt updatedAt")
      .lean();
    if (!product) throw new Error("Product not found");

    return type === "json" ? JSON.stringify(product) : plain<ProductType>(product);
  } catch (error: any) {
    throw new Error(`Error fetching product by _id: ${error.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                          Create / edit (admin form)                        */
/* -------------------------------------------------------------------------- */

function productDocument(input: CreateParams) {
  const price = money(input.price);
  let priceToShow = money(input.priceToShow);
  if (!(priceToShow > 0) || priceToShow > price) priceToShow = price;
  return {
    name: String(input.name ?? "").trim(),
    description: String(input.description ?? ""),
    images: cleanImages(input.images),
    quantity: Math.max(0, Math.floor(Number(input.quantity) || 0)),
    url: String(input.url ?? "").trim(),
    price,
    priceToShow,
    vendor: String(input.vendor ?? "").trim() || "Не вказано",
    isAvailable: input.isAvailable === true,
    articleNumber: String(input.articleNumber ?? "").trim(),
    params: cleanParams(input.customParams ?? input.params),
  };
}

function validateProduct(document: ReturnType<typeof productDocument>) {
  if (document.name.length < 3) throw new Error("Назва товару має містити щонайменше 3 символи.");
  if (!(document.price > 0)) throw new Error("Вкажіть ціну більше нуля.");
}

export async function createProduct(params: CreateParams): Promise<ProductType>;
export async function createProduct(params: CreateParams, type: "json"): Promise<string>;

export async function createProduct(input: CreateParams, type?: "json"): Promise<ProductType | string> {
  try {
    await requireCatalogAdmin();
    await connectToDB();

    const document = productDocument(input);
    validateProduct(document);
    const id = String(input.id ?? "").trim();
    if (!id) throw new Error("Товар потребує ID.");
    if (await Product.exists({ id })) throw new Error(`Товар з ID ${id} уже існує.`);

    const categoryIds = await resolveCategoryInput(input.category ?? [], input.newCategories ?? []);
    const created = await Product.create({ ...document, id, category: categoryIds });

    await syncCategoryMembership(categoryIds);
    await afterCatalogWrite("createProduct");

    const result = plain<ProductType>(created.toObject());
    return type === "json" ? JSON.stringify(result) : result;
  } catch (error: any) {
    throw new Error(`Error creating new product, ${error.message}`);
  }
}

export async function editProduct(params: CreateParams): Promise<ProductType>;
export async function editProduct(params: CreateParams, type: "json"): Promise<string>;

export async function editProduct(input: CreateParams, type?: "json") {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    if (!isObjectIdLike(input._id)) throw new Error("Товар не знайдено.");

    const document = productDocument(input);
    validateProduct(document);

    const previous = await Product.findById(input._id).select("category").lean<{ category?: Oid[] } | null>();
    if (!previous) throw new Error("Товар не знайдено: можливо, його вже видалили.");

    const categoryIds = await resolveCategoryInput(input.category ?? [], input.newCategories ?? []);
    const updated = await Product.findByIdAndUpdate(input._id, { $set: { ...document, category: categoryIds } }, { new: true }).lean();

    await syncCategoryMembership([...(previous.category ?? []), ...categoryIds]);
    await afterCatalogWrite("updateProduct", input._id);

    return type === "json" ? JSON.stringify(updated) : plain<ProductType>(updated);
  } catch (error: any) {
    throw new Error(`Error updating product: ${error.message}`);
  }
}

export type SaveProductResult = { ok: true; _id: string; message: string } | { ok: false; error: string };

/** The product form's save: creates when there is no _id, edits otherwise. Never throws. */
export async function saveProduct(input: CreateParams): Promise<SaveProductResult> {
  try {
    if (input._id) {
      const saved = JSON.parse(await editProduct(input, "json"));
      return { ok: true, _id: String(saved._id), message: "Зміни збережено." };
    }
    const saved = JSON.parse(await createProduct(input, "json"));
    return { ok: true, _id: String(saved._id), message: "Товар створено." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { ok: false, error: message.replace(/^Error (creating new product|updating product)[,:]\s*/, "") || "Не вдалося зберегти товар." };
  }
}

/* -------------------------------------------------------------------------- */
/*                               Bulk actions                                 */
/* -------------------------------------------------------------------------- */

export type BulkTarget = { ids?: string[]; filter?: ProductListFilter };

async function resolveTarget(target: BulkTarget): Promise<Oid[]> {
  if (target.filter) return (await resolveProductIds(target.filter)).filter((id) => !id.equals(DELETED_PRODUCT_OID));
  return toObjectIds(target.ids ?? []).filter((id) => !id.equals(DELETED_PRODUCT_OID));
}

/** Adds the products to a category, or makes it their only category. One updateMany. */
async function setCategoryForProducts(
  target: BulkTarget,
  options: { categoryId?: string; newCategoryName?: string; mode: "add" | "replace" },
): Promise<{ matched: number; modified: number; categoryId: string; categoryName: string }> {
  await requireCatalogAdmin();
  await connectToDB();

  const ids = await resolveTarget(target);
  if (ids.length === 0) throw new Error("Не вибрано жодного товару.");

  let categoryId = isObjectIdLike(options.categoryId) ? options.categoryId.toLowerCase() : "";
  let categoryName = "";
  if (categoryId) {
    const category = await Category.findById(categoryId).select("_id name").lean<{ _id: Oid; name?: string } | null>();
    if (!category) throw new Error("Цієї категорії вже не існує. Оновіть сторінку.");
    categoryName = category.name ?? "";
  } else {
    const name = normalizeCategoryName(options.newCategoryName);
    const problem = categoryNameProblem(name);
    if (problem) throw new Error(problem);
    const found = await findCategoryByName(name);
    if (found) {
      categoryId = found.id;
      categoryName = found.name;
    } else {
      const created = await Category.create({ name, products: [], totalValue: 0, subCategories: [] });
      categoryId = String(created._id);
      categoryName = name;
    }
  }

  const target_ = new ObjectId(categoryId);
  const before = options.mode === "replace" ? await Product.distinct("category", { _id: { $in: ids } }) : [];
  const result =
    options.mode === "replace"
      ? await Product.updateMany({ _id: { $in: ids } }, { $set: { category: [target_] } })
      : await Product.updateMany({ _id: { $in: ids } }, { $addToSet: { category: target_ } });

  await syncCategoryMembership([...before, target_]);
  await afterCatalogWrite("updateProducts");
  return { matched: result.matchedCount, modified: result.modifiedCount, categoryId, categoryName };
}

/** Changes regular and sale price by a percentage in one updateMany. */
async function adjustPricesForProducts(
  target: BulkTarget,
  options: { percent: number; direction: "decrease" | "increase" },
): Promise<{ matched: number; modified: number }> {
  await requireCatalogAdmin();
  await connectToDB();

  const percent = Number(options.percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 1000) throw new Error("Вкажіть відсоток більше нуля.");
  if (options.direction === "decrease" && percent >= 100) throw new Error("Зменшити ціну можна менше ніж на 100%.");
  const direction = options.direction === "increase" ? "increase" : "decrease";
  const factor = direction === "decrease" ? 1 - percent / 100 : 1 + percent / 100;

  const ids = await resolveTarget(target);
  if (ids.length === 0) throw new Error("Не вибрано жодного товару.");

  const result = await Product.updateMany({ _id: { $in: ids } }, [
    {
      $set: {
        price: { $max: [0, { $round: [{ $multiply: [{ $ifNull: ["$price", 0] }, factor] }, 0] }] },
        priceToShow: { $max: [0, { $round: [{ $multiply: [{ $ifNull: ["$priceToShow", { $ifNull: ["$price", 0] }] }, factor] }, 0] }] },
      },
    },
  ]);

  // Category totals hold the sum of sale prices.
  await syncCategoryMembership(await Product.distinct("category", { _id: { $in: ids } }));
  await afterCatalogWrite("updateProducts");
  return { matched: result.matchedCount, modified: result.modifiedCount };
}

/** Kept for compatibility: one product's prices by a percentage. Now rounds and invalidates the catalog. */
export const applyDiscountToProduct = async ({
  productId,
  percentage,
  direction,
}: {
  productId: string;
  percentage: number;
  direction: "Зменшити" | "Збільшити";
}): Promise<void> => {
  await requireCatalogAdmin();
  if (!isObjectIdLike(productId) || typeof percentage !== "number" || percentage < 0) {
    throw new Error("Invalid input: productId and a non-negative percentage are required.");
  }
  await connectToDB();
  const product = await Product.findById(productId).select("price priceToShow category").lean<{ price?: number; priceToShow?: number; category?: Oid[] } | null>();
  if (!product) throw new Error("Product not found");
  const dir = direction === "Збільшити" ? "increase" : "decrease";
  await Product.updateOne(
    { _id: productId },
    { $set: { price: adjustPrice(product.price ?? 0, percentage, dir), priceToShow: adjustPrice(product.priceToShow ?? product.price ?? 0, percentage, dir) } },
  );
  await syncCategoryMembership(product.category ?? []);
  await afterCatalogWrite("updateProduct", productId);
};

/**
 * Deletes products and everything that points at them, with a fixed number of
 * queries whatever the count: order lines that held one of them get the
 * "deleted product" placeholder (only those lines), likes are pulled from
 * users, categories are recounted.
 */
async function deleteProductsByIds(ids: Oid[]): Promise<number> {
  const victims = ids.filter((id) => !id.equals(DELETED_PRODUCT_OID));
  if (victims.length === 0) return 0;

  const categories = await Product.distinct("category", { _id: { $in: victims } });

  await Promise.all([
    Order.updateMany(
      { "products.product": { $in: victims } },
      { $set: { "products.$[line].product": DELETED_PRODUCT_OID } },
      { arrayFilters: [{ "line.product": { $in: victims } }] },
    ),
    User.updateMany({ likes: { $in: victims } }, { $pull: { likes: { $in: victims } } }),
  ]);

  const result = await Product.deleteMany({ _id: { $in: victims } });
  await syncCategoryMembership(categories);
  return result.deletedCount ?? 0;
}

export async function deleteManyProducts(_ids: string[], cache?: "keep-catalog-cache") {
  try {
    await requireCatalogAdmin();
    await connectToDB();

    const deleted = await deleteProductsByIds(toObjectIds(_ids));
    if (deleted === 0) throw new Error("No products found for deletion");
    if (!cache) await afterCatalogWrite("deleteProduct");
    return deleted;
  } catch (error: any) {
    throw new Error(`Error deleting products: ${error.message}`);
  }
}

/** Deletes the selected products, or every product matching the list filter. */
async function deleteProductsForTarget(target: BulkTarget): Promise<{ deleted: number }> {
  await requireCatalogAdmin();
  await connectToDB();
  const ids = await resolveTarget(target);
  if (ids.length === 0) throw new Error("Не вибрано жодного товару.");
  const deleted = await deleteProductsByIds(ids);
  await afterCatalogWrite("deleteProduct");
  return { deleted };
}

/**
 * Bulk actions answer with a result instead of throwing: in production Next.js
 * hides thrown messages from the browser, and the admin needs to read why.
 */
export type BulkResult = { ok: true; message: string; count: number } | { ok: false; error: string };

async function attempt(work: () => Promise<{ message: string; count: number }>): Promise<BulkResult> {
  try {
    return { ok: true, ...(await work()) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Не вдалося виконати дію. Спробуйте ще раз." };
  }
}

const productWord = productsWord;

export async function bulkSetProductCategory(
  target: BulkTarget,
  options: { categoryId?: string; newCategoryName?: string; mode: "add" | "replace" },
): Promise<BulkResult> {
  return attempt(async () => {
    const result = await setCategoryForProducts(target, options);
    const verb = options.mode === "add" ? "Додано до" : "Перенесено в";
    return { count: result.matched, message: `${verb} «${result.categoryName}»: ${result.matched} ${productWord(result.matched)}.` };
  });
}

export async function bulkAdjustProductPrices(target: BulkTarget, options: { percent: number; direction: "decrease" | "increase" }): Promise<BulkResult> {
  return attempt(async () => {
    const result = await adjustPricesForProducts(target, options);
    const verb = options.direction === "increase" ? "збільшено" : "зменшено";
    return { count: result.matched, message: `Ціни ${verb} на ${options.percent}% для ${result.matched} ${productWord(result.matched)}.` };
  });
}

export async function bulkDeleteProducts(target: BulkTarget): Promise<BulkResult> {
  return attempt(async () => {
    const result = await deleteProductsForTarget(target);
    return { count: result.deleted, message: `Видалено ${result.deleted} ${productWord(result.deleted)}.` };
  });
}

export async function deleteProduct(id: { productId: string } | { product_id: string }, cache?: "keep-catalog-cache") {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    if (!id) return;

    const filter =
      "productId" in id
        ? { id: id.productId }
        : isObjectIdLike(id.product_id)
          ? { _id: new ObjectId(id.product_id) }
          : null;
    if (!filter) return;

    const product = await Product.findOne(filter).select("_id").lean<{ _id: Oid } | null>();
    if (!product) return;

    await deleteProductsByIds([product._id]);
    if (!cache) await afterCatalogWrite("deleteProduct");
  } catch (error: any) {
    throw new Error(`Error deleting product: ${error.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                         Storefront (public) actions                        */
/* -------------------------------------------------------------------------- */

/**
 * Toggles a like for the signed-in shopper. Two small updates, no cache purge:
 * a like changes nothing shoppers see in the catalog.
 */
export async function addLike({ productId, path }: InterfaceProps) {
  try {
    const email = await currentUserEmail();
    if (!email) return;
    await connectToDB();

    const or: Record<string, unknown>[] = [{ id: productId }];
    if (isObjectIdLike(productId)) or.push({ _id: new ObjectId(productId) });
    const [product, user] = await Promise.all([
      Product.findOne({ $or: or }).select("_id").lean<{ _id: Oid } | null>(),
      User.findOne({ email }).select("_id likes").lean<{ _id: Oid; likes?: Oid[] } | null>(),
    ]);
    if (!product || !user) return;

    const isLiked = (user.likes ?? []).some((id) => String(id) === String(product._id));
    if (isLiked) {
      await Promise.all([
        Product.updateOne({ _id: product._id }, { $pull: { likedBy: user._id } }),
        User.updateOne({ _id: user._id }, { $pull: { likes: product._id } }),
      ]);
    } else {
      await Promise.all([
        Product.updateOne({ _id: product._id }, { $addToSet: { likedBy: user._id } }),
        User.updateOne({ _id: user._id }, { $addToSet: { likes: product._id } }),
      ]);
    }

    if (path) revalidatePath(path);
    revalidatePath(`/liked/${user._id}`);
  } catch (error: any) {
    throw new Error(`Error adding like to the product, ${error.message}`);
  }
}

/** Ids of the products a signed-in shopper has liked. Empty for guests. */
export async function fetchLikedProductIds(email: string | null | undefined): Promise<string[]> {
  if (!email) return [];

  try {
    await connectToDB();

    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({ email: { $regex: `^${escapedEmail}$`, $options: "i" } })
      .select("likes")
      .lean<{ likes?: unknown[] }>();

    return (user?.likes ?? []).map(String);
  } catch (error: any) {
    throw new Error(`Error fetching liked product ids, ${error.message}`);
  }
}

export async function fetchLikedProducts(userId: string) {
  try {
    await connectToDB();
    if (!isObjectIdLike(userId)) return [];

    const likedProducts = await Product.find({ isAvailable: true, likedBy: userId })
      .populate({ path: "likedBy", model: User, select: "_id email" })
      .lean();

    return plain<any[]>(likedProducts);
  } catch (error: any) {
    throw new Error(`Error fecthing liked posts, ${error.message}`);
  }
}

const ADDED_TO_CART_KEEP = 500;

/** Counts an add-to-cart. Public; one update, keeps the newest 500 timestamps, purges no cache. */
export async function productAddedToCart(id: string) {
  try {
    if (!isObjectIdLike(id)) return;
    await connectToDB();
    await Product.updateOne({ _id: id }, { $push: { addedToCart: { $each: [new Date()], $slice: -ADDED_TO_CART_KEEP } } });
  } catch (error: any) {
    throw new Error(`Error adding prduct to cart: ${error.message}`);
  }
}

const PRODUCT_PAGE_FIELDS =
  "_id id name description category images price priceToShow params articleNumber reviews isAvailable quantity url vendor";

/**
 * The product as the storefront product page needs it: display fields only,
 * with category names resolved. Size/colour choices come from the catalog
 * service (see lib/catalog), not from this query.
 */
export async function fetchProductForPage(productId: string) {
  // An address that cannot be a product id is simply not a product.
  if (!/^[0-9a-f]{24}$/i.test(productId)) return null;
  try {
    await connectToDB();

    const product = await Product.findById(productId)
      .select(PRODUCT_PAGE_FIELDS)
      .populate({ path: "category", model: Category, select: "_id name" })
      .lean();

    return product ? JSON.parse(JSON.stringify(product)) : null;
  } catch (error: any) {
    throw new Error(`Error fetching product page data: ${error.message}`);
  }
}

export async function getTop3ProductsBySales(): Promise<ProductType[]>;
export async function getTop3ProductsBySales(type: "json"): Promise<string>;

/** The three best sellers for e-mails. Projects the few fields the e-mails use before sorting. */
export async function getTop3ProductsBySales(type?: "json") {
  try {
    await connectToDB();

    const topProducts = await Product.aggregate([
      { $match: { _id: { $ne: DELETED_PRODUCT_OID } } },
      { $project: { _id: 1, name: 1, priceToShow: 1, price: 1, images: { $slice: [{ $ifNull: ["$images", []] }, 1] }, salesCount: { $size: { $ifNull: ["$orderedBy", []] } } } },
      { $sort: { salesCount: -1, _id: 1 } },
      { $limit: 3 },
    ]);

    return type === "json" ? JSON.stringify(topProducts) : topProducts;
  } catch (error: any) {
    throw new Error(`Error getting top 3 products: ${error.message}`);
  }
}

export async function leaveReview(params: { productId: string; userId: string | undefined; name: string; email: string; text: string; rating: number; attachmentsUrls: string[] }) {
  try {
    // A public endpoint: everything from the browser is checked before it is stored and shown to other customers.
    if (!mongoose.isValidObjectId(params?.productId)) throw new Error("unknown product");
    const name = String(params.name ?? "").trim().slice(0, 60);
    const text = String(params.text ?? "").trim().slice(0, 2000);
    const rating = Math.min(5, Math.max(1, Math.round(Number(params.rating)) || 5));
    const attachmentsUrls = (Array.isArray(params.attachmentsUrls) ? params.attachmentsUrls : [])
      .filter((url): url is string => typeof url === "string" && /^https:\/\/[^\s"'<>]+$/.test(url))
      .slice(0, 5);
    if (!name || !text) throw new Error("a review needs a name and a text");

    await connectToDB();

    const formattedDate = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

    const result = await Product.updateOne(
      { _id: params.productId },
      { $push: { reviews: { user: name, rating, text, attachmentsUrls, time: formattedDate } } },
    );
    if (result.matchedCount === 0) throw new Error("unknown product");

    // The reward: one promo code per product, and only for the signed-in customer's own account.
    let promo = "";
    const current = await getSessionUser();
    if (current) {
      const first = await User.updateOne({ _id: current.id, reviewedProducts: { $ne: params.productId } }, { $addToSet: { reviewedProducts: params.productId } });
      if (first.modifiedCount === 1) promo = await addPromo({ userId: current.id, email: current.email });
    }

    await clearCache("updateProduct", params.productId);
    return promo;
  } catch (error: any) {
    throw new Error(`Error adding review to the product: ${error.message}`);
  }
}
