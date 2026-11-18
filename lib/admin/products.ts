import mongoose from "mongoose";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import { escapeRegExp } from "@/lib/catalog/text";
import { DELETED_PRODUCT_ID, isObjectIdLike } from "./catalog-shared";
import { loadCategoryOptions, type CategoryOption } from "./categories";

/**
 * Server-side reads for the product admin. The list is paged, searched and
 * sorted in MongoDB; only one page of rows ever reaches the browser.
 */

const { ObjectId } = mongoose.Types;
type Oid = mongoose.Types.ObjectId;

const DELETED_PRODUCT_OID = new ObjectId(DELETED_PRODUCT_ID);

export const PRODUCT_TABS = [
  { key: "all", label: "Усі" },
  { key: "available", label: "В наявності" },
  { key: "unavailable", label: "Немає в наявності" },
  // Still on sale, but the stock is at zero: the last one was bought (or the quantity was set to 0). Shown only when there are any.
  { key: "soldout", label: "Закінчилися" },
  { key: "uncategorized", label: "Без категорії" },
] as const;
export type ProductTabKey = (typeof PRODUCT_TABS)[number]["key"];

export const PRODUCT_SORTS = [
  { key: "updated", label: "Нещодавно змінені" },
  { key: "new", label: "Нові спершу" },
  { key: "name", label: "За назвою" },
  { key: "price-asc", label: "Дешевші спершу" },
  { key: "price-desc", label: "Дорожчі спершу" },
  { key: "stock", label: "Менше на складі" },
] as const;
export type ProductSortKey = (typeof PRODUCT_SORTS)[number]["key"];

const SORT_SPEC: Record<ProductSortKey, Record<string, 1 | -1>> = {
  updated: { updatedAt: -1, _id: -1 },
  new: { createdAt: -1, _id: -1 },
  name: { name: 1, _id: 1 },
  "price-asc": { priceToShow: 1, _id: 1 },
  "price-desc": { priceToShow: -1, _id: -1 },
  stock: { quantity: 1, _id: 1 },
};

export const PRODUCTS_PAGE_SIZE = 50;

/** Everything that narrows the list, as it appears in the URL. Bulk actions on "all matching" reuse it. */
export type ProductListFilter = { tab: ProductTabKey; query: string; category: string };

export function parseProductListFilter(params: Record<string, string | string[] | undefined>): ProductListFilter {
  const pick = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };
  const tab = PRODUCT_TABS.some((entry) => entry.key === pick("tab")) ? (pick("tab") as ProductTabKey) : "all";
  const category = isObjectIdLike(pick("category")) ? pick("category").toLowerCase() : "";
  return { tab, query: pick("q").trim().slice(0, 100), category };
}

const PURCHASABLE_QUERY = { isAvailable: true, quantity: { $gt: 0 } };
/** On sale with nothing left: orders take the stock down and leave "isAvailable" as it was. */
const SOLD_OUT_QUERY = { isAvailable: true, quantity: { $not: { $gt: 0 } } };

function searchQuery(query: string): Record<string, unknown> {
  if (!query) return {};
  const pattern = new RegExp(escapeRegExp(query), "i");
  const or: Record<string, unknown>[] = [{ name: pattern }, { articleNumber: pattern }, { vendor: pattern }, { id: query }];
  if (isObjectIdLike(query)) or.push({ _id: new ObjectId(query.toLowerCase()) });
  return { $or: or };
}

/** Mongo filter for the list without the tab, and the tab conditions on their own. */
export function buildProductQuery(filter: ProductListFilter, validCategoryIds: Oid[]) {
  const base: Record<string, unknown> = { _id: { $ne: DELETED_PRODUCT_OID }, ...searchQuery(filter.query) };
  if (filter.category) base.category = new ObjectId(filter.category);

  const tabs: Record<ProductTabKey, Record<string, unknown>> = {
    all: {},
    available: PURCHASABLE_QUERY,
    unavailable: { $nor: [PURCHASABLE_QUERY] },
    soldout: SOLD_OUT_QUERY,
    uncategorized: { category: { $nin: validCategoryIds } },
  };

  const withTab = (tab: ProductTabKey) => {
    const extra = tabs[tab];
    if (!Object.keys(extra).length) return base;
    // A category filter and the "uncategorized" tab both constrain `category`: combine with $and.
    return { $and: [base, extra] };
  };

  return { base, withTab };
}

export type ProductRow = {
  _id: string;
  id: string;
  name: string;
  articleNumber: string;
  vendor: string;
  image: string | null;
  price: number;
  priceToShow: number;
  quantity: number;
  purchasable: boolean;
  isAvailable: boolean;
  categories: { id: string; name: string }[];
  /** Category ids on the product that point at categories that no longer exist. */
  danglingCategories: number;
  updatedAt: string | null;
};

