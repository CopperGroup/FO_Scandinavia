import mongoose from "mongoose";
import Category from "@/lib/models/category.model";
import Filter from "@/lib/models/filter.model";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import { escapeRegExp } from "@/lib/catalog/text";
import {
  DELETED_CATEGORY_ID,
  DELETED_PRODUCT_ID,
  categoryNameKey,
  discountPercent,
  isObjectIdLike,
  isRecommendedParam,
  parentsFromChildren,
  parseFilterParamType,
} from "./catalog-shared";

/**
 * Server-side reads and the one write helper (membership sync) for the
 * category and filter admin pages. Product.category is the single source of
 * truth for which product is in which category; every count here is derived
 * from it. Category.products and Category.totalValue are denormalised copies
 * kept for lib/catalog (it reads products.length) and rebuilt only by
 * syncCategoryMembership().
 */

const { ObjectId } = mongoose.Types;
type Oid = mongoose.Types.ObjectId;

const DELETED_PRODUCT_OID = new ObjectId(DELETED_PRODUCT_ID);
const NOT_PLACEHOLDER_CATEGORY = { _id: { $ne: new ObjectId(DELETED_CATEGORY_ID) } };

const PURCHASABLE = { $and: [{ $eq: ["$isAvailable", true] }, { $gt: [{ $ifNull: ["$quantity", 0] }, 0] }] };

export type CategoryOption = { id: string; name: string };

const collator = new Intl.Collator("uk-UA", { sensitivity: "base", numeric: true });

/**
 * Every usable category, id and name only, sorted by name (a few KB). For
 * pickers and filters: categories whose name is a bare id (left by the old
 * form bug) are hidden here and shown only under "Пошкоджені" in the
 * categories admin.
 */
