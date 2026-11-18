import Link from "next/link"
import Logo from "@/components/storefront/Logo"

/**
 * Frame of the sign-in pages: the form on white, and beside it on wide
 * screens a blue field crossed by the yellow Nordic cross.
 *
 * The frame is exactly one window tall. On laptop-height windows (`short:`)
 * the spacing tightens so the whole form still fits and the page does not scroll.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="flex flex-col px-4 py-6 short:py-4 sm:px-10 lg:px-16 lg:py-10 lg:short:py-4">
        <div className="flex items-center justify-between">
          <Logo tone="dark" />
          <Link href="/catalog" className="-my-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
            До каталогу
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 short:py-2">
          <h1 className="heading-display text-2xl short:text-2xl sm:text-3xl sm:short:text-2xl">{title}</h1>
          {description && <p className="mt-3 text-base leading-6 text-brand-muted short:mt-2 short:text-sm">{description}</p>}
          <div className="mt-7 short:mt-4">{children}</div>
          {footer && <div className="mt-7 border-t border-brand-line pt-5 text-base text-brand-muted short:mt-4 short:pt-3 short:text-sm">{footer}</div>}
        </div>
      </main>

      <aside aria-hidden="true" className="relative hidden overflow-hidden bg-brand lg:block">
        <span className="absolute inset-y-0 left-[31%] w-[12%] bg-brand-sun" />
        <span className="absolute inset-x-0 top-[40%] h-[20%] bg-brand-sun" />
        <p className="absolute bottom-10 right-10 max-w-[280px] text-right font-display text-2xl font-semibold tracking-[-0.02em] text-white">
          Речі зі Скандинавії з доставкою по Україні
        </p>
      </aside>
    </div>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-md border border-brand-sale/30 bg-brand-sale-tint px-4 py-3 text-sm text-brand-sale">
      {children}
    </p>
  )
}

export function TextField({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block text-sm font-medium text-brand-ink">
      {label}
      <input {...props} className="field mt-2 font-normal short:mt-1 short:h-11" />
      {hint && <span className="mt-2 block text-sm font-normal text-brand-muted">{hint}</span>}
    </label>
  )
}

export function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-4 text-sm text-brand-muted short:my-3">
      <span className="h-px flex-1 bg-brand-line" />
      {children}
      <span className="h-px flex-1 bg-brand-line" />
    </div>
  )
}