export type ProductList = {
  rows: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: Record<ProductTabKey, number>;
  stats: { total: number; available: number; discounted: number; uncategorized: number };
  categories: CategoryOption[];
};

type RawProduct = {
  _id: Oid;
  id?: string;
  name?: string;
  articleNumber?: string;
  vendor?: string;
  images?: string[];
  price?: number;
  priceToShow?: number;
  quantity?: number;
  isAvailable?: boolean;
  category?: unknown[];
  updatedAt?: Date;
};

type GlobalRow = { total: number; available: number; discounted: number };

const GLOBAL_STATS = [
  { $match: { _id: { $ne: DELETED_PRODUCT_OID } } },
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      available: { $sum: { $cond: [{ $and: [{ $eq: ["$isAvailable", true] }, { $gt: [{ $ifNull: ["$quantity", 0] }, 0] }] }, 1, 0] } },
      discounted: { $sum: { $cond: [{ $lt: [{ $ifNull: ["$priceToShow", 0] }, { $ifNull: ["$price", 0] }] }, 1, 0] } },
    },
  },
];

export const PRODUCT_PAGE_SIZES = [25, 50, 100] as const;

export function parsePageSize(value: unknown, fallback = PRODUCTS_PAGE_SIZE): number {
  const size = Number(Array.isArray(value) ? value[0] : value);
  return (PRODUCT_PAGE_SIZES as readonly number[]).includes(size) ? size : fallback;
}

export async function listProducts({
  filter,
  sort,
  page,
  pageSize = PRODUCTS_PAGE_SIZE,
}: {
  filter: ProductListFilter;
  sort: ProductSortKey;
  page: number;
  pageSize?: number;
}): Promise<ProductList> {
  await connectToDB();
  const categories = await loadCategoryOptions();
  const validIds = categories.map((category) => new ObjectId(category.id));
  const { base, withTab } = buildProductQuery(filter, validIds);
  const listQuery = withTab(filter.tab);

  // Catalog-wide stat tiles and the tab counts for the current search: small counts, run together.
  // (A single $facet aggregation was tried first: it buffers every document and took ~130 ms.)
  const narrowed = Boolean(filter.query || filter.category);
  const [globalRows, uncategorizedAll, soldOutCount, filteredCounts] = await Promise.all([
    Product.aggregate<GlobalRow>(GLOBAL_STATS),
    Product.countDocuments({ _id: { $ne: DELETED_PRODUCT_OID }, category: { $nin: validIds } }),
    Product.countDocuments(withTab("soldout")),
    narrowed
      ? Promise.all([Product.countDocuments(base), Product.countDocuments(withTab("available")), Product.countDocuments(withTab("uncategorized"))])
      : null,
  ]);
  const global = globalRows[0] ?? { total: 0, available: 0, discounted: 0 };
  const [allCount, availableCount, uncategorizedCount] = filteredCounts ?? [global.total, global.available, uncategorizedAll];

  const counts: Record<ProductTabKey, number> = {
    all: allCount,
    available: availableCount,
    unavailable: allCount - availableCount,
    soldout: soldOutCount,
    uncategorized: uncategorizedCount,
  };
  const total = counts[filter.tab];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);

  const raw = await Product.find(listQuery, {
    id: 1,
    name: 1,
    articleNumber: 1,
    vendor: 1,
    images: { $slice: 1 },
    price: 1,
    priceToShow: 1,
    quantity: 1,
    isAvailable: 1,
    category: 1,
    updatedAt: 1,
  })
    .sort(SORT_SPEC[sort])
    .skip((current - 1) * pageSize)
    .limit(pageSize)
    .lean<RawProduct[]>();

  const names = new Map(categories.map((category) => [category.id, category.name]));

  const rows: ProductRow[] = raw.map((product) => {
    const ids = Array.from(new Set((product.category ?? []).map((value) => String(value))));
    const known = ids.filter((id) => names.has(id));
    return {
      _id: String(product._id),
      id: product.id ?? "",
      name: product.name ?? "",
      articleNumber: product.articleNumber ?? "",
      vendor: product.vendor ?? "",
      image: product.images?.[0] ?? null,
      price: Number(product.price ?? 0),
      priceToShow: Number(product.priceToShow ?? product.price ?? 0),
      quantity: Number(product.quantity ?? 0),
      isAvailable: product.isAvailable === true,
      purchasable: product.isAvailable === true && Number(product.quantity ?? 0) > 0,
      categories: known.map((id) => ({ id, name: names.get(id)! })),
      danglingCategories: ids.length - known.length,
      updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : null,
    };
  });

  return {
    rows,
    total,
    page: current,
    pageSize,
    pageCount,
    counts,
    stats: { total: global.total, available: global.available, discounted: global.discounted, uncategorized: uncategorizedAll },
    categories,
  };
}

