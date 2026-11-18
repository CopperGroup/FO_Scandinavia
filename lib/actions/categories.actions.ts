"use server";

import mongoose from "mongoose";
import Category from "../models/category.model";
import Product from "../models/product.model";
import Filter from "../models/filter.model";
import { connectToDB } from "../mongoose";
import { CategoryType, FetchedCategory } from "../types/types";
import clearCache from "./cache";
import { deleteManyProducts } from "./product.actions";
import { requireCatalogAdmin } from "@/lib/admin/catalog-auth";
import { escapeRegExp } from "@/lib/catalog/text";
import { pageText } from "@/lib/menu";
import { findCategoryByName, loadCategoryOptions, syncCategoryMembership, toObjectIds } from "@/lib/admin/categories";
import {
  DELETED_CATEGORY_ID,
  DELETED_PRODUCT_ID,
  categoryNameProblem,
  childrenFromParents,
  isObjectIdLike,
  normalizeCategoryName,
  productsWord,
} from "@/lib/admin/catalog-shared";

type Oid = mongoose.Types.ObjectId;
const { ObjectId } = mongoose.Types;

const NOT_PLACEHOLDER = { _id: { $ne: new ObjectId(DELETED_CATEGORY_ID) } };

/** One cache call per user action, after the writes (clearCache also invalidates the catalog snapshot). */
async function afterCategoryWrite(kind: "createCategory" | "updateCategory" | "deleteCategory") {
  await clearCache(kind);
}

function plain<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireId(value: unknown, message = "Категорію не знайдено."): Oid {
  if (!isObjectIdLike(value) || value.toLowerCase() === DELETED_CATEGORY_ID) throw new Error(message);
  return new ObjectId(value.toLowerCase());
}

/**
 * Finds a category by name (any letter case) or creates it. Never creates a
 * category whose name is empty or looks like an id.
 */
async function findOrCreateCategory(rawName: unknown): Promise<{ id: Oid; name: string; created: boolean }> {
  const name = normalizeCategoryName(rawName);
  const problem = categoryNameProblem(name);
  if (problem) throw new Error(problem);

  const found = await findCategoryByName(name);
  if (found) return { id: new ObjectId(found.id), name: found.name, created: false };

  const created = await Category.create({ name, products: [], totalValue: 0, subCategories: [] });
  return { id: created._id, name, created: true };
}

/* -------------------------------------------------------------------------- */
/*                          XML importer (categories)                         */
/* -------------------------------------------------------------------------- */

export async function findCategoryByExternalId(externalId: string) {
  await requireCatalogAdmin();
  await connectToDB();
  const category = await Category.findOne({ id: externalId }).select("_id id name subCategories").lean();
  return JSON.stringify(category);
}

export async function persistCategory(category: FetchedCategory, parentDbId?: mongoose.Types.ObjectId) {
  await requireCatalogAdmin();
  await connectToDB();

  const name = normalizeCategoryName(category.name) || String(category.id ?? "");
  const doc = new Category({ name, id: category.id, subCategories: [], products: [], totalValue: 0 });
  await doc.save();

  if (parentDbId) {
    await Category.updateOne({ _id: parentDbId }, { $addToSet: { subCategories: doc._id } });
  }

  return JSON.stringify(doc);
}

export async function createUrlCategories({ categories }: { categories: FetchedCategory[] }): Promise<CategoryType[]>;
export async function createUrlCategories({ categories }: { categories: FetchedCategory[] }, type: "json"): Promise<string>;

/** Creates the feed's categories that do not exist yet (matched by external id), parents first. */
export async function createUrlCategories({ categories }: { categories: FetchedCategory[] }, type?: "json") {
  try {
    await requireCatalogAdmin();
    await connectToDB();

    const sorted = [...categories].sort((a, b) => Number(Boolean(a.parentCategoryId)) - Number(Boolean(b.parentCategoryId)));
    const existing = await Category.find({ id: { $in: sorted.map((category) => category.id) } }).select("_id id").lean<{ _id: Oid; id: string }[]>();
    const byExternalId = new Map<string, Oid>(existing.map((category) => [category.id, category._id]));

    for (const category of sorted) {
      if (byExternalId.has(category.id)) continue;
      const doc = await Category.create({
        name: normalizeCategoryName(category.name) || category.id,
        id: category.id,
        subCategories: [],
        products: [],
        totalValue: 0,
      });
      byExternalId.set(category.id, doc._id);
      const parentId = category.parentCategoryId ? byExternalId.get(category.parentCategoryId) : undefined;
      if (parentId) await Category.updateOne({ _id: parentId }, { $addToSet: { subCategories: doc._id } });
    }

    const updated = await Category.find(NOT_PLACEHOLDER).select("_id id name subCategories totalValue").lean();
    return type === "json" ? JSON.stringify(updated) : plain<CategoryType[]>(updated);
  } catch (error: any) {
    throw new Error(`Erorr creating and ${error.message}`);
  }
}

