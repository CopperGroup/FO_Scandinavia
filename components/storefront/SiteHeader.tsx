import { getNavigation } from "@/lib/storefront/navigation"
import { getCurrentUser, getStoreContacts } from "@/lib/storefront/session"
import HeaderClient from "./HeaderClient"
import type { HeaderData } from "./types"

export default async function SiteHeader() {
  const [navigation, user, contacts] = await Promise.all([getNavigation(), getCurrentUser(), getStoreContacts()])

  const primaryDepartment: HeaderData["primaryDepartment"] = {}
  for (const [id, keys] of Object.entries(navigation.departmentsByCategory)) primaryDepartment[id] = keys[0]

  const data: HeaderData = {
    departments: navigation.departments.map((department) => ({
      key: department.key,
      label: department.label,
      count: department.count,
      groups: department.groups.map((group) => ({
        label: group.label,
        categories: group.categories.map(({ id, name, count }) => ({ id, name, count })),
      })),
    })),
    other: navigation.other.map(({ id, name, count }) => ({ id, name, count })),
    primaryDepartment,
    saleCount: navigation.saleCount,
    showNew: navigation.showNew,
    showSale: navigation.showSale,
    user: user ? { id: user.id, name: user.name, isAdmin: user.isAdmin } : null,
    phone: contacts.phone,
  }

  return <HeaderClient data={data} />
}