/** _ids of every product matching a list filter (for "apply to all N matching"). Capped for safety. */
export async function resolveProductIds(filter: ProductListFilter, limit = 20000): Promise<Oid[]> {
  await connectToDB();
  const validIds = (await loadCategoryOptions()).map((category) => new ObjectId(category.id));
  const { withTab } = buildProductQuery(filter, validIds);
  const rows = await Product.find(withTab(filter.tab)).select("_id").limit(limit).lean<{ _id: Oid }[]>();
  return rows.map((row) => row._id);
}

/* -------------------------------------------------------------------------- */
/*                                 Edit form                                  */
/* -------------------------------------------------------------------------- */

export type ProductFormValues = {
  _id: string;
  id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  priceToShow: number;
  quantity: number;
  isAvailable: boolean;
  articleNumber: string;
  vendor: string;
  url: string;
  /** Existing categories only. */
  category: string[];
  /** How many category references on the product point at deleted categories (dropped on save). */
  danglingCategories: number;
  params: { name: string; value: string }[];
  isFetched: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getProductForEdit(productId: string, categories: CategoryOption[]): Promise<ProductFormValues | null> {
  if (!isObjectIdLike(productId) || productId === DELETED_PRODUCT_ID) return null;
  await connectToDB();
  const product = await Product.findById(productId)
    .select("_id id name description images price priceToShow quantity isAvailable articleNumber vendor url category params isFetched createdAt updatedAt")
    .lean<
      RawProduct & {
        description?: string;
        url?: string;
        params?: { name?: string; value?: string }[];
        isFetched?: boolean;
        createdAt?: Date;
      }
    >();
  if (!product) return null;

  const known = new Set(categories.map((category) => category.id));
  const ids = Array.from(new Set((product.category ?? []).map((value) => String(value))));

  return {
    _id: String(product._id),
    id: product.id ?? "",
    name: product.name ?? "",
    description: product.description ?? "",
    images: (product.images ?? []).filter(Boolean),
    price: Number(product.price ?? 0),
    priceToShow: Number(product.priceToShow ?? product.price ?? 0),
    quantity: Number(product.quantity ?? 0),
    isAvailable: product.isAvailable === true,
    articleNumber: product.articleNumber ?? "",
    // "Не вказано" is what the save writes for an empty supplier: show it as empty.
    vendor: product.vendor && product.vendor !== "Не вказано" ? product.vendor : "",
    url: product.url ?? "",
    category: ids.filter((id) => known.has(id)),
    danglingCategories: ids.filter((id) => !known.has(id)).length,
    params: (product.params ?? []).filter((param) => param?.name).map((param) => ({ name: param.name ?? "", value: param.value ?? "" })),
    isFetched: product.isFetched === true,
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : null,
    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : null,
  };
}

/** The most common characteristic names in the catalog, suggested in the product form. */
export async function loadCommonParamNames(limit = 40): Promise<string[]> {
  return (await loadParamSuggestions(limit)).map((item) => item.name);
}

export type ParamSuggestion = { name: string; values: string[] };

/**
 * The most used characteristic names with their most used values, for the
 * suggestions in the product form. One aggregation over the params.
 */
export async function loadParamSuggestions(limit = 40, valuesPerName = 30): Promise<ParamSuggestion[]> {
  await connectToDB();
  const rows = await Product.aggregate<{ _id: string; values: string[] }>([
    { $match: { "params.0": { $exists: true }, _id: { $ne: DELETED_PRODUCT_OID } } },
    { $project: { _id: 0, params: 1 } },
    { $unwind: "$params" },
    { $match: { "params.name": { $type: "string", $ne: "" }, "params.value": { $type: "string", $ne: "" } } },
    { $group: { _id: { name: "$params.name", value: "$params.value" }, count: { $sum: 1 } } },
    { $sort: { count: -1, "_id.value": 1 } },
    { $group: { _id: "$_id.name", total: { $sum: "$count" }, values: { $push: "$_id.value" } } },
    { $sort: { total: -1, _id: 1 } },
    { $limit: limit },
    { $project: { values: { $slice: ["$values", valuesPerName] } } },
  ]);
  // "Колір" and "колір " are one name, "Чорний" and "чорний" one value: keep the most used spelling.
  const key = (text: string) => text.replace(/\s+/g, " ").trim().toLocaleLowerCase("uk-UA");
  const merged = new Map<string, { name: string; values: Map<string, string> }>();
  for (const row of rows) {
    if (typeof row._id !== "string" || !row._id.trim()) continue;
    const entry = merged.get(key(row._id)) ?? { name: row._id.replace(/\s+/g, " ").trim(), values: new Map<string, string>() };
    for (const value of row.values) {
      const text = String(value).replace(/\s+/g, " ").trim();
      if (text && !entry.values.has(key(text)) && entry.values.size < valuesPerName) entry.values.set(key(text), text);
    }
    merged.set(key(row._id), entry);
  }
  return Array.from(merged.values()).map((entry) => ({ name: entry.name, values: Array.from(entry.values.values()) }));
}

export type ProductVariantRow = {
  productId: string;
  /** Colour (or other edition) of the SKU, when the model comes in several. */
  color: string | null;
  /** Size (or other option) of the SKU. */
  option: string | null;
  articleNumber: string;
  image: string | null;
  price: number;
  priceToShow: number;
  quantity: number;
  purchasable: boolean;
  current: boolean;
};

export type ProductVariantsView = {
  /** Shared title of the model, without size and article. */
  title: string;
  /** Column heading for `option` ("Розмір" or "Варіант"). */
  optionLabel: string;
  rows: ProductVariantRow[];
  /** All SKUs of the model, also those cut from `rows`. */
  total: number;
  purchasable: number;
};

const MAX_VARIANT_ROWS = 60;

/**
 * Every SKU of the same model (all sizes of all colours), read from the
 * storefront catalog's variant index, with stock and prices fresh from the
 * database (one query). Null when the product has no variants. Gives up after
 * `timeoutMs`, so a cold catalog never holds the page.
 */
export async function loadProductVariants(productId: string, timeoutMs = 2500): Promise<ProductVariantsView | null> {
  try {
    const [{ getCatalogRuntime }, { getProductVariants }] = await Promise.all([import("@/lib/catalog/server/service"), import("@/lib/catalog/variants")]);
    const runtime = await Promise.race([getCatalogRuntime(), new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))]);
    if (!runtime) return null;
    const index = runtime.variants;
    const group = index.groupByProductId.get(productId);
    if (!group) return null;

    // Colour label of each sibling group, as the shop shows it.
    const view = getProductVariants(index, productId);
    const colorOf = new Map<string, string>();
    for (const sibling of view?.siblings ?? []) {
      const owner = index.groupByProductId.get(sibling.productId);
      if (owner) colorOf.set(owner.key, sibling.label);
    }

    const siblings = group.modelKey ? index.groupsByModel.get(group.modelKey) ?? [group] : [group];
    const ordered = [group, ...siblings.filter((other) => other.key !== group.key).sort((a, b) => (colorOf.get(a.key) ?? "").localeCompare(colorOf.get(b.key) ?? "", "uk"))];
    const optionAxis = group.axes.find((axis) => axis.key !== "color");
    const several = ordered.length > 1;

    const members = ordered.flatMap((owner) =>
      owner.members
        .filter((member) => !member.duplicateOf)
        .map((member) => ({
          id: member.id,
          color: several ? colorOf.get(owner.key) ?? owner.color?.label ?? null : member.values.color?.label ?? null,
          option: member.values.size?.label ?? member.values.variant?.label ?? null,
          articleNumber: member.articleNumber,
        })),
    );
    if (members.length <= 1) return null;

    const shown = members.slice(0, MAX_VARIANT_ROWS);
    if (!shown.some((member) => member.id === productId)) {
      const own = members.find((member) => member.id === productId);
      if (own) shown[shown.length - 1] = own;
    }

    await connectToDB();
    const ids = shown.filter((member) => isObjectIdLike(member.id)).map((member) => new ObjectId(member.id));
    const [docs, purchasable] = await Promise.all([
      Product.find({ _id: { $in: ids } }, { images: { $slice: 1 }, price: 1, priceToShow: 1, quantity: 1, isAvailable: 1, articleNumber: 1 }).lean<RawProduct[]>(),
      Product.countDocuments({ _id: { $in: members.filter((member) => isObjectIdLike(member.id)).map((member) => new ObjectId(member.id)) }, ...PURCHASABLE_QUERY }),
    ]);
    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

    const rows: ProductVariantRow[] = shown.flatMap((member) => {
      const doc = byId.get(member.id);
      if (!doc) return [];
      const quantity = Number(doc.quantity ?? 0);
      return [
        {
          productId: member.id,
          color: member.color,
          option: member.option,
          articleNumber: doc.articleNumber ?? member.articleNumber ?? "",
          image: doc.images?.[0] ?? null,
          price: Number(doc.price ?? 0),
          priceToShow: Number(doc.priceToShow ?? doc.price ?? 0),
          quantity,
          purchasable: doc.isAvailable === true && quantity > 0,
          current: member.id === productId,
        },
      ];
    });

    return { title: group.title, optionLabel: optionAxis?.label ?? "Розмір", rows, total: members.length, purchasable };
  } catch {
    return null;
  }
}