export async function fetchAllCategories(): Promise<CategoryType[]>;
export async function fetchAllCategories(type: "json"): Promise<string>;

/** Every category without the product lists (the importer uses _id, id, name). */
export async function fetchAllCategories(type?: "json") {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const all = await Category.find(NOT_PLACEHOLDER).select("_id id name subCategories totalValue").lean();
    return type === "json" ? JSON.stringify(all) : plain<CategoryType[]>(all);
  } catch (error: any) {
    throw new Error(`Error fetching all catgeories: ${error.message}`);
  }
}

/** Id and name of every category, sorted by name. */
export async function getCategoriesNamesAndIds(): Promise<{ name: string; categoryId: string }[]> {
  await requireCatalogAdmin();
  const options = await loadCategoryOptions();
  return options.map((option) => ({ name: option.name, categoryId: option.id }));
}

/** Rebuilds Category.products / totalValue for every category from Product.category. Call once after an import. */
export async function syncAllCategoryMembership(): Promise<{ categories: number }> {
  await requireCatalogAdmin();
  const result = await syncCategoryMembership();
  await afterCategoryWrite("updateCategory");
  return result;
}

/* -------------------------------------------------------------------------- */
/*                               Admin actions                                */
/* -------------------------------------------------------------------------- */

export type CategoryActionResult = { ok: true; message: string; id?: string } | { ok: false; error: string };

function failure(error: unknown): CategoryActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Не вдалося виконати дію. Спробуйте ще раз." };
}

/** Creates a category, or reports that one with this name exists. Optionally nests it under a parent. */
export async function createNewCategory({
  name,
  products,
  previousCategoryId,
  parentId,
}: {
  name: string;
  products?: { _id: string }[];
  previousCategoryId?: string;
  parentId?: string;
}): Promise<{ _id: string; name: string; created: boolean }> {
  await requireCatalogAdmin();
  await connectToDB();

  const category = await findOrCreateCategory(name);
  const productIds = toObjectIds((products ?? []).map((product) => product._id));
  const touched: unknown[] = [category.id];

  if (productIds.length) {
    await Product.updateMany({ _id: { $in: productIds } }, { $addToSet: { category: category.id } });
    if (isObjectIdLike(previousCategoryId)) {
      await Product.updateMany({ _id: { $in: productIds } }, { $pull: { category: new ObjectId(previousCategoryId) } });
      touched.push(previousCategoryId);
    }
  }

  if (isObjectIdLike(parentId) && parentId !== String(category.id)) {
    await Category.updateMany({ subCategories: category.id }, { $pull: { subCategories: category.id } });
    await Category.updateOne({ _id: parentId }, { $addToSet: { subCategories: category.id } });
  }

  await syncCategoryMembership(touched);
  await afterCategoryWrite("createCategory");
  return { _id: String(category.id), name: category.name, created: category.created };
}

/** Form action for "Нова категорія". */
export async function createCategoryAction(input: { name: string; parentId?: string }): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    const existing = await findCategoryByName(normalizeCategoryName(input.name));
    if (existing) return { ok: false, error: `Категорія «${existing.name}» уже існує.` };
    const created = await createNewCategory({ name: input.name, parentId: input.parentId });
    return { ok: true, message: `Категорію «${created.name}» створено.`, id: created._id };
  } catch (error) {
    return failure(error);
  }
}

export async function changeCategoryName({ categoryId, newName }: { categoryId: string; newName: string }): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const id = requireId(categoryId);
    const name = normalizeCategoryName(newName);
    const problem = categoryNameProblem(name);
    if (problem) return { ok: false, error: problem };

    const clash = await findCategoryByName(name, String(id));
    if (clash) return { ok: false, error: `Категорія «${clash.name}» уже існує. Оберіть іншу назву.` };

    const result = await Category.updateOne({ _id: id }, { $set: { name } });
    if (result.matchedCount === 0) return { ok: false, error: "Категорію не знайдено." };

    await afterCategoryWrite("updateCategory");
    return { ok: true, message: "Назву змінено." };
  } catch (error) {
    return failure(error);
  }
}

