import type { Metadata } from "next"
import PolicySettingsForm from "@/components/admin-components/settings/PolicySettingsForm"
import StoreSettingsForm from "@/components/admin-components/settings/StoreSettingsForm"
import { AdminPage, Tabs } from "@/components/admin/ui"
import { Store } from "@/constants/store"
import { formatAdminDateTime } from "@/lib/admin/status"
import { amountLabel } from "@/lib/content/schema"
import { getFreeDelivery, getVariablesForEditor } from "@/lib/content/server"
import { variableList } from "@/lib/content/variables"
import { getPoliciesForEditor } from "@/lib/storefront/policies"

export const metadata: Metadata = { title: "Налаштування" }
export const dynamic = "force-dynamic"

/**
 * "Налаштування": what the whole shop shares and no single page owns. Two
 * tabs: the contacts of the shop with the variables that the texts of the
 * site can name (lib/content/variables.ts), and the return and delivery terms
 * search engines are told (lib/policies.ts).
 */
export default async function SettingsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const terms = searchParams.tab === "terms"
  const tabs = (
    <Tabs
      label="Розділи налаштувань"
      items={[
        { key: "contacts", label: "Контакти і змінні", href: "/admin/settings", active: !terms },
        { key: "terms", label: "Доставка і повернення", href: "/admin/settings?tab=terms", active: terms, tip: "Строк повернення, строки й вартість доставки, які бачать пошукові системи поруч із товаром" },
      ]}
    />
  )

  if (terms) {
    const [stored, freeDelivery] = await Promise.all([getPoliciesForEditor(), getFreeDelivery()])
    return (
      <AdminPage title="Налаштування" description="Умови повернення і доставки, які пошукові системи показують поруч із товаром.">
        {tabs}
        <PolicySettingsForm
          initial={stored.policies}
          freeDeliveryLabel={freeDelivery > 0 ? amountLabel(freeDelivery) : ""}
          changed={stored.saved ? [stored.updatedBy, formatAdminDateTime(stored.updatedAt)].filter(Boolean).join(", ") : ""}
        />
      </AdminPage>
    )
  }

  const [variables, freeDelivery] = await Promise.all([getVariablesForEditor(), getFreeDelivery()])
  const list = variableList(variables.values, { store: Store.name, year: new Date().getFullYear(), amount: freeDelivery > 0 ? amountLabel(freeDelivery) : "" })

  return (
    <AdminPage title="Налаштування" description="Контакти магазину і значення, які повторюються в текстах сайту.">
      {tabs}
      <StoreSettingsForm
        initial={variables.values}
        saved={variables.saved}
        fromLegacy={variables.fromLegacy}
        computed={list.filter((variable) => variable.kind === "computed")}
        changed={[variables.updatedBy, formatAdminDateTime(variables.updatedAt)].filter(Boolean).join(", ")}
      />
    </AdminPage>
  )
}
