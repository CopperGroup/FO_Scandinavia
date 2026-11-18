"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Panel, StatTile, adminButton, adminTable } from "@/components/admin/ui"
import { cn } from "@/lib/utils"
import type { JobProgress } from "@/lib/import/types"

const STAGE_LABEL: Record<JobProgress["stage"], string> = {
  categories: "Створюємо нові категорії",
  products: "Записуємо товари",
  missing: "Обробляємо товари, яких немає у файлі",
  finishing: "Оновлюємо вітрину магазину",
  done: "Готово",
  failed: "Імпорт зупинився",
}

const MISSING_RESULT = {
  keep: "Товари з минулих імпортів, яких немає в цьому файлі, залишилися без змін.",
  unavailable: "Знято з продажу товарів, яких немає у файлі",
  delete: "Видалено товарів, яких немає у файлі",
} as const

const number = (value: number) => value.toLocaleString("uk-UA")

function duration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  return seconds < 60 ? `${seconds} с` : `${Math.floor(seconds / 60)} хв ${seconds % 60} с`
}

export default function ImportStep({
  progress,
  error,
  running,
  onContinue,
  onRestart,
}: {
  progress: JobProgress | null
  error: string | null
  running: boolean
  onContinue: () => void
  onRestart: () => void
}) {
  if (!progress) {
    return (
      <Panel title="Готуємо імпорт">
        {error ? (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
            <button type="button" className={adminButton.secondary} onClick={onRestart}>
              Почати спочатку
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-neutral-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Ще раз порівнюємо файл із товарами в магазині, щоб нічого не загубити…
          </p>
        )}
      </Panel>
    )
  }

  const report = progress.report
  if (progress.stage === "done" && report) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile label="Створено" value={number(report.created)} />
          <StatTile label="Оновлено" value={number(report.updated)} />
          <StatTile label="Без змін" value={number(report.unchanged)} />
          <StatTile label="Пропущено" value={number(report.skipped)} />
          <StatTile label="Не записалося" value={number(report.failed.length)} />
        </div>

        <Panel title="Імпорт завершено" description={`Зайняло ${duration(report.ms)}. Покупці побачать зміни, щойно відкриють або оновлять сторінку магазину.`}>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>Нових категорій: {number(report.categoriesCreated)}</li>
            <li>
              {report.missingMode === "keep" ? MISSING_RESULT.keep : `${MISSING_RESULT[report.missingMode]}: ${number(report.missingHandled)}`}
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/products" className={adminButton.primary}>
              Перейти до товарів
            </Link>
            <button type="button" className={adminButton.secondary} onClick={onRestart}>
              Імпортувати ще один файл
            </button>
          </div>
        </Panel>

        {report.failed.length > 0 && (
          <Panel title="Не вдалося записати" description="Ці товари не змінилися. Виправте їх у файлі постачальника і завантажте файл ще раз." padded={false}>
            <div className={cn(adminTable.wrap, "px-4")}>
              <table className={adminTable.table}>
                <thead>
                  <tr className={adminTable.headRow}>
                    <th scope="col" className={adminTable.th}>Артикул</th>
                    <th scope="col" className={adminTable.th}>Товар</th>
                    <th scope="col" className={adminTable.th}>Причина</th>
                  </tr>
                </thead>
                <tbody>
                  {report.failed.map((entry) => (
                    <tr key={entry.key} className={adminTable.row}>
                      <td className={cn(adminTable.td, "whitespace-nowrap")}>{entry.key}</td>
                      <td className={adminTable.td}>{entry.name}</td>
                      <td className={cn(adminTable.td, "text-red-700")}>{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    )
  }

  const total = Math.max(progress.total, 1)
  const fraction = progress.stage === "categories" ? 0 : progress.stage === "products" ? progress.done / total : 1
  const failed = progress.stage === "failed"
  const problem = error ?? progress.error

  return (
    <Panel title={STAGE_LABEL[progress.stage]} description="Не закривайте цю сторінку, доки імпорт не завершиться. Якщо закриєте, його можна буде продовжити з того самого місця.">
      <div
        role="progressbar"
        aria-label="Хід імпорту"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
        className="h-2 overflow-hidden rounded-full bg-neutral-100"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300", failed ? "bg-red-600" : "bg-black")} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
      <p className="mt-3 text-sm tabular-nums text-neutral-600">
        {progress.total > 0 ? `Записано частин: ${progress.done} з ${progress.total} (у кожній до 250 товарів)` : "Нових і змінених товарів немає"}
      </p>

      {problem && (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-sm text-red-700">
            {problem}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={adminButton.primary} onClick={onContinue} disabled={running}>
              Продовжити імпорт
            </button>
            <button type="button" className={adminButton.secondary} onClick={onRestart} disabled={running}>
              Почати спочатку
            </button>
          </div>
        </div>
      )}

      {!problem && !running && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-neutral-700">Імпорт не завершився: сторінку закрили раніше. Уже записані товари збережено, решту можна дописати.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={adminButton.primary} onClick={onContinue}>
              Продовжити імпорт
            </button>
            <button type="button" className={adminButton.secondary} onClick={onRestart}>
              Почати спочатку
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}