/** Saves the text shown under the products on the category's page in the shop (empty removes it). */
export async function changeCategoryText({ categoryId, text }: { categoryId: string; text: string }): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const id = requireId(categoryId);
    const clean = pageText(text);

    const result = await Category.updateOne({ _id: id }, clean ? { $set: { text: clean } } : { $unset: { text: 1 } });
    if (result.matchedCount === 0) return { ok: false, error: "Категорію не знайдено." };

    await afterCategoryWrite("updateCategory");
    return { ok: true, message: clean ? "Текст збережено." : "Текст прибрано." };
  } catch (error) {
    return failure(error);
  }
}

/** Sets the sale price of every product in the category to `price - percentage%` (0 removes the discount). */
export async function setCategoryDiscount({ categoryId, percentage }: { categoryId: string; percentage: number }): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const id = requireId(categoryId);
    const percent = Number(percentage);
    if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return { ok: false, error: "Вкажіть знижку від 0 до 99%." };

    const factor = 1 - percent / 100;
    const result = await Product.updateMany({ category: id }, [
      { $set: { priceToShow: { $max: [0, { $round: [{ $multiply: [{ $ifNull: ["$price", 0] }, factor] }, 0] }] } } },
    ]);

    await syncCategoryMembership(await Product.distinct("category", { category: id }));
    await afterCategoryWrite("updateCategory");
    return {
      ok: true,
      message: percent === 0 ? `Знижку прибрано для ${result.matchedCount} товарів.` : `Знижку ${percent}% застосовано до ${result.matchedCount} товарів.`,
    };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Moves products of one category to another (existing or new by name). With
 * productIds only those products move; without, every product of the source
 * category does. keepInSource=true copies instead of moving.
 */
export async function moveProductsToCategory({
  initialCategoryId,
  targetCategoryId,
  newCategoryName,
  productIds,
  keepInSource = false,
}: {
  initialCategoryId: string;
  targetCategoryId?: string;
  newCategoryName?: string;
  productIds?: string[];
  keepInSource?: boolean;
}): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const source = requireId(initialCategoryId);

    let target: Oid;
    let targetName: string;
    if (isObjectIdLike(targetCategoryId)) {
      target = requireId(targetCategoryId);
      const found = await Category.findById(target).select("name").lean<{ name?: string } | null>();
      if (!found) return { ok: false, error: "Цільової категорії вже не існує." };
      targetName = found.name ?? "";
    } else {
      const created = await findOrCreateCategory(newCategoryName);
      target = created.id;
      targetName = created.name;
    }
    if (target.equals(source)) return { ok: false, error: "Оберіть іншу категорію: товари вже в цій." };

    const scope: Record<string, unknown> = { category: source };
    if (productIds?.length) scope._id = { $in: toObjectIds(productIds) };

    const added = await Product.updateMany(scope, { $addToSet: { category: target } });
    if (!keepInSource) {
      const ids = productIds?.length ? toObjectIds(productIds) : null;
      await Product.updateMany(ids ? { _id: { $in: ids } } : { category: source }, { $pull: { category: source } });
    }

    await syncCategoryMembership([source, target]);
    await afterCategoryWrite("updateCategory");
    return {
      ok: true,
      id: String(target),
      message: `${keepInSource ? "Додано" : "Перенесено"} ${added.matchedCount} ${productsWord(added.matchedCount)} до «${targetName}».`,
    };
  } catch (error) {
    return failure(error);
  }
}

export type ProductMoveResult =
  | { ok: true; message: string; moved: string[]; addedToTarget: string[] }
  | { ok: false; error: string };

/**
 * Puts the chosen products into `targetId` and, with a `sourceId`, takes them
 * out of that category (a move); without one it only adds (giving products
 * without a category their first one). Reports which products gained the
 * target, so undoProductMove can put everything back exactly.
 */
