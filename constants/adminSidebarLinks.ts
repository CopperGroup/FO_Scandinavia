import {
    BarChart3,
    ClipboardList,
    CreditCard,
    Database,
    Filter,
    FolderTree,
    LayoutDashboard,
    Link2,
    PlusCircle,
    Settings,
    User,
    Code,
  } from "lucide-react"
  import type { LucideIcon } from "lucide-react"
  
  export type SidebarLinkGroup = {
    title: string
    items: SidebarLink[]
    icon?: LucideIcon
    collapsible?: boolean
  }
  
  export type SidebarLink = {
    icon: LucideIcon
    route: string
    label: string
    isActive?: boolean
  }
  
  export const sidebarLinkGroups: SidebarLinkGroup[] = [
    {
      title: "Дашбоард",
      icon: LayoutDashboard,
      items: [
        {
          icon: LayoutDashboard,
          route: "/admin/dashboard",
          label: "Дашбоард",
        },
        {
          icon: BarChart3,
          route: "/admin/statistics",
          label: "Статистика",
        },
      ],
    },
    {
      title: "Товари",
      icon: Database,
      items: [
        {
          icon: PlusCircle,
          route: "/admin/createProduct",
          label: "Створити товар",
        },
        {
          icon: Database,
          route: "/admin/products",
          label: "Склад",
        },
        {
          icon: Link2,
          route: "/admin/fetchUrl",
          label: "Парсинг XML",
        },
        {
          icon: FolderTree,
          route: "/admin/categories",
          label: "Категорії",
        },
      ],
    },
    {
      title: "Замовлення",
      icon: ClipboardList,
      items: [
        {
          icon: ClipboardList,
          route: "/admin/Orders",
          label: "Замовлення",
        },
        {
          icon: CreditCard,
          route: "/admin/payments",
          label: "Платежі",
        },
      ],
    },
    {
      title: "Користувачі",
      icon: User,
      collapsible: false,
      items: [
        {
          icon: User,
          route: "/admin/clients",
          label: "Користувачі",
        },
      ],
    },
    {
      title: "Інше",
      icon: Settings,
      items: [
        {
          icon: Code,
          route: "/admin/pixel",
          label: "Піксель",
        },
        {
          icon: Filter,
          route: "/admin/filter",
          label: "Фільтр",
        },
      ],
    },
    {
      title: "Налаштування",
      icon: Settings,
      items: [
        {
          icon: LayoutDashboard,
          route: "/admin/pages",
          label: "Сторінки",
        },
      ],
    },
  ]
  
  