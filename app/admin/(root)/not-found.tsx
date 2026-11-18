import Link from "next/link"
import { AdminPage, EmptyState, adminButton } from "@/components/admin/ui"

/** An address under /admin that leads nowhere (a deleted code, client or order). Shown inside the panel frame. */
export default function AdminNotFound() {
  return (
    <AdminPage title="Сторінку не знайдено">
      <EmptyState
        title="Тут нічого немає"
        text="Можливо, цей запис уже видалили або посилання неповне. Відкрийте потрібний розділ у меню ліворуч."
        action={<Link href="/admin/dashboard" className={adminButton.secondary}>На огляд</Link>}
      />
    </AdminPage>
  )
}