export async function moveSelectedProducts({
  sourceId,
  targetId,
  productIds,
}: {
  sourceId: string | null;
  targetId: string;
  productIds: string[];
}): Promise<ProductMoveResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const target = requireId(targetId, "Цільової категорії вже не існує.");
    const source = sourceId ? requireId(sourceId) : null;
    if (source && source.equals(target)) return { ok: false, error: "Оберіть іншу категорію: товари вже в цій." };
    const ids = toObjectIds(productIds);
    if (!ids.length) return { ok: false, error: "Не вибрано жодного товару." };
    const found = await Category.findById(target).select("name").lean<{ name?: string } | null>();
    if (!found) return { ok: false, error: "Цільової категорії вже не існує." };

    const scope = { _id: { $in: ids }, ...(source ? { category: source } : {}) };
    const [inScope, gaining] = await Promise.all([
      Product.find(scope).select("_id").lean<{ _id: Oid }[]>(),
      Product.find({ ...scope, category: source ? { $eq: source, $ne: target } : { $ne: target } }).select("_id").lean<{ _id: Oid }[]>(),
    ]);
    const moved = inScope.map((row) => row._id);
    if (!moved.length) return { ok: false, error: "Цих товарів уже немає в категорії. Оновіть сторінку." };

    await Product.updateMany({ _id: { $in: moved } }, { $addToSet: { category: target } });
    if (source) await Product.updateMany({ _id: { $in: moved } }, { $pull: { category: source } });

    await syncCategoryMembership(source ? [source, target] : [target]);
    await afterCategoryWrite("updateCategory");
    const count = `${moved.length} ${productsWord(moved.length)}`;
    return {
      ok: true,
      moved: moved.map(String),
      addedToTarget: gaining.map((row) => String(row._id)),
      message: source ? `Перенесено ${count} до «${found.name ?? ""}».` : `${count} тепер у «${found.name ?? ""}».`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Не вдалося перенести товари. Спробуйте ще раз." };
  }
}

/** Reverses moveSelectedProducts: back into the source, out of the target where the move put them. */
export async function undoProductMove({
  sourceId,
  targetId,
  moved,
  addedToTarget,
}: {
  sourceId: string | null;
  targetId: string;
  moved: string[];
  addedToTarget: string[];
}): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const target = requireId(targetId);
    const source = sourceId ? requireId(sourceId) : null;
    const back = toObjectIds(moved);
    const out = toObjectIds(addedToTarget);
    if (source && back.length) await Product.updateMany({ _id: { $in: back } }, { $addToSet: { category: source } });
    if (out.length) await Product.updateMany({ _id: { $in: out } }, { $pull: { category: target } });
    await syncCategoryMembership(source ? [source, target] : [target]);
    await afterCategoryWrite("updateCategory");
    return { ok: true, message: "Скасовано: товари там, де були." };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Deletes a category and every reference to it: Product.category, parents'
 * subCategories (its children move up to its parent) and the filter.
 * removeProducts deletes its products as well; moveToCategoryId (or
 * moveToNewName) first adds its products to another category.
 */
export async function deleteCategory(props: {
  categoryId: string;
  removeProducts: boolean;
  moveToCategoryId?: string;
  moveToNewName?: string;
}): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const id = requireId(props.categoryId);

    const category = await Category.findById(id).select("_id name subCategories").lean<{ _id: Oid; name?: string; subCategories?: Oid[] } | null>();
    if (!category) return { ok: false, error: "Категорію не знайдено." };

    const touched: unknown[] = [];
    let deletedProducts = 0;

    if (props.removeProducts) {
      const ids = (await Product.find({ category: id }).select("_id").lean<{ _id: Oid }[]>()).map((row) => String(row._id));
      if (ids.length) deletedProducts = await deleteManyProducts(ids, "keep-catalog-cache");
    } else if (isObjectIdLike(props.moveToCategoryId) || normalizeCategoryName(props.moveToNewName)) {
      const target = isObjectIdLike(props.moveToCategoryId) ? requireId(props.moveToCategoryId) : (await findOrCreateCategory(props.moveToNewName)).id;
      if (target.equals(id)) return { ok: false, error: "Оберіть іншу категорію для товарів." };
      await Product.updateMany({ category: id }, { $addToSet: { category: target } });
      touched.push(target);
    }

    // No product may keep pointing at the deleted category.
    await Product.updateMany({ category: id }, { $pull: { category: id } });

    // Its children move up to its parent (or become top-level).
    const parent = await Category.findOne({ subCategories: id }).select("_id").lean<{ _id: Oid } | null>();
    await Category.updateMany({ subCategories: id }, { $pull: { subCategories: id } });
    const children = toObjectIds(category.subCategories ?? []).filter((child) => !child.equals(id));
    if (parent && children.length) {
      await Category.updateOne({ _id: parent._id }, { $addToSet: { subCategories: { $each: children } } });
    }

    await Filter.updateMany({}, { $pull: { categories: { categoryId: id } } });
    await Category.deleteOne({ _id: id });

    if (touched.length) await syncCategoryMembership(touched);
    await afterCategoryWrite("deleteCategory");

    const label = isObjectIdLike(category.name ?? "") ? "Пошкоджену категорію" : `Категорію «${category.name}»`;
    return {
      ok: true,
      message: props.removeProducts
        ? `${label} і ${deletedProducts} її товарів видалено.`
        : touched.length
          ? `${label} видалено, товари перенесено.`
          : `${label} видалено.`,
    };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Saves the whole tree at once from a child → parent map. Validates that every
 * parent exists and there are no cycles, then writes every changed
 * subCategories list in one bulkWrite.
 */
