"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react"
import MultiSelect from "@/components/admin/MultiSelect"
import { AsideCard, Field, FormLayout, Panel, Pill, SaveBar, adminButton, adminButtonSm, adminInput, adminTextarea } from "@/components/admin/ui"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import { resetMenu, saveMenu } from "@/lib/actions/menu.actions"
import type { MenuConfig, MenuDepartment, MenuGroup } from "@/lib/catalog/departments"
import { GROUP_LABEL_MAX, LABEL_MAX, MAX_DEPARTMENTS, MAX_GROUPS, TEXT_MAX, TITLE_MAX, freeKey, type MenuErrors } from "@/lib/menu"
import { cn } from "@/lib/utils"

type CategoryOption = { id: string; name: string; path: string; inStock: number }

const same = (a: MenuConfig, b: MenuConfig) => JSON.stringify(a) === JSON.stringify(b)

function move<T>(list: T[], index: number, by: -1 | 1): T[] {
  const target = index + by
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** On/off switch with its label; the same control as «Продається в магазині» of a product. */
function Switch({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (next: boolean) => void; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
          checked ? "bg-black" : "bg-neutral-300",
        )}
      >
        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[1.125rem]" : "translate-x-0.5")} />
      </button>
      <div className="min-w-0">
        <label id={`${id}-label`} htmlFor={id} className="cursor-pointer text-sm font-medium text-neutral-900">
          {label}
        </label>
        <p id={`${id}-hint`} className="mt-0.5 text-xs text-neutral-500">
          {hint}
        </p>
      </div>
    </div>
  )
}

/**
 * "Меню": the departments of the shop's menu row. Each department has a name
 * and columns; each column has a name and the categories listed under it.
 * Departments and columns can be added, removed and moved; "Новинки" and
 * "Знижки" can only be shown or hidden. One form, one save; the side column
 * shows how the row will look and explains the rules, it has no controls.
 */
