/** Shown inside the panel frame while a page loads: the sidebar and top bar stay put. */
export default function Loading() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-6 lg:py-6" role="status" aria-live="polite">
      <span className="sr-only">Завантаження…</span>
      <div className="h-8 w-52 animate-pulse rounded bg-neutral-100" />
      <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-neutral-100" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-md bg-neutral-100" />
        ))}
      </div>
    </div>
  )
}
