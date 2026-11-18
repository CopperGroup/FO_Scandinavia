import type { Metadata } from "next"
import MenuEditor from "@/components/admin-components/menu/MenuEditor"
import { AdminPage } from "@/components/admin/ui"
import { loadCategoryOptionsWithPath } from "@/lib/admin/categories"
import { formatAdminDateTime } from "@/lib/admin/status"
import { automaticMenu } from "@/lib/catalog/departments"
import { getCatalogSnapshot } from "@/lib/catalog/server/service"
import { getSavedMenu } from "@/lib/storefront/navigation"

export const metadata: Metadata = { title: "Меню" }
export const dynamic = "force-dynamic"

/**
 * "Меню": the row of departments under the search bar of the shop. The owner
 * names the departments, decides which categories each one lists (in named
 * columns), adds and removes departments, and can hide "Новинки" and "Знижки".
 * Until it is saved for the first time the menu is the automatic one.
 */
export default async function MenuPage() {
  const [saved, categories, snapshot] = await Promise.all([getSavedMenu(), loadCategoryOptionsWithPath(), getCatalogSnapshot()])

  // Catalog cards in stock per category: a category without stock is not shown in the menu of the shop.
  const inStock: Record<string, number> = {}
  for (const listing of snapshot.listings) for (const id of listing.category) inStock[id] = (inStock[id] ?? 0) + 1

  const menu = saved?.menu ?? automaticMenu(categories.map((category) => ({ categoryId: category.id, name: category.name })))

  return (
    <AdminPage title="Меню" description="Рядок відділів під пошуком у магазині: назви, категорії всередині, «Новинки» і «Знижки».">
      <MenuEditor
        initial={menu}
        saved={Boolean(saved)}
        categories={categories.map((category) => ({ id: category.id, name: category.name, path: category.path, inStock: inStock[category.id] ?? 0 }))}
        changed={saved ? [saved.updatedBy, formatAdminDateTime(saved.updatedAt)].filter(Boolean).join(", ") : ""}
      />
    </AdminPage>
  )
}