export async function loadCategoryOptions(): Promise<CategoryOption[]> {
  await connectToDB();
  const rows = await Category.find(NOT_PLACEHOLDER_CATEGORY).select("_id name").lean<{ _id: Oid; name?: string }[]>();
  return rows
    .filter((row) => !isObjectIdLike(row.name ?? ""))
    .map((row) => ({ id: String(row._id), name: row.name?.trim() || "Без назви" }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** Category options with their path ("Жінкам / Сукні") as a hint, for searchable pickers. */
export async function loadCategoryOptionsWithPath(): Promise<(CategoryOption & { path: string })[]> {
  return optionsFromTree(await getCategoryTree());
}

/** Same as loadCategoryOptionsWithPath, from a tree already loaded (no query). Hides damaged categories. */
export function optionsFromTree(tree: TreeCategory[]): (CategoryOption & { path: string })[] {
  const byId = new Map(tree.map((node) => [node.id, node]));
  const pathOf = (id: string): string => {
    const names: string[] = [];
    let cursor = byId.get(id)?.parentId ?? null;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const node = byId.get(cursor);
      if (!node) break;
      names.unshift(node.name);
      cursor = node.parentId;
    }
    return names.join(" / ");
  };
  return tree
    .filter((node) => !node.damaged)
    .map((node) => ({ id: node.id, name: node.name, path: pathOf(node.id) }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** ObjectIds of every real category, for "has a valid category" filters. */
export async function loadValidCategoryIds(): Promise<Oid[]> {
  await connectToDB();
  const rows = await Category.find(NOT_PLACEHOLDER_CATEGORY).select("_id").lean<{ _id: Oid }[]>();
  return rows.map((row) => row._id);
}

export function toObjectIds(values: readonly unknown[]): Oid[] {
  const seen = new Set<string>();
  const ids: Oid[] = [];
  for (const value of values) {
    const text = String(value ?? "").trim().toLowerCase();
    if (!isObjectIdLike(text) || seen.has(text)) continue;
    seen.add(text);
    ids.push(new ObjectId(text));
  }
  return ids;
}

/**
 * Rebuilds Category.products and Category.totalValue from Product.category in
 * one aggregation and one bulkWrite. Pass the ids touched by an action, or
 * nothing to rebuild every category.
 */
export async function syncCategoryMembership(categoryIds?: readonly unknown[]): Promise<{ categories: number }> {
  await connectToDB();

  const ids = categoryIds ? toObjectIds(categoryIds) : await loadValidCategoryIds();
  if (ids.length === 0) return { categories: 0 };

  const rows = await Product.aggregate<{ _id: Oid; products: Oid[]; totalValue: number }>([
    { $match: { _id: { $ne: DELETED_PRODUCT_OID }, category: { $in: ids } } },
    // A product listed twice in one category counts once.
    { $project: { category: { $setUnion: [{ $ifNull: ["$category", []] }, []] }, priceToShow: 1 } },
    { $unwind: "$category" },
    { $match: { category: { $in: ids } } },
    { $group: { _id: "$category", products: { $push: "$_id" }, totalValue: { $sum: { $ifNull: ["$priceToShow", 0] } } } },
  ]);

  const byId = new Map(rows.map((row) => [String(row._id), row]));
  const operations = ids.map((id) => {
    const row = byId.get(String(id));
    return {
      updateOne: {
        filter: { _id: id },
        update: { $set: { products: row?.products ?? [], totalValue: Math.round(row?.totalValue ?? 0) } },
      },
    };
  });

  await Category.bulkWrite(operations, { ordered: false });
  return { categories: operations.length };
}

/* -------------------------------------------------------------------------- */
/*                                Category list                               */
/* -------------------------------------------------------------------------- */

type CategoryStatsRow = { _id: Oid; products: number; available: number; value: number; priceSum: number };

/** Per-category product counts and values, from Product (one aggregation). */
async function aggregateCategoryStats(ids: Oid[]): Promise<Map<string, CategoryStatsRow>> {
  if (ids.length === 0) return new Map();
  const rows = await Product.aggregate<CategoryStatsRow>([
    { $match: { _id: { $ne: DELETED_PRODUCT_OID }, category: { $in: ids } } },
    {
      $project: {
        category: { $setUnion: [{ $ifNull: ["$category", []] }, []] },
        price: { $ifNull: ["$price", 0] },
        priceToShow: { $ifNull: ["$priceToShow", { $ifNull: ["$price", 0] }] },
        purchasable: { $cond: [PURCHASABLE, 1, 0] },
      },
    },
    { $unwind: "$category" },
    { $match: { category: { $in: ids } } },
    {
      $group: {
        _id: "$category",
        products: { $sum: 1 },
        available: { $sum: "$purchasable" },
        value: { $sum: "$priceToShow" },
        priceSum: { $sum: "$price" },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
}

export type CategoryListRow = {
  id: string;
  name: string;
  parent: { id: string; name: string } | null;
  children: number;
  products: number;
  available: number;
  value: number;
  averagePrice: number;
  averageDiscount: number;
  /** A name that is just a 24-hex id: a leftover of the old bug. */
  suspicious: boolean;
};

export const CATEGORY_SORTS = [
  { key: "name", label: "За назвою" },
  { key: "products", label: "Більше товарів" },
  { key: "value", label: "Більша вартість" },
  { key: "empty", label: "Спершу порожні" },
] as const;
export type CategorySortKey = (typeof CATEGORY_SORTS)[number]["key"];

export const CATEGORIES_PAGE_SIZE = 50;

export type CategoryList = {
  rows: CategoryListRow[];
  total: number;
  page: number;
  pageCount: number;
  summary: { categories: number; empty: number; uncategorizedProducts: number; suspicious: number };
};

async function loadAllCategoryRows(): Promise<CategoryListRow[]> {
  await connectToDB();
  const categories = await Category.find(NOT_PLACEHOLDER_CATEGORY)
    .select("_id name subCategories")
    .lean<{ _id: Oid; name?: string; subCategories?: Oid[] }[]>();

  const ids = categories.map((category) => category._id);
  const stats = await aggregateCategoryStats(ids);
  const names = new Map(categories.map((category) => [String(category._id), category.name?.trim() || "Без назви"]));
  const parentOf = parentsFromChildren(
    categories.map((category) => ({ id: String(category._id), subCategories: (category.subCategories ?? []).map(String) })),
  );
  const childCount = new Map<string, number>();
  for (const parent of Array.from(parentOf.values())) if (parent) childCount.set(parent, (childCount.get(parent) ?? 0) + 1);

  return categories.map((category) => {
    const id = String(category._id);
    const row = stats.get(id);
    const products = row?.products ?? 0;
    const parentId = parentOf.get(id) ?? null;
    return {
      id,
      name: names.get(id)!,
      parent: parentId ? { id: parentId, name: names.get(parentId) ?? "" } : null,
      children: childCount.get(id) ?? 0,
      products,
      available: row?.available ?? 0,
      value: Math.round(row?.value ?? 0),
      averagePrice: products ? Math.round((row?.value ?? 0) / products) : 0,
      averageDiscount: row ? discountPercent(row.priceSum, row.value) : 0,
      suspicious: isObjectIdLike(category.name ?? ""),
    };
  });
}

/** Products whose category list holds no existing category. */
export async function countUncategorizedProducts(validIds?: Oid[]): Promise<number> {
  await connectToDB();
  const ids = validIds ?? (await loadValidCategoryIds());
  return Product.countDocuments({ _id: { $ne: DELETED_PRODUCT_OID }, category: { $nin: ids } });
}

export async function listCategories({ query, sort, page }: { query: string; sort: CategorySortKey; page: number }): Promise<CategoryList> {
  const [all, uncategorizedProducts] = await Promise.all([loadAllCategoryRows(), countUncategorizedProducts()]);

  const pattern = query ? new RegExp(escapeRegExp(query), "i") : null;
  const matching = pattern ? all.filter((row) => pattern.test(row.name) || pattern.test(row.parent?.name ?? "")) : all;

  const sorted = [...matching].sort((a, b) => {
    if (sort === "products") return b.products - a.products || collator.compare(a.name, b.name);
    if (sort === "value") return b.value - a.value || collator.compare(a.name, b.name);
    if (sort === "empty") return a.products - b.products || collator.compare(a.name, b.name);
    return collator.compare(a.name, b.name);
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / CATEGORIES_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);

  return {
    rows: sorted.slice((current - 1) * CATEGORIES_PAGE_SIZE, current * CATEGORIES_PAGE_SIZE),
    total: sorted.length,
    page: current,
    pageCount,
    summary: {
      categories: all.length,
      empty: all.filter((row) => row.products === 0).length,
      uncategorizedProducts,
      suspicious: all.filter((row) => row.suspicious).length,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                               Category detail                              */
/* -------------------------------------------------------------------------- */

export type CategoryDetail = {
  id: string;
  name: string;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; products: number }[];
  stats: { products: number; available: number; value: number; averagePrice: number; averageDiscount: number; sales: number };
  inFilter: number;
  /** The text under the products on the category's page in the shop. */
  text: string;
};

export async function getCategoryDetail(categoryId: string): Promise<CategoryDetail | null> {
  if (!isObjectIdLike(categoryId)) return null;
  await connectToDB();
  const id = new ObjectId(categoryId);

  const [category, parent, filter] = await Promise.all([
    Category.findById(id).select("_id name subCategories text").lean<{ _id: Oid; name?: string; subCategories?: Oid[]; text?: string } | null>(),
    Category.findOne({ subCategories: id }).select("_id name").lean<{ _id: Oid; name?: string } | null>(),
    Filter.findOne({ "categories.categoryId": id }, { "categories.$": 1 }).lean<{ categories?: { params?: unknown[] }[] } | null>(),
  ]);
  if (!category || String(category._id) === DELETED_CATEGORY_ID) return null;

  const childIds = toObjectIds(category.subCategories ?? []);
  const [children, stats, sales] = await Promise.all([
    childIds.length
      ? Category.find({ _id: { $in: childIds } }).select("_id name").lean<{ _id: Oid; name?: string }[]>()
      : Promise.resolve([]),
    aggregateCategoryStats([id, ...childIds]),
    Product.aggregate<{ sales: number }>([
      { $match: { category: id } },
      { $group: { _id: null, sales: { $sum: { $size: { $ifNull: ["$orderedBy", []] } } } } },
    ]),
  ]);

  const own = stats.get(categoryId);
  const products = own?.products ?? 0;
  return {
    id: categoryId,
    name: category.name?.trim() || "Без назви",
    parent: parent ? { id: String(parent._id), name: parent.name ?? "" } : null,
    children: children
      .map((child) => ({ id: String(child._id), name: child.name ?? "", products: stats.get(String(child._id))?.products ?? 0 }))
      .sort((a, b) => collator.compare(a.name, b.name)),
    stats: {
      products,
      available: own?.available ?? 0,
      value: Math.round(own?.value ?? 0),
      averagePrice: products ? Math.round((own?.value ?? 0) / products) : 0,
      averageDiscount: own ? discountPercent(own.priceSum, own.value) : 0,
      sales: sales[0]?.sales ?? 0,
    },
    inFilter: filter?.categories?.[0]?.params?.length ?? 0,
    text: category.text ?? "",
  };
}

/* -------------------------------------------------------------------------- */
/*                                Category tree                               */
/* -------------------------------------------------------------------------- */

export type TreeCategory = {
  id: string;
  name: string;
  parentId: string | null;
  /** Place among its siblings (the parent's subCategories order); roots are ordered by name. */
  position: number;
  products: number;
  damaged: boolean;
};

export async function getCategoryTree(): Promise<TreeCategory[]> {
  await connectToDB();
  const categories = await Category.find(NOT_PLACEHOLDER_CATEGORY)
    .select("_id name subCategories")
    .lean<{ _id: Oid; name?: string; subCategories?: Oid[] }[]>();
  const stats = await aggregateCategoryStats(categories.map((category) => category._id));
  const parentOf = parentsFromChildren(
    categories.map((category) => ({ id: String(category._id), subCategories: (category.subCategories ?? []).map(String) })),
  );
  const order = new Map<string, number>();
  for (const category of categories) (category.subCategories ?? []).forEach((child, index) => order.set(`${category._id}|${child}`, index));
  return categories
    .map((category) => {
      const id = String(category._id);
      const parentId = parentOf.get(id) ?? null;
      return {
        id,
        name: category.name?.trim() || "Без назви",
        parentId,
        position: parentId ? order.get(`${parentId}|${id}`) ?? 0 : 0,
        products: stats.get(id)?.products ?? 0,
        damaged: isObjectIdLike(category.name ?? ""),
      };
    })
    .sort((a, b) => a.position - b.position || collator.compare(a.name, b.name));
}

export type DamagedCategory = {
  id: string;
  name: string;
  products: number;
  problem: "id-name" | "duplicate";
  /** For a duplicate: the other categories with the same name. */
  twins: { id: string; name: string; products: number }[];
};

/** Categories that need the admin's attention: names that are bare ids, and names used twice. */
export async function listDamagedCategories(tree?: TreeCategory[]): Promise<DamagedCategory[]> {
  const nodes = tree ?? (await getCategoryTree());
  const damaged: DamagedCategory[] = nodes
    .filter((node) => node.damaged)
    .map((node) => ({ id: node.id, name: node.name, products: node.products, problem: "id-name" as const, twins: [] }));

  const groups = new Map<string, TreeCategory[]>();
  for (const node of nodes) {
    if (node.damaged) continue;
    const key = categoryNameKey(node.name);
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }
  for (const group of Array.from(groups.values())) {
    if (group.length < 2) continue;
    // The smaller one is the one to merge away.
    const sorted = [...group].sort((a, b) => b.products - a.products);
    for (const node of sorted.slice(1)) {
      damaged.push({
        id: node.id,
        name: node.name,
        products: node.products,
        problem: "duplicate",
        twins: group.filter((other) => other.id !== node.id).map((other) => ({ id: other.id, name: other.name, products: other.products })),
      });
    }
  }
  return damaged;
}

/** Case-insensitive lookup of a category by name. */
export async function findCategoryByName(name: string, exceptId?: string): Promise<{ id: string; name: string } | null> {
  await connectToDB();
  const key = categoryNameKey(name);
  if (!key) return null;
  const candidates = await Category.find({ ...NOT_PLACEHOLDER_CATEGORY, name: new RegExp(`^\\s*${escapeRegExp(name.trim())}\\s*$`, "i") })
    .select("_id name")
    .lean<{ _id: Oid; name?: string }[]>();
  const match = candidates.find((candidate) => categoryNameKey(candidate.name) === key && String(candidate._id) !== exceptId);
  return match ? { id: String(match._id), name: match.name ?? "" } : null;
}

/* -------------------------------------------------------------------------- */
/*                                   Filter                                   */
/* -------------------------------------------------------------------------- */

type FilterDoc = {
  delay?: number;
  categories?: { categoryId?: Oid; params?: { name?: string; totalProducts?: number; type?: string }[] }[];
};

export async function loadFilterDocument(): Promise<FilterDoc | null> {
  await connectToDB();
  return Filter.findOne().select("delay categories").lean<FilterDoc | null>();
}

export type FilterOverviewRow = {
  id: string;
  name: string;
  products: number;
  configured: string[];
};

export const FILTER_PAGE_SIZE = 50;

export async function getFilterOverview({
  query,
  page,
  show,
  pageSize = FILTER_PAGE_SIZE,
}: {
  query: string;
  page: number;
  show: "all" | "configured" | "empty";
  pageSize?: number;
}) {
  await connectToDB();
  const [categories, filter] = await Promise.all([
    Category.find(NOT_PLACEHOLDER_CATEGORY).select("_id name").lean<{ _id: Oid; name?: string }[]>(),
    loadFilterDocument(),
  ]);
  const stats = await aggregateCategoryStats(categories.map((category) => category._id));
  const configured = new Map<string, string[]>();
  for (const entry of filter?.categories ?? []) {
    if (!entry.categoryId) continue;
    configured.set(String(entry.categoryId), (entry.params ?? []).map((param) => param.name ?? "").filter(Boolean));
  }

  const all: FilterOverviewRow[] = categories
    .map((category) => {
      const id = String(category._id);
      return { id, name: category.name?.trim() || "Без назви", products: stats.get(id)?.products ?? 0, configured: configured.get(id) ?? [] };
    })
    .filter((row) => (row.products > 0 || row.configured.length > 0) && !isObjectIdLike(row.name))
    .sort((a, b) => collator.compare(a.name, b.name));

  const pattern = query ? new RegExp(escapeRegExp(query), "i") : null;
  const matching = all.filter((row) => {
    if (pattern && !pattern.test(row.name) && !row.configured.some((name) => pattern.test(name))) return false;
    if (show === "configured") return row.configured.length > 0;
    if (show === "empty") return row.configured.length === 0;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    rows: matching.slice((current - 1) * pageSize, current * pageSize),
    total: matching.length,
    page: current,
    pageCount,
    counts: {
      all: all.length,
      configured: all.filter((row) => row.configured.length > 0).length,
      empty: all.filter((row) => row.configured.length === 0).length,
    },
    delay: filter?.delay || 250,
  };
}

export type FilterParamRow = {
  name: string;
  products: number;
  recommended: boolean;
  samples: string[];
  values: number;
  kind: "select" | "unit" | "";
  unit: string;
};

export type FilterCategoryDetail = {
  id: string;
  name: string;
  products: number;
  params: FilterParamRow[];
  example: { id: string; name: string } | null;
};

/** The params products of one category carry, with how many products have each and a few sample values. */
export async function getFilterCategory(categoryId: string): Promise<FilterCategoryDetail | null> {
  if (!isObjectIdLike(categoryId)) return null;
  await connectToDB();
  const id = new ObjectId(categoryId);

  const [category, filter, products, params, example] = await Promise.all([
    Category.findById(id).select("_id name").lean<{ _id: Oid; name?: string } | null>(),
    loadFilterDocument(),
    Product.countDocuments({ _id: { $ne: DELETED_PRODUCT_OID }, category: id }),
    Product.aggregate<{ _id: string; products: number; values: string[] }>([
      { $match: { _id: { $ne: DELETED_PRODUCT_OID }, category: id } },
      { $project: { params: 1 } },
      { $unwind: "$params" },
      { $match: { "params.name": { $nin: [null, ""] } } },
      // One row per product and param, so a param repeated on a product counts once.
      { $group: { _id: { product: "$_id", name: "$params.name" }, value: { $first: "$params.value" } } },
      { $group: { _id: "$_id.name", products: { $sum: 1 }, values: { $addToSet: "$value" } } },
      { $sort: { products: -1, _id: 1 } },
      { $limit: 200 },
    ]),
    Product.findOne({ _id: { $ne: DELETED_PRODUCT_OID }, category: id }).select("_id name").lean<{ _id: Oid; name?: string } | null>(),
  ]);
  if (!category) return null;

  const entry = filter?.categories?.find((item) => String(item.categoryId) === categoryId);
  const types = new Map((entry?.params ?? []).map((param) => [param.name ?? "", param.type ?? ""]));

  const rows: FilterParamRow[] = params.map((param) => {
    const values = (param.values ?? []).filter((value) => typeof value === "string" && value.trim());
    const parsed = parseFilterParamType(types.get(param._id));
    return {
      name: param._id,
      products: param.products,
      recommended: isRecommendedParam(param.products, products),
      samples: values.sort((a, b) => collator.compare(a, b)).slice(0, 6),
      values: values.length,
      kind: parsed.kind,
      unit: parsed.unit,
    };
  });

  // Params configured earlier that no product carries any more stay visible, so they can be switched off.
  for (const [name, type] of Array.from(types.entries())) {
    if (!name || rows.some((row) => row.name === name)) continue;
    const parsed = parseFilterParamType(type);
    rows.push({ name, products: 0, recommended: false, samples: [], values: 0, kind: parsed.kind, unit: parsed.unit });
  }

  return {
    id: categoryId,
    name: category.name?.trim() || "Без назви",
    products,
    params: rows,
    example: example ? { id: String(example._id), name: example.name ?? "" } : null,
  };
}
