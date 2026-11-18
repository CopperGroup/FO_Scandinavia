"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { EmptyState, Field, Panel, Pill, adminButton, adminButtonSm, adminInput, adminTable } from "@/components/admin/ui"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import { addBrand, removeBrand, renameBrand } from "@/lib/actions/brand.actions"
import type { BrandRow } from "@/lib/admin/brands"
import { BRAND_NAME_MAX, brandHref, brandKey, brandNameProblem, cleanBrandName } from "@/lib/brands"
import { cn } from "@/lib/utils"

const number = new Intl.NumberFormat("uk-UA")

/**
 * "Бренди": the list a product's brand is chosen from. A brand can be added
 * before any product has it, renamed on all its products at once (renaming it
 * into another brand joins the two) and removed while no product carries it.
 */
export default function BrandsManager({ brands }: { brands: BrandRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [name, setName] = useState("")
  const [addError, setAddError] = useState("")
  const [busy, setBusy] = useState<"add" | "rename" | "remove" | null>(null)
  const [message, setMessage] = useState("")
  const [renaming, setRenaming] = useState<BrandRow | null>(null)
  const [newName, setNewName] = useState("")
  const [renameError, setRenameError] = useState("")
  const [removing, setRemoving] = useState<BrandRow | null>(null)
  const [removeError, setRemoveError] = useState("")

  const shown = useMemo(() => {
    const term = brandKey(query)
    return term ? brands.filter((brand) => brandKey(brand.name).includes(term)) : brands
  }, [brands, query])

  const joinTarget = renaming ? brands.find((brand) => brand.name !== renaming.name && brand.name === cleanBrandName(newName)) : undefined

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    const problem = brandNameProblem(name)
    if (problem) {
      setAddError(problem)
      return
    }
    setBusy("add")
    setAddError("")
    try {
      const result = await addBrand(name)
      if (!result.ok) {
        setAddError(result.error)
        return
      }
      setName("")
      setMessage(result.message)
      router.refresh()
    } catch {
      setAddError("Немає зв’язку з сервером. Спробуйте ще раз.")
    } finally {
      setBusy(null)
    }
  }

  const rename = async () => {
    if (!renaming || busy) return
    const problem = brandNameProblem(newName)
    if (problem) {
      setRenameError(problem)
      return
    }
    setBusy("rename")
    setRenameError("")
    try {
      const result = await renameBrand(renaming.name, newName)
      if (!result.ok) {
        setRenameError(result.error)
        return
      }
      setRenaming(null)
      setMessage(result.message)
      router.refresh()
    } catch {
      setRenameError("Немає зв’язку з сервером. Спробуйте ще раз.")
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!removing || busy) return
    setBusy("remove")
    setRemoveError("")
    try {
      const result = await removeBrand(removing.name)
      if (!result.ok) {
        setRemoveError(result.error)
        return
      }
      setRemoving(null)
      setMessage(result.message)
      router.refresh()
    } catch {
      setRemoveError("Немає зв’язку з сервером. Спробуйте ще раз.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Panel padded={false}>
        <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cn(adminInput, "pl-9")}
              placeholder="Знайти бренд у списку"
              aria-label="Знайти бренд у списку"
              autoComplete="off"
            />
          </div>

          <form onSubmit={add} noValidate>
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setAddError("")
                }}
                className={cn(adminInput, addError && "border-red-600")}
                placeholder="Назва нового бренду"
                aria-label="Назва нового бренду"
                aria-invalid={addError ? true : undefined}
                aria-describedby={addError ? "brand-add-error" : undefined}
                maxLength={BRAND_NAME_MAX}
                autoComplete="off"
              />
              <button type="submit" className={adminButton.primary} disabled={busy === "add" || !name.trim()}>
                {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Додати бренд
              </button>
            </div>
            {addError && (
              <p id="brand-add-error" role="alert" className="mt-1 text-xs text-red-700">
                {addError}
              </p>
            )}
          </form>
        </div>

        {message && (
          <p role="status" className="border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-700">
            {message}
          </p>
        )}

        {shown.length === 0 ? (
          <div className="border-t border-neutral-200 p-4">
            <EmptyState
              title={brands.length === 0 ? "Брендів ще немає" : "Такого бренду немає у списку"}
              text={brands.length === 0 ? "Додайте бренд тут або виберіть його в товарі: він з’явиться у списку сам." : `За запитом «${query}» нічого не знайшлося. Перевірте написання або додайте цей бренд.`}
            />
          </div>
        ) : (
          <div className={cn(adminTable.wrap, "border-t border-neutral-200")}>
            <table className={adminTable.table}>
              <thead>
                <tr className={adminTable.headRow}>
                  <th scope="col" className={cn(adminTable.th, "pl-4")}>
                    Бренд
                  </th>
                  <th scope="col" className={cn(adminTable.th, "text-right")}>
                    <span data-tip="Скільки товарів мають цей бренд, разом із тими, яких зараз немає в наявності" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                      Товарів
                    </span>
                  </th>
                  <th scope="col" className={cn(adminTable.th, "text-right")}>
                    <span data-tip="Скільки з них можна купити зараз" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                      У наявності
                    </span>
                  </th>
                  <th scope="col" className={cn(adminTable.th, "pr-4 text-right")}>
                    <span className="sr-only">Дії</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((brand) => (
                  <tr key={brand.name} className={adminTable.row}>
                    <td className={cn(adminTable.td, "pl-4")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-neutral-900">{brand.name}</span>
                        {brand.twins.length > 0 && (
                          <Pill tone="problem" tip={`У товарах є ще написання цього бренду: ${brand.twins.join(", ")}. Щоб бренд був один, перейменуйте зайве написання на правильне: його товари перейдуть до правильного.`}>
                            Є інше написання
                          </Pill>
                        )}
                        {brand.products === 0 && <Pill tone="muted" tip="Цього бренду ще немає в жодному товарі">Без товарів</Pill>}
                      </div>
                    </td>
                    <td className={cn(adminTable.td, "text-right tabular-nums")}>
                      {brand.products > 0 ? (
                        <Link href={`/admin/products?q=${encodeURIComponent(brand.name)}`} className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-black" data-tip="Показати товари цього бренду">
                          {number.format(brand.products)}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">0</span>
                      )}
                    </td>
                    <td className={cn(adminTable.td, "text-right tabular-nums", brand.inStock === 0 && "text-neutral-400")}>{number.format(brand.inStock)}</td>
                    <td className={cn(adminTable.td, "pr-4")}>
                      <div className="flex items-center justify-end gap-1">
                        {brand.storeName && (
                          <a href={brandHref(brand.storeName)} target="_blank" rel="noopener noreferrer" className={adminButtonSm.icon} aria-label={`Відкрити сторінку бренду «${brand.name}» в магазині`} data-tip="Відкрити сторінку бренду в магазині">
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </a>
                        )}
                        <button
                          type="button"
                          className={adminButtonSm.icon}
                          aria-label={`Перейменувати бренд «${brand.name}»`}
                          data-tip="Перейменувати або об’єднати з іншим брендом"
                          onClick={() => {
                            setRenaming(brand)
                            // A rare spelling is most likely the wrong one: offer the most used spelling instead.
                            const main = brands.find((other) => other.name === brand.twins[0])
                            setNewName(main && main.products > brand.products ? main.name : brand.name)
                            setRenameError("")
                          }}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={adminButtonSm.icon}
                          disabled={brand.products > 0}
                          aria-label={`Видалити бренд «${brand.name}»`}
                          data-tip={brand.products > 0 ? "Бренд стоїть у товарах: його можна перейменувати, але не видалити" : "Прибрати бренд зі списку"}
                          onClick={() => {
                            setRemoving(brand)
                            setRemoveError("")
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AdminDialog
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        busy={busy === "rename"}
        title={renaming ? `Перейменувати «${renaming.name}»` : ""}
        description={
          renaming && (
            <>
              Нова назва з’явиться в усіх товарах цього бренду{renaming.products > 0 ? ` (${number.format(renaming.products)})` : ""}: у картках, на сторінках товарів і у фільтрі каталогу.
            </>
          )
        }
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setRenaming(null)} disabled={busy === "rename"}>
              Скасувати
            </button>
            <button type="button" className={adminButton.primary} onClick={() => void rename()} disabled={busy === "rename" || !newName.trim() || cleanBrandName(newName) === renaming?.name}>
              {busy === "rename" ? "Зберігаємо…" : joinTarget ? "Об’єднати бренди" : "Перейменувати"}
            </button>
          </>
        }
      >
        <Field label="Нова назва" htmlFor="brand-rename" error={renameError} hint={joinTarget ? `Бренд «${joinTarget.name}» уже є: товари обох стануть одним брендом «${joinTarget.name}».` : undefined}>
          <input
            id="brand-rename"
            className={cn(adminInput, renameError && "border-red-600")}
            value={newName}
            maxLength={BRAND_NAME_MAX}
            autoComplete="off"
            aria-invalid={renameError ? true : undefined}
            onChange={(event) => {
              setNewName(event.target.value)
              setRenameError("")
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void rename()
              }
            }}
          />
        </Field>
      </AdminDialog>

      <AdminDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        busy={busy === "remove"}
        tone="danger"
        title="Прибрати бренд зі списку?"
        description={removing && <>«{removing.name}» зникне зі списку брендів. Товарів із цим брендом немає, тож у магазині нічого не зміниться.</>}
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setRemoving(null)} disabled={busy === "remove"}>
              Скасувати
            </button>
            <button type="button" className={adminButton.dangerSolid} onClick={() => void remove()} disabled={busy === "remove"}>
              {busy === "remove" ? "Прибираємо…" : "Прибрати бренд"}
            </button>
          </>
        }
      >
        {removeError && (
          <p role="alert" className="text-sm text-red-700">
            {removeError}
          </p>
        )}
      </AdminDialog>
    </>
  )
}