export async function saveCategoryStructure(parentById: Record<string, string | null>): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();

    const categories = await Category.find(NOT_PLACEHOLDER).select("_id subCategories").lean<{ _id: Oid; subCategories?: Oid[] }[]>();
    const ids = categories.map((category) => String(category._id));
    const known = new Set(ids);

    const parentOf = new Map<string, string | null>();
    for (const id of ids) {
      const parent = parentById[id];
      parentOf.set(id, parent && known.has(parent) ? parent : null);
    }

    const children = childrenFromParents(ids, parentOf);
    const operations = categories
      .map((category) => {
        const id = String(category._id);
        const wanted = new Set(children.get(id) ?? []);
        const current = (category.subCategories ?? []).map(String);
        // Keep the existing order of children that stay; new ones go to the end.
        const next = [...current.filter((child) => wanted.has(child)), ...Array.from(wanted).filter((child) => !current.includes(child))];
        const unique = Array.from(new Set(next));
        const same = current.length === unique.length && current.every((child, index) => child === unique[index]);
        return same ? null : { updateOne: { filter: { _id: category._id }, update: { $set: { subCategories: unique.map((child) => new ObjectId(child)) } } } };
      })
      .filter((operation): operation is NonNullable<typeof operation> => operation !== null);

    if (operations.length) await Category.bulkWrite(operations, { ordered: false });
    await afterCategoryWrite("updateCategory");
    return { ok: true, message: operations.length ? `Структуру збережено (змінено ${operations.length}).` : "Змін немає." };
  } catch (error) {
    return failure(error);
  }
}

/** Moves a category under another one (or to the top level). Refuses a move into itself or its own subcategory. */
export async function setCategoryParent(categoryId: string, parentId: string | null): Promise<CategoryActionResult> {
  const result = await moveCategory(categoryId, parentId);
  return result.ok ? { ok: true, message: result.message } : result;
}

export type MoveCategoryResult =
  | { ok: true; message: string; changed: boolean; previous: { parentId: string | null; index: number } }
  | { ok: false; error: string };

/**
 * Puts a category under another one at `index` among its children (the end
 * when left out), or at the top level (`parentId` null). Refuses a move into
 * itself or its own subcategory. Returns where it was before, so the admin
 * can undo the move with the same call.
 */
