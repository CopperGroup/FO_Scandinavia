const number = new Intl.NumberFormat("uk-UA")

/** "26–50 з 177, сторінка 2 з 8" above a long table, so the position is visible without scrolling to the pager. */
export function ListPosition({ page, pageSize, total, pageCount }: { page: number; pageSize: number; total: number; pageCount: number }) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <p className="text-sm tabular-nums text-neutral-500">
      {number.format(from)}–{number.format(to)} з {number.format(total)}
      {pageCount > 1 ? `, сторінка ${page} з ${pageCount}` : ""}
    </p>
  )
}
