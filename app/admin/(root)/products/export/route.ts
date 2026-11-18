import mongoose from "mongoose"
import { NextResponse } from "next/server"
import Category from "@/lib/models/category.model"
import Product from "@/lib/models/product.model"
import { connectToDB } from "@/lib/mongoose"
import { requireCatalogAdmin } from "@/lib/admin/catalog-auth"
import { parseProductListFilter, resolveProductIds } from "@/lib/admin/products"
import { DELETED_CATEGORY_ID, DELETED_PRODUCT_ID } from "@/lib/admin/catalog-shared"
import { toObjectIds } from "@/lib/admin/categories"
import { generateFullCatalogXmlOnClient, type CategoryType } from "@/lib/xml-parser/export"
import { Store } from "@/constants/store"

export const dynamic = "force-dynamic"

/**
 * XML (YML) export of the products list. Built on the server and sent as a
 * download, so the browser never loads the whole catalog. The form on
 * /admin/products posts either `ids` (the selection) or the list filter.
 */
export async function POST(request: Request) {
  try {
    await requireCatalogAdmin()
  } catch {
    return new NextResponse("Недостатньо прав", { status: 403 })
  }

  await connectToDB()
  const form = await request.formData()
  const rawIds = String(form.get("ids") ?? "")

  const ids = rawIds
    ? toObjectIds(rawIds.split(","))
    : await resolveProductIds(
        parseProductListFilter({
          tab: String(form.get("tab") ?? ""),
          q: String(form.get("q") ?? ""),
          category: String(form.get("category") ?? ""),
        }),
      )
  const productIds = ids.filter((id) => String(id) !== DELETED_PRODUCT_ID)

  const [products, categories] = await Promise.all([
    Product.find({ _id: { $in: productIds } })
      .select("_id id name articleNumber isAvailable price priceToShow category vendor images quantity description params url")
      .sort({ _id: 1 })
      .lean(),
    Category.find({ _id: { $ne: new mongoose.Types.ObjectId(DELETED_CATEGORY_ID) } })
      .select("_id id name subCategories")
      .lean<{ _id: mongoose.Types.ObjectId; id?: string; name?: string; subCategories?: mongoose.Types.ObjectId[] }[]>(),
  ])

  const categoryRows: CategoryType[] = categories.map((category) => ({
    _id: String(category._id),
    // Categories created in the admin have no external id: fall back to the database id.
    id: category.id || String(category._id),
    name: category.name ?? "",
    products: [],
    totalValue: 0,
    subCategories: (category.subCategories ?? []).map(String),
  }))

  const xml = generateFullCatalogXmlOnClient(categoryRows, products)
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(Store.name)}-catalog-${date}.xml"`,
      "Cache-Control": "no-store",
    },
  })
}
