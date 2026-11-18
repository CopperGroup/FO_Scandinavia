import type { Metadata } from "next"
import Select from "@/components/admin/Select"
import { AdminPage, EmptyState, Field, FormLayout, Pagination, Panel, Pill, SectionNav, StatTile, adminButton, adminInput } from "@/components/admin/ui"

export const metadata: Metadata = { title: "Елементи панелі" }

const STATUSES = [
  { value: "Pending", label: "Очікує оплати" },
  { value: "Success", label: "Оплачено" },
  { value: "Declined", label: "Оплату відхилено" },
]

const CITIES = ["Київ", "Львів", "Одеса", "Дніпро", "Харків", "Вінниця", "Хмельницький", "Запоріжжя", "Тернопіль", "Івано-Франківськ", "Луцьк", "Рівне", "Житомир", "Чернівці", "Ужгород", "Полтава", "Суми", "Черкаси", "Чернігів", "Кропивницький"].map(
  (name, index) => ({ value: String(index), label: name, hint: index % 3 === 0 ? "обласний центр" : undefined, group: index < 8 ? "Найбільші міста" : "Інші" }),
)

/**
 * Reference page of the admin panel's building blocks: what a page is made of
 * and how each piece looks. Not linked from the menu; open /admin/kit.
 */
export default function KitPage({ searchParams }: { searchParams: { page?: string; size?: string } }) {
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "5") || 5)
  const size = Number.parseInt(searchParams.size ?? "50") || 50
  const total = 3553
  const pageCount = Math.ceil(total / size)

  return (
    <AdminPage
      title="Елементи панелі"
      description="З цих частин складається кожна сторінка панелі керування."
      actions={
        <>
          <button type="button" className={adminButton.secondary}>
            Другорядна дія
          </button>
          <button type="button" className={adminButton.primary}>
            Головна дія
          </button>
        </>
      }
    >
      <SectionNav
        items={[
          { id: "kit-select", label: "Вибір зі списку" },
          { id: "kit-pagination", label: "Сторінки списку" },
          { id: "kit-form", label: "Форма" },
          { id: "kit-misc", label: "Інше" },
        ]}
      />

      <Panel id="kit-select" title="Вибір зі списку" description="Один компонент: простий список для кількох варіантів, з пошуком для довгих списків.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Короткий список" htmlFor="kit-status">
            <Select id="kit-status" options={STATUSES} defaultValue="Success" />
          </Field>
          <Field label="Довгий список із пошуком" htmlFor="kit-city" hint="Пошук з’являється сам, коли варіантів багато.">
            <Select id="kit-city" options={CITIES} placeholder="Оберіть місто" searchPlaceholder="Назва міста" clearable />
          </Field>
          <Field label="Вимкнений" htmlFor="kit-disabled">
            <Select id="kit-disabled" options={STATUSES} placeholder="Спершу оберіть місто" disabled />
          </Field>
          <Field label="З помилкою" htmlFor="kit-invalid" error="Оберіть спосіб оплати">
            <Select id="kit-invalid" options={STATUSES} invalid />
          </Field>
          <Field label="Малий розмір" htmlFor="kit-small">
            <Select id="kit-small" size="sm" options={STATUSES} defaultValue="Pending" />
          </Field>
        </div>
      </Panel>

      <Panel id="kit-pagination" title="Сторінки списку">
        <Pagination
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          total={total}
          pageSize={size}
          hrefFor={(next) => `/admin/kit?page=${next}&size=${size}#kit-pagination`}
          jump={{ action: "/admin/kit", hidden: { size: String(size) } }}
          sizes={{ options: [25, 50, 100], hrefFor: (next) => `/admin/kit?size=${next}#kit-pagination` }}
        />
      </Panel>

      <Panel id="kit-form" title="Сторінка-форма" description="Поля ліворуч, праворуч колонка, що завжди на екрані: стан і кнопка збереження.">
        <FormLayout
          aside={
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-semibold">Стан</p>
              <p className="mt-2">
                <Pill tone="ok">У продажу</Pill>
              </p>
              <button type="button" className={`${adminButton.primary} mt-4 w-full`}>
                Зберегти зміни
              </button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Назва" htmlFor="kit-name">
              <input id="kit-name" className={adminInput} defaultValue="Светр з мериносу" />
            </Field>
            <Field label="Артикул" htmlFor="kit-sku" optional>
              <input id="kit-sku" className={adminInput} placeholder="Наприклад, 1354663001" />
            </Field>
          </div>
        </FormLayout>
      </Panel>

      <Panel id="kit-misc" title="Інше">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Товарів у продажу" value="3 553" hint="з них 108 без категорії" />
          <div className="flex flex-wrap items-start gap-2">
            <Pill>Звичайний</Pill>
            <Pill tone="strong">Активний</Pill>
            <Pill tone="muted">Завершено</Pill>
            <Pill tone="ok">Оплачено</Pill>
            <Pill tone="problem">Потребує уваги</Pill>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <button type="button" className={adminButton.ghost}>
              Тиха дія
            </button>
            <button type="button" className={adminButton.danger}>
              Видалити
            </button>
          </div>
        </div>
        <div className="mt-4">
          <EmptyState title="Тут поки порожньо" text="Так виглядає порожній список: що сталося і що робити далі." />
        </div>
        {/* Room below, to see a list open upwards near the bottom of the window. */}
        <div className="mt-4 max-w-xs">
          <Field label="Список унизу вікна відкривається вгору" htmlFor="kit-bottom">
            <Select id="kit-bottom" options={CITIES} placeholder="Оберіть місто" />
          </Field>
        </div>
      </Panel>
    </AdminPage>
  )
}