export async function moveCategory(categoryId: string, parentId: string | null, index?: number): Promise<MoveCategoryResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const id = requireId(categoryId);
    const parent = parentId ? requireId(parentId, "Батьківську категорію не знайдено.") : null;
    if (parent && parent.equals(id)) return { ok: false, error: "Категорія не може бути вкладена сама в себе." };

    const categories = await Category.find(NOT_PLACEHOLDER).select("_id name subCategories").lean<{ _id: Oid; name?: string; subCategories?: Oid[] }[]>();
    const self = categories.find((category) => category._id.equals(id));
    if (!self) return { ok: false, error: "Категорію не знайдено." };
    const target = parent ? categories.find((category) => category._id.equals(parent)) : null;
    if (parent && !target) return { ok: false, error: "Батьківську категорію не знайдено." };

    const parentOf = new Map<string, string>();
    for (const category of categories) for (const child of category.subCategories ?? []) if (!parentOf.has(String(child))) parentOf.set(String(child), String(category._id));

    // Walk up from the new parent: meeting the category means it would sit inside its own subtree.
    if (parent) {
      let cursor: string | undefined = String(parent);
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        if (cursor === String(id)) return { ok: false, error: "Не можна перемістити категорію у її власну підкатегорію." };
        seen.add(cursor);
        cursor = parentOf.get(cursor);
      }
    }

    const previousParentId = parentOf.get(String(id)) ?? null;
    const previousParent = previousParentId ? categories.find((category) => String(category._id) === previousParentId) : null;
    const previousIndex = previousParent ? Math.max(0, (previousParent.subCategories ?? []).findIndex((child) => String(child) === String(id))) : 0;
    const previous = { parentId: previousParentId, index: previousIndex };

    const siblings = (target?.subCategories ?? []).filter((child) => !child.equals(id));
    const position = Number.isInteger(index) ? Math.max(0, Math.min(index as number, siblings.length)) : siblings.length;
    const samePlace =
      previousParentId === (parent ? String(parent) : null) && (!parent || (target?.subCategories ?? []).findIndex((child) => child.equals(id)) === position);
    if (samePlace) return { ok: true, changed: false, message: "Категорія вже тут.", previous };

    await Category.updateMany({ subCategories: id }, { $pull: { subCategories: id } });
    if (parent) await Category.updateOne({ _id: parent }, { $push: { subCategories: { $each: [id], $position: position } } });

    await afterCategoryWrite("updateCategory");
    const name = self.name?.trim() || "Категорію";
    return {
      ok: true,
      changed: true,
      previous,
      message: parent ? `«${name}» тепер у «${target?.name?.trim() ?? ""}».` : `«${name}» тепер на верхньому рівні.`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Не вдалося перемістити категорію. Спробуйте ще раз." };
  }
}

/**
 * Deletes categories that hold no products. A category that has products by
 * now is skipped, not deleted. Subcategories that stay move up to the nearest
 * parent that stays.
 */
export async function deleteEmptyCategories(categoryIds: string[]): Promise<CategoryActionResult & { deleted?: number; skipped?: number }> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const wanted = toObjectIds(categoryIds).filter((id) => String(id) !== DELETED_CATEGORY_ID);
    if (!wanted.length) return { ok: false, error: "Не вибрано жодної категорії." };

    const [categories, used] = await Promise.all([
      Category.find(NOT_PLACEHOLDER).select("_id subCategories").lean<{ _id: Oid; subCategories?: Oid[] }[]>(),
      Product.distinct("category", { _id: { $ne: new ObjectId(DELETED_PRODUCT_ID) }, category: { $in: wanted } }),
    ]);
    const busy = new Set(used.map(String));
    const known = new Set(categories.map((category) => String(category._id)));
    const doomed = new Set(wanted.map(String).filter((id) => known.has(id) && !busy.has(id)));
    if (!doomed.size) return { ok: false, error: "У цих категоріях уже є товари, тому їх не видалено." };

    // Every category that stays keeps its place; children of a deleted one go to the nearest ancestor that stays.
    const parentOf = new Map<string, string>();
    for (const category of categories) for (const child of category.subCategories ?? []) if (!parentOf.has(String(child))) parentOf.set(String(child), String(category._id));
    const keeperAbove = (id: string): string | null => {
      const seen = new Set<string>();
      let cursor = parentOf.get(id);
      while (cursor && doomed.has(cursor) && !seen.has(cursor)) {
        seen.add(cursor);
        cursor = parentOf.get(cursor);
      }
      return cursor && !doomed.has(cursor) ? cursor : null;
    };
    const adopted = new Map<string, string[]>();
    for (const id of Array.from(known)) {
      if (doomed.has(id) || !doomed.has(parentOf.get(id) ?? "")) continue;
      const keeper = keeperAbove(id);
      if (keeper) adopted.set(keeper, [...(adopted.get(keeper) ?? []), id]);
    }

    const operations = categories
      .filter((category) => !doomed.has(String(category._id)))
      .map((category) => {
        const current = (category.subCategories ?? []).map(String);
        const next = Array.from(new Set([...current.filter((child) => !doomed.has(child)), ...(adopted.get(String(category._id)) ?? [])]));
        const same = next.length === current.length && next.every((child, index) => child === current[index]);
        return same ? null : { updateOne: { filter: { _id: category._id }, update: { $set: { subCategories: next.map((child) => new ObjectId(child)) } } } };
      })
      .filter((operation): operation is NonNullable<typeof operation> => operation !== null);

    const ids = Array.from(doomed).map((id) => new ObjectId(id));
    if (operations.length) await Category.bulkWrite(operations, { ordered: false });
    await Filter.updateMany({}, { $pull: { categories: { categoryId: { $in: ids } } } });
    await Category.deleteMany({ _id: { $in: ids } });
    await afterCategoryWrite("deleteCategory");

    const skipped = wanted.length - doomed.size;
    return {
      ok: true,
      deleted: doomed.size,
      skipped,
      message:
        doomed.size === 1 && skipped === 0
          ? "Категорію видалено."
          : `Видалено порожніх категорій: ${doomed.size}.${skipped ? ` Пропущено ${skipped}: у них з’явилися товари.` : ""}`,
    };
  } catch (error) {
    return failure(error);
  }
}

