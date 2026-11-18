"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import toast from "react-hot-toast"
import Select from "@/components/admin/Select"
import { EmptyState, Field, Panel, Pill, adminButton } from "@/components/admin/ui"
import { AdminDialog } from "@/components/admin-components/AdminDialog"
import { addSenderBranch, removeSenderBranch, setDefaultSenderBranch } from "@/lib/actions/store.actions"

type Branch = { id: string; cityName: string; warehouseName: string }
type Option = { value: string; label: string; hint?: string }
type Load = "idle" | "loading" | "ready" | "unavailable" | "error"

/** Branches the shop sends parcels from; one is the default for new waybills. */
export function SenderBranches({ branches, defaultBranchId, apiKeySet }: { branches: Branch[]; defaultBranchId: string | null; apiKeySet: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Branch | null>(null)

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      try {
        const result = await task()
        if (!result.ok) {
          toast.error(result.error ?? "Не вдалося зберегти. Спробуйте ще раз.")
          return
        }
        toast.success(success)
        after?.()
        router.refresh()
      } catch {
        toast.error("Не вдалося зберегти. Спробуйте ще раз.")
      }
    })

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26.25rem]">
      <Panel title="Ваші відділення" description="Звідки ви відправляєте посилки. Основне підставляється в нові накладні." padded={branches.length === 0}>
        {branches.length === 0 ? (
          <EmptyState title="Відділень ще немає" text="Додайте відділення Нової пошти, з якого відправляєте замовлення. Без нього накладні не створюються." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {branches.map((branch) => {
              const isDefault = branch.id === defaultBranchId
              return (
                <li key={branch.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900">{branch.cityName}</p>
                    <p className="mt-0.5 text-sm text-neutral-600">{branch.warehouseName}</p>
                  </div>
                  {isDefault ? (
                    <Pill tone="strong">Основне</Pill>
                  ) : (
                    <button type="button" onClick={() => run(() => setDefaultSenderBranch(branch.id), "Основне відділення змінено")} disabled={pending} className={adminButton.secondary}>
                      Зробити основним
                    </button>
                  )}
                  <button type="button" onClick={() => setRemoving(branch)} disabled={pending} className={`${adminButton.ghost} text-red-700 hover:text-red-800`}>
                    Видалити
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Додати відділення">
        {adding ? (
          <AddBranchForm
            apiKeySet={apiKeySet}
            pending={pending}
            onCancel={() => setAdding(false)}
            onSave={(branch) => run(() => addSenderBranch(branch), "Відділення додано", () => setAdding(false))}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">Оберіть місто й відділення з довідника Нової пошти.</p>
            <button type="button" onClick={() => setAdding(true)} className={adminButton.primary}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Додати відділення
            </button>
          </div>
        )}
      </Panel>

      <AdminDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Видалити відділення?"
        description={removing ? `${removing.cityName}, ${removing.warehouseName}. Створені накладні не зміняться.` : undefined}
        footer={
          <>
            <button type="button" onClick={() => setRemoving(null)} className={adminButton.secondary}>
              Залишити
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => removing && run(() => removeSenderBranch(removing.id), "Відділення видалено", () => setRemoving(null))}
              className={adminButton.dangerSolid}
            >
              Видалити відділення
            </button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          {removing?.id === defaultBranchId ? "Це основне відділення: основним стане наступне у списку." : "Його можна буде додати знову будь-коли."}
        </p>
      </AdminDialog>
    </div>
  )
}

function AddBranchForm({
  apiKeySet,
  pending,
  onCancel,
  onSave,
}: {
  apiKeySet: boolean
  pending: boolean
  onCancel: () => void
  onSave: (branch: { cityName: string; cityRef: string; warehouseName: string; warehouseRef: string }) => void
}) {
  const [cities, setCities] = useState<Option[]>([])
  const [cityState, setCityState] = useState<Load>(apiKeySet ? "loading" : "unavailable")
  const [cityRef, setCityRef] = useState("")
  const [warehouses, setWarehouses] = useState<Option[]>([])
  const [warehouseState, setWarehouseState] = useState<Load>("idle")
  const [warehouseRef, setWarehouseRef] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!apiKeySet) return
    let alive = true
    fetch("/api/nova/cities")
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!alive) return
        if (response.status === 503) return setCityState("unavailable")
        if (!response.ok || !body?.success) return setCityState("error")
        setCities((body.data as { Description: string; Ref: string }[]).map((city) => ({ value: city.Ref, label: city.Description })))
        setCityState("ready")
      })
      .catch(() => alive && setCityState("error"))
    return () => {
      alive = false
    }
  }, [apiKeySet])

  useEffect(() => {
    setWarehouseRef("")
    setWarehouses([])
    if (!cityRef) return setWarehouseState("idle")
    let alive = true
    setWarehouseState("loading")
    fetch("/api/nova/warehouses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cityRef }) })
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!alive) return
        if (!response.ok || !body?.success) return setWarehouseState(response.status === 503 ? "unavailable" : "error")
        setWarehouses(
          (body.data as { Description: string; Ref: string; CategoryOfWarehouse?: string }[]).map((row) => ({
            value: row.Ref,
            label: row.Description,
            group: row.CategoryOfWarehouse === "Postomat" ? "Поштомати" : "Відділення",
          })),
        )
        setWarehouseState("ready")
      })
      .catch(() => alive && setWarehouseState("error"))
    return () => {
      alive = false
    }
  }, [cityRef])

  if (cityState === "unavailable") {
    return (
      <div className="space-y-3 text-sm">
        <p className="rounded-md bg-neutral-50 p-3 text-neutral-700">
          Довідник Нової пошти зараз недоступний: магазин не підключено до Нової пошти (на сервері не задано ключ API). Коли ключ буде задано, тут з’явиться список міст і відділень.
        </p>
        <button type="button" onClick={onCancel} className={adminButton.secondary}>
          Закрити
        </button>
      </div>
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const city = cities.find((option) => option.value === cityRef)
    const warehouse = warehouses.find((option) => option.value === warehouseRef)
    if (!city || !warehouse) {
      setError("Оберіть місто і відділення.")
      return
    }
    setError("")
    onSave({ cityName: city.label, cityRef: city.value, warehouseName: warehouse.label, warehouseRef: warehouse.value })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Місто" htmlFor="branch-city" error={cityState === "error" ? "Не вдалося завантажити міста. Спробуйте ще раз пізніше." : undefined}>
        <Select
          id="branch-city"
          options={cities}
          value={cityRef}
          onChange={setCityRef}
          searchable
          placeholder={cityState === "loading" ? "Завантажуємо міста…" : "Оберіть місто"}
          searchPlaceholder="Почніть вводити назву"
          disabled={cityState !== "ready" || pending}
        />
      </Field>
      <Field
        label="Відділення або поштомат"
        htmlFor="branch-warehouse"
        error={warehouseState === "error" || warehouseState === "unavailable" ? "Не вдалося завантажити відділення цього міста." : error || undefined}
      >
        <Select
          id="branch-warehouse"
          options={warehouses}
          value={warehouseRef}
          onChange={setWarehouseRef}
          searchable
          placeholder={!cityRef ? "Спочатку оберіть місто" : warehouseState === "loading" ? "Завантажуємо відділення…" : "Оберіть відділення"}
          searchPlaceholder="Номер або вулиця"
          disabled={warehouseState !== "ready" || pending}
        />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className={adminButton.secondary}>
          Скасувати
        </button>
        <button type="submit" disabled={pending || !warehouseRef} className={adminButton.primary}>
          Додати відділення
        </button>
      </div>
    </form>
  )
}
