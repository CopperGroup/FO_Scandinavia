import mongoose from "mongoose";
import Category from "@/lib/models/category.model";
import Filter from "@/lib/models/filter.model";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import type { CatalogCategory, FilterSettings, SourceProduct } from "../types";
import type { SnapshotInput } from "../snapshot";

/** Placeholder documents that stand in for deleted products/categories in old orders. */
export const DELETED_PRODUCT_ID = "681a9c16b06f4e599d07371e";
export const DELETED_CATEGORY_ID = "681a9c9a90b4efb3dd18d1e5";

const DESCRIPTION_PREVIEW_LENGTH = 400;

type ProductRow = Omit<SourceProduct, "_id" | "category" | "createdAt"> & {
  _id: mongoose.Types.ObjectId;
  category?: unknown[];
  createdAt?: Date;
};

async function loadProducts(): Promise<SourceProduct[]> {
  // One pass over the collection with only the fields the catalog needs.
  const rows: ProductRow[] = await Product.aggregate([
    { $match: { _id: { $ne: new mongoose.Types.ObjectId(DELETED_PRODUCT_ID) } } },
    {
      $project: {
        id: 1,
        name: 1,
        articleNumber: 1,
        images: { $slice: [{ $ifNull: ["$images", []] }, 1] },
        isAvailable: 1,
        quantity: 1,
        url: 1,
        price: 1,
        priceToShow: 1,
        vendor: 1,
        category: 1,
        "params.name": 1,
        "params.value": 1,
        createdAt: 1,
        description: { $substrCP: [{ $ifNull: ["$description", ""] }, 0, DESCRIPTION_PREVIEW_LENGTH] },
        salesCount: { $size: { $ifNull: ["$orderedBy", []] } },
      },
    },
  ]);

  return rows.map((row) => ({
    _id: String(row._id),
    id: String(row.id ?? ""),
    name: row.name ?? "",
    articleNumber: row.articleNumber ?? "",
    images: (row.images ?? []).filter(Boolean),
    isAvailable: row.isAvailable === true,
    quantity: Number(row.quantity ?? 0),
    url: row.url ?? "",
    price: Number(row.price ?? 0),
    priceToShow: Number(row.priceToShow ?? row.price ?? 0),
    vendor: row.vendor ?? "",
    category: (row.category ?? []).filter(Boolean).map(String),
    params: (row.params ?? []).filter((param) => param?.name),
    description: row.description ?? "",
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    salesCount: row.salesCount ?? 0,
  }));
}

type CategoryRow = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  products?: unknown[];
  subCategories?: unknown[];
  text?: string;
};

async function loadCategories(): Promise<{ categories: CatalogCategory[]; byId: Map<string, CategoryRow> }> {
  const rows = await Category.find({ _id: { $ne: DELETED_CATEGORY_ID } })
    .select("_id name products subCategories text")
    .lean<CategoryRow[]>();

  return {
    categories: rows.map((row) => ({
      name: row.name ?? "",
      categoryId: String(row._id),
      totalProducts: row.products?.length ?? 0,
      subCategories: (row.subCategories ?? []).map(String),
      ...(row.text ? { text: row.text } : {}),
    })),
    byId: new Map(rows.map((row) => [String(row._id), row])),
  };
}

type FilterRow = {
  delay?: number;
  categories?: { categoryId?: unknown; params?: { name?: string; totalProducts?: number; type?: string }[] }[];
};

async function loadFilterSettings(
  categoriesById: Map<string, CategoryRow>,
): Promise<{ filterSettings: FilterSettings; filterDelay: number }> {
  const filter = (await Filter.findOne().lean()) as FilterRow | null;
  const filterSettings: FilterSettings = {};

  for (const entry of filter?.categories ?? []) {
    const categoryId = entry.categoryId ? String(entry.categoryId) : "";
    const category = categoriesById.get(categoryId);
    if (!category) continue;

    const params: FilterSettings[string]["params"] = {};
    for (const param of entry.params ?? []) {
      if (param?.name) params[param.name] = { totalProducts: param.totalProducts ?? 0, type: param.type ?? "" };
    }

    filterSettings[categoryId] = {
      params,
      totalProducts: category.products?.length ?? 0,
      subCategories: (category.subCategories ?? []).map(String),
    };
  }

  return { filterSettings, filterDelay: filter?.delay || 250 };
}

/** Reads everything a catalog snapshot is built from. */
export async function loadSnapshotInput(): Promise<SnapshotInput> {
  await connectToDB();

  const [products, { categories, byId }] = await Promise.all([loadProducts(), loadCategories()]);
  const { filterSettings, filterDelay } = await loadFilterSettings(byId);

  return { products, categories, filterSettings, filterDelay };
}
