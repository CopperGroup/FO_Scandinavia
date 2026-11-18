import type { DepartmentKey } from "@/lib/catalog/departments"

/** Department menu as the header needs it: no images, no ids beyond links. */
export type HeaderDepartment = {
  key: DepartmentKey
  label: string
  count: number
  groups: { label: string; categories: { id: string; name: string; count: number }[] }[]
}

export type HeaderUser = { id: string; name: string; isAdmin: boolean } | null

export type HeaderData = {
  departments: HeaderDepartment[]
  other: { id: string; name: string; count: number }[]
  /** categoryId → its primary department, to highlight the current scope. */
  primaryDepartment: Record<string, DepartmentKey>
  saleCount: number
  /** The menu shows "Новинки" / "Знижки" (the owner can hide them in the admin). */
  showNew: boolean
  showSale: boolean
  user: HeaderUser
  phone: string
}

export const departmentHref = (key: DepartmentKey) => `/catalog?department=${key}`
export const categoryHref = (id: string, department?: DepartmentKey) =>
  department ? `/catalog?department=${department}&categories=${id}` : `/catalog?categories=${id}`
export const SALE_HREF = "/catalog?sale=1&sort=discount"
export const NEW_HREF = "/catalog?sort=new"