export default function MenuEditor({ initial, saved: savedOnce, categories, changed }: { initial: MenuConfig; saved: boolean; categories: CategoryOption[]; changed: string }) {
  const router = useRouter()
  const [menu, setMenu] = useState<MenuConfig>(initial)
  const [saved, setSaved] = useState<MenuConfig>(initial)
  const [stored, setStored] = useState(savedOnce)
  const [errors, setErrors] = useState<MenuErrors>({})
  const [formError, setFormError] = useState("")
  const [busy, setBusy] = useState<"save" | "reset" | null>(null)
  const [savedNow, setSavedNow] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)

  const dirty = !same(menu, saved)
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const options = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
        hint: [category.path || "Верхній рівень", category.inStock > 0 ? `у наявності: ${category.inStock}` : "немає товарів у наявності"].join(" · "),
      })),
    [categories],
  )

  const change = (next: MenuConfig) => {
    setMenu(next)
    setFormError("")
    setSavedNow(false)
  }
  const setDepartment = (index: number, patch: Partial<MenuDepartment>) => change({ ...menu, departments: menu.departments.map((entry, at) => (at === index ? { ...entry, ...patch } : entry)) })
  const setGroup = (index: number, groupIndex: number, patch: Partial<MenuGroup>) =>
    setDepartment(index, { groups: menu.departments[index].groups.map((group, at) => (at === groupIndex ? { ...group, ...patch } : group)) })

  const addDepartment = () =>
    change({
      ...menu,
      departments: [...menu.departments, { key: freeKey("viddil", menu.departments.map((entry) => entry.key)), label: "", title: "", text: "", groups: [{ label: "", categoryIds: [] }] }],
    })

  // Categories with products that no department lists: the shop shows them under "Інше", below the departments.
  const placed = useMemo(() => new Set(menu.departments.flatMap((entry) => entry.groups.flatMap((group) => group.categoryIds))), [menu])
  const unplaced = useMemo(() => categories.filter((category) => category.inStock > 0 && !placed.has(category.id)), [categories, placed])
  const visibleInShop = (entry: MenuDepartment) => entry.groups.some((group) => group.categoryIds.some((id) => (byId.get(id)?.inStock ?? 0) > 0))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || (!dirty && stored)) return
    setBusy("save")
    setFormError("")
    try {
      // A department gets its address from its name the first time it is saved, and keeps it afterwards.
      const taken = new Set(saved.departments.map((entry) => entry.key))
      const prepared: MenuConfig = {
        ...menu,
        departments: menu.departments.map((entry) => {
          if (taken.has(entry.key) || !entry.label.trim()) return entry
          const key = freeKey(entry.label, taken)
          taken.add(key)
          return { ...entry, key }
        }),
      }
      const result = await saveMenu(prepared)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setFormError(result.error)
        const first = Object.keys(result.errors ?? {})[0]
        if (first) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-menu-field="${first}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }))
        return
      }
      setErrors({})
      setMenu(result.menu)
      setSaved(result.menu)
      setStored(true)
      setSavedNow(true)
      router.refresh()
    } catch {
      setFormError("Не вдалося зберегти: немає зв’язку з сервером. Перевірте інтернет і натисніть «Зберегти» ще раз.")
    } finally {
      setBusy(null)
    }
  }

  const reset = async () => {
    setBusy("reset")
    try {
      const result = await resetMenu()
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      // The automatic menu is built on the server: reload the page to get it.
      window.location.reload()
    } catch {
      setFormError("Не вдалося повернути автоматичне меню. Спробуйте ще раз.")
    } finally {
      setBusy(null)
      setConfirmReset(false)
    }
  }

  let note: React.ReactNode = null
  if (formError)
    note = (
      <span role="alert" className="text-red-700">
        {formError}
      </span>
    )
  else if (dirty)
    note = (
      <span className="inline-flex items-center gap-2 text-neutral-700">
        <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-900" aria-hidden="true" />
        Є незбережені зміни
      </span>
    )
  else if (savedNow) note = <span className="text-neutral-700">Меню збережено: магазин уже показує його.</span>
  else if (!stored) note = <span className="text-neutral-700">Зараз меню складається саме. Збережіть, щоб воно стало таким, як тут.</span>

  const chip = "inline-flex h-control-sm max-w-full items-center gap-1 rounded-md border pl-2 pr-0.5 text-sm"
  const removeButton =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormLayout
        aside={
          <AsideCard title="Як виглядатиме рядок">
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
              {menu.departments.map((entry, index) => (
                <li
                  key={`${entry.key}-${index}`}
                  className={visibleInShop(entry) ? "text-neutral-900" : "text-neutral-400 line-through"}
                  data-tip={visibleInShop(entry) ? undefined : "Цього відділу в магазині не видно: у його категоріях немає товарів у наявності"}
                >
                  {entry.label.trim() || "Без назви"}
                </li>
              ))}
              {menu.showNew && <li className="text-neutral-900">Новинки</li>}
              {menu.showSale && <li className="text-red-700">Знижки</li>}
            </ul>
            <p className="text-sm text-neutral-700">Відділ видно в магазині, коли хоча б в одній його категорії є товар у наявності. Закреслених зараз не видно.</p>
            <p className="text-sm text-neutral-700">Одна категорія може стояти в кількох відділах, наприклад жіночі чоботи в «Жінкам» і у «Взутті».</p>
            <p className="text-xs text-neutral-500">Адреса відділу в магазині не змінюється, коли ви змінюєте його назву: старі посилання і позиції в пошуку залишаються.</p>
            {stored && changed && <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-500">Змінено: {changed}.</p>}
          </AsideCard>
        }
      >
        {errors.departments && (
          <p role="alert" data-menu-field="departments" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errors.departments}
          </p>
        )}

        {menu.departments.map((entry, index) => {
          const base = `departments.${index}`
          const shown = visibleInShop(entry)
          return (
            <Panel
              key={`${entry.key}-${index}`}
              title={entry.label.trim() || "Новий відділ"}
              action={
                <div className="flex items-center gap-1">
                  {!shown && <Pill tone="muted" tip="У категоріях цього відділу немає товарів у наявності, тому в меню магазину його зараз не видно">Не видно в магазині</Pill>}
                  <button type="button" className={adminButtonSm.icon} disabled={index === 0} onClick={() => change({ ...menu, departments: move(menu.departments, index, -1) })} aria-label="Перемістити відділ лівіше" data-tip="Перемістити лівіше в меню">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={adminButtonSm.icon}
                    disabled={index === menu.departments.length - 1}
                    onClick={() => change({ ...menu, departments: move(menu.departments, index, 1) })}
                    aria-label="Перемістити відділ правіше"
                    data-tip="Перемістити правіше в меню"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={adminButtonSm.icon} onClick={() => setRemoving(index)} aria-label={`Видалити відділ «${entry.label.trim() || "без назви"}»`} data-tip="Видалити відділ із меню">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Назва в меню" htmlFor={`menu-${index}-label`} error={errors[`${base}.label`]}>
                    <input
                      id={`menu-${index}-label`}
                      data-menu-field={`${base}.label`}
                      className={cn(adminInput, errors[`${base}.label`] && "border-red-600")}
                      aria-invalid={errors[`${base}.label`] ? true : undefined}
                      value={entry.label}
                      maxLength={LABEL_MAX}
                      autoComplete="off"
                      placeholder="Наприклад: Жінкам"
                      onChange={(event) => setDepartment(index, { label: event.target.value })}
                    />
                  </Field>
                  <Field
                    label="Заголовок сторінки"
                    htmlFor={`menu-${index}-title`}
                    optional
                    tip="Великий напис на сторінці відділу. Якщо ви напишете свій заголовок, він же стане назвою цієї сторінки в пошуку Google, тож пишіть, що тут продається: «Жіночий одяг і взуття». Якщо порожньо, береться назва з меню."
                  >
                    <input
                      id={`menu-${index}-title`}
                      className={adminInput}
                      value={entry.title}
                      maxLength={TITLE_MAX}
                      autoComplete="off"
                      placeholder={entry.label.trim() || "Наприклад: Все для дому"}
                      onChange={(event) => setDepartment(index, { title: event.target.value })}
                    />
                  </Field>
                </div>

                <Field
                  label="Текст на сторінці відділу"
                  htmlFor={`menu-${index}-text`}
                  optional
                  tip="Кілька речень під товарами на сторінці відділу: що тут продається, для кого. Його читають покупці і пошукові системи."
                  hint={`До ${TEXT_MAX} знаків. Порожній рядок починає новий абзац.`}
                >
                  <textarea id={`menu-${index}-text`} className={adminTextarea} value={entry.text} maxLength={TEXT_MAX} onChange={(event) => setDepartment(index, { text: event.target.value })} />
                </Field>

                <div data-menu-field={`${base}.groups`}>
                  <p className="text-sm font-medium text-neutral-900">Колонки з категоріями</p>
                  <p className="mt-1 text-xs text-neutral-500">Колонка — це підзаголовок у меню і категорії під ним.</p>
                  {errors[`${base}.groups`] && (
                    <p role="alert" className="mt-2 text-xs text-red-700">
                      {errors[`${base}.groups`]}
                    </p>
                  )}

                  <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
                    {entry.groups.map((group, groupIndex) => {
                      const groupError = errors[`${base}.groups.${groupIndex}.label`]
                      return (
                        <li key={groupIndex} className="grid gap-x-4 gap-y-2 py-3 md:grid-cols-[13rem_minmax(0,1fr)_auto] md:items-start">
                          <div>
                            <input
                              data-menu-field={`${base}.groups.${groupIndex}.label`}
                              className={cn(adminInput, groupError && "border-red-600")}
                              aria-label={`Назва колонки ${groupIndex + 1}`}
                              aria-invalid={groupError ? true : undefined}
                              value={group.label}
                              maxLength={GROUP_LABEL_MAX}
                              autoComplete="off"
                              placeholder="Назва колонки, напр. Одяг"
                              onChange={(event) => setGroup(index, groupIndex, { label: event.target.value })}
                            />
                            {groupError && (
                              <p role="alert" className="mt-1 text-xs text-red-700">
                                {groupError}
                              </p>
                            )}
                          </div>

                          <div className="flex min-h-control flex-wrap items-center gap-2">
                            {group.categoryIds.map((id) => {
                              const category = byId.get(id)
                              const name = category?.name ?? "Категорію видалено"
                              const empty = (category?.inStock ?? 0) === 0
                              return (
                                <span
                                  key={id}
                                  className={cn(chip, empty ? "border-dashed border-neutral-300 bg-neutral-50 text-neutral-500" : "border-neutral-300 bg-white")}
                                  data-tip={empty ? `${name}: немає товарів у наявності, у меню магазину її зараз не видно` : category?.path ? `${category.path} / ${name}` : name}
                                >
                                  <span className="min-w-0 truncate font-medium">{name}</span>
                                  <button
                                    type="button"
                                    className={removeButton}
                                    aria-label={`Прибрати категорію «${name}» з колонки`}
                                    onClick={() => setGroup(index, groupIndex, { categoryIds: group.categoryIds.filter((value) => value !== id) })}
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </span>
                              )
                            })}
                            <MultiSelect
                              options={options}
                              value={group.categoryIds}
                              onChange={(next) => setGroup(index, groupIndex, { categoryIds: next })}
                              searchPlaceholder="Знайдіть категорію"
                              emptyText="Такої категорії немає."
                              aria-label={`Категорії колонки «${group.label.trim() || groupIndex + 1}»`}
                              triggerClassName="inline-flex h-control-sm items-center gap-1 rounded-md border border-dashed border-neutral-400 px-2 text-sm font-medium text-neutral-900 transition-colors hover:border-black hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 data-[state=open]:border-black"
                              trigger={
                                <>
                                  <Plus className="h-4 w-4" aria-hidden="true" />
                                  Додати категорії
                                </>
                              }
                            />
                          </div>

                          <div className="flex items-center gap-1 md:h-control">
                            <button type="button" className={adminButtonSm.icon} disabled={groupIndex === 0} onClick={() => setDepartment(index, { groups: move(entry.groups, groupIndex, -1) })} aria-label="Перемістити колонку вище" data-tip="Перемістити колонку ближче до початку">
                              <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={adminButtonSm.icon}
                              disabled={groupIndex === entry.groups.length - 1}
                              onClick={() => setDepartment(index, { groups: move(entry.groups, groupIndex, 1) })}
                              aria-label="Перемістити колонку нижче"
                              data-tip="Перемістити колонку ближче до кінця"
                            >
                              <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={adminButtonSm.icon}
                              onClick={() => setDepartment(index, { groups: entry.groups.filter((_, at) => at !== groupIndex) })}
                              aria-label={`Видалити колонку «${group.label.trim() || groupIndex + 1}»`}
                              data-tip="Видалити колонку. Самі категорії й товари залишаються."
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>

                  {entry.groups.length < MAX_GROUPS && (
                    <button type="button" className={cn(adminButtonSm.secondary, "mt-3")} onClick={() => setDepartment(index, { groups: [...entry.groups, { label: "", categoryIds: [] }] })}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Додати колонку
                    </button>
                  )}
                </div>
              </div>
            </Panel>
          )
        })}

        {menu.departments.length < MAX_DEPARTMENTS && (
          <div>
            <button type="button" className={adminButton.secondary} onClick={addDepartment}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Додати відділ
            </button>
          </div>
        )}

        <Panel title="Новинки і знижки" description="Ці два пункти стоять у меню після відділів. Їх не можна видалити чи замінити, але можна сховати.">
          <div className="space-y-4">
            <Switch
              id="menu-show-new"
              checked={menu.showNew}
              onChange={(next) => change({ ...menu, showNew: next })}
              label="Показувати «Новинки»"
              hint={menu.showNew ? "У меню є пункт «Новинки»: товари, додані останніми." : "Пункту «Новинки» в меню немає. Сторінка з новинками працює за прямим посиланням."}
            />
            <Switch
              id="menu-show-sale"
              checked={menu.showSale}
              onChange={(next) => change({ ...menu, showSale: next })}
              label="Показувати «Знижки»"
              hint={menu.showSale ? "У меню є пункт «Знижки», коли хоча б один товар продається зі знижкою." : "Пункту «Знижки» в меню немає, навіть коли знижки є."}
            />
          </div>
        </Panel>

        {unplaced.length > 0 && (
          <Panel
            title="Категорії, яких немає в меню"
            description="У них є товари, але жоден відділ їх не показує. У магазині вони стоять у меню телефона після відділів і у фільтрі каталогу. Щоб додати категорію у відділ, натисніть «Додати категорії» в потрібній колонці."
            action={<Pill tone="muted">{unplaced.length}</Pill>}
          >
            <ul className="flex flex-wrap gap-2">
              {unplaced.map((category) => (
                <li key={category.id} className="inline-flex h-control-sm items-center gap-2 rounded-md border border-neutral-300 bg-white px-2 text-sm" data-tip={category.path ? `${category.path} / ${category.name}` : category.name}>
                  <span className="font-medium">{category.name}</span>
                  <span className="tabular-nums text-neutral-500">{category.inStock}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </FormLayout>

      <SaveBar
        note={<div aria-live="polite">{note}</div>}
        start={
          stored ? (
            <button type="button" className={adminButton.ghost} disabled={Boolean(busy)} onClick={() => setConfirmReset(true)} data-tip="Прибрати ваші зміни: магазин знову сам розкладатиме категорії по відділах за їхніми назвами">
              Повернути автоматичне меню…
            </button>
          ) : (
            <button type="button" className={adminButton.ghost} disabled={!dirty || Boolean(busy)} onClick={() => change(saved)}>
              Скасувати зміни
            </button>
          )
        }
      >
        <button type="submit" className={cn(adminButton.primary, "min-w-[8.25rem]")} disabled={Boolean(busy) || (!dirty && stored)}>
          {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy === "save" ? "Зберігаємо…" : dirty || !stored ? "Зберегти меню" : "Змін немає"}
        </button>
      </SaveBar>

      <AdminDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        tone="danger"
        title="Видалити відділ із меню?"
        description={
          removing !== null && (
            <>
              «{menu.departments[removing]?.label.trim() || "Без назви"}» зникне з меню після збереження. Категорії й товари залишаться; категорії, яких не буде в жодному відділі, магазин показуватиме окремо після відділів.
            </>
          )
        }
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setRemoving(null)}>
              Скасувати
            </button>
            <button
              type="button"
              className={adminButton.dangerSolid}
              onClick={() => {
                if (removing !== null) change({ ...menu, departments: menu.departments.filter((_, at) => at !== removing) })
                setRemoving(null)
              }}
            >
              Видалити відділ
            </button>
          </>
        }
      />

      <AdminDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        busy={busy === "reset"}
        tone="danger"
        title="Повернути автоматичне меню?"
        description="Ваші назви, колонки і тексти відділів буде прибрано. Магазин знову сам розкладатиме категорії по шести відділах за їхніми назвами."
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setConfirmReset(false)} disabled={busy === "reset"}>
              Скасувати
            </button>
            <button type="button" className={adminButton.dangerSolid} onClick={() => void reset()} disabled={busy === "reset"}>
              {busy === "reset" ? "Повертаємо…" : "Повернути автоматичне"}
            </button>
          </>
        }
      />
    </form>
  )
}