/** Saves the order of a category's subcategories (ids not among its children are ignored). */
export async function reorderSubcategories(parentId: string, orderedIds: string[]): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const id = requireId(parentId);
    const parent = await Category.findById(id).select("subCategories").lean<{ subCategories?: Oid[] } | null>();
    if (!parent) return { ok: false, error: "Категорію не знайдено." };
    const current = (parent.subCategories ?? []).map(String);
    const wanted = orderedIds.filter((child) => current.includes(child));
    const next = [...wanted, ...current.filter((child) => !wanted.includes(child))];
    await Category.updateOne({ _id: id }, { $set: { subCategories: next.map((child) => new ObjectId(child)) } });
    await afterCategoryWrite("updateCategory");
    return { ok: true, message: "Порядок збережено." };
  } catch (error) {
    return failure(error);
  }
}

/** Adds products to a category (keeps their other categories). */
export async function addProductsToCategory(categoryId: string, productIds: string[]): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const id = requireId(categoryId);
    const ids = toObjectIds(productIds);
    if (!ids.length) return { ok: false, error: "Не вибрано жодного товару." };
    if (!(await Category.exists({ _id: id }))) return { ok: false, error: "Категорію не знайдено." };
    const result = await Product.updateMany({ _id: { $in: ids } }, { $addToSet: { category: id } });
    await syncCategoryMembership([id]);
    await afterCategoryWrite("updateCategory");
    return { ok: true, message: `Додано товарів: ${result.modifiedCount}.` };
  } catch (error) {
    return failure(error);
  }
}

/** Takes products out of a category (they keep their other categories). */
export async function removeProductsFromCategory(categoryId: string, productIds: string[]): Promise<CategoryActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const id = requireId(categoryId);
    const ids = toObjectIds(productIds);
    if (!ids.length) return { ok: false, error: "Не вибрано жодного товару." };
    const result = await Product.updateMany({ _id: { $in: ids } }, { $pull: { category: id } });
    await syncCategoryMembership([id]);
    await afterCategoryWrite("updateCategory");
    return { ok: true, message: `Прибрано з категорії: ${result.modifiedCount}.` };
  } catch (error) {
    return failure(error);
  }
}

export type ProductSearchHit = { _id: string; name: string; articleNumber: string; image: string | null; inCategory: boolean };

/** Up to 20 products by name, article number or ID, for the "add products" search in a category. */
export async function searchProductsForCategory(query: string, categoryId: string): Promise<ProductSearchHit[]> {
  await requireCatalogAdmin();
  await connectToDB();
  const text = String(query ?? "").trim().slice(0, 80);
  if (text.length < 2) return [];
  const pattern = new RegExp(escapeRegExp(text), "i");
  const rows = await Product.find(
    { _id: { $ne: new ObjectId(DELETED_PRODUCT_ID) }, $or: [{ name: pattern }, { articleNumber: pattern }, { id: text }] },
    { name: 1, articleNumber: 1, category: 1, images: { $slice: 1 } },
  )
    .limit(20)
    .lean<{ _id: Oid; name?: string; articleNumber?: string; category?: Oid[]; images?: string[] }[]>();
  const target = isObjectIdLike(categoryId) ? categoryId.toLowerCase() : "";
  return rows.map((row) => ({
    _id: String(row._id),
    name: row.name ?? "",
    articleNumber: row.articleNumber ?? "",
    image: row.images?.[0] ?? null,
    inCategory: (row.category ?? []).some((value) => String(value) === target),
  }));
}
