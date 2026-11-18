import Link from "next/link"
import Photo from "@/components/storefront/Photo"
import type { ProductVariants, SiblingOption, VariantAxis } from "@/lib/catalog/types"
import { cn } from "@/lib/utils"

type Props = {
  variants: ProductVariants
  /** The shopper has not picked a size yet: nothing is highlighted and colour links keep asking. */
  pending: boolean
}

const productHref = (productId: string, keepAsking = false) => `/catalog/${productId}${keepAsking ? "?choose=1" : ""}`

function Siblings({ label, options, pending }: { label: string; options: SiblingOption[]; pending: boolean }) {
  const selected = options.find((option) => option.selected)

  return (
    <div>
      <p className="mb-3 text-sm text-brand-muted">
        {label}: {selected && <span className="font-semibold text-brand-ink">{selected.label}</span>}
      </p>

      <ul className="flex flex-wrap gap-2">
        {options.map((option) => (
          <li key={option.productId}>
            <Link
              href={productHref(option.productId, pending)}
              scroll={false}
              aria-current={option.selected ? "true" : undefined}
              aria-label={`${label}: ${option.label}${option.purchasable ? "" : ", немає в наявності"}`}
              title={option.label}
              className={cn(
                "relative block h-20 w-[60px] overflow-hidden rounded-sm border bg-white transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                option.selected ? "border-2 border-brand-ink" : "border-brand-line hover:border-brand-ink/50",
                !option.purchasable && "opacity-45",
              )}
            >
              {option.image ? (
                <Photo src={option.image} alt="" sizes="58px" />
              ) : (
                <span className="flex h-full items-center justify-center px-1 text-center text-xs text-brand-muted">{option.label}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Axis({ axis, pending }: { axis: VariantAxis; pending: boolean }) {
  const selected = pending ? undefined : axis.options.find((option) => option.selected)
  // Short labels (sizes) sit on an even grid; long ones wrap as pills.
  const compact = axis.options.every((option) => option.label.length <= 6)
  const soldOut = axis.options.filter((option) => !option.purchasable).length

  return (
    <div id={`variant-${axis.key}`} className="scroll-mt-32 rounded-md outline-2 outline-offset-8 outline-brand-sun data-[attention=true]:outline">
      <p className="mb-3 flex items-baseline justify-between gap-3 text-sm text-brand-muted">
        <span>
          {axis.label}:{" "}
          {selected ? <span className="font-semibold text-brand-ink">{selected.label}</span> : <span className="font-semibold text-brand-ink">оберіть</span>}
        </span>
        {soldOut > 0 && <span className="text-xs">Закреслені — немає в наявності</span>}
      </p>

      <ul className={cn("gap-2", compact ? "grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))]" : "flex flex-wrap")}>
        {axis.options.map((option) => {
          const isSelected = !pending && option.selected
          return (
            <li key={option.value}>
              <Link
                href={productHref(option.productId)}
                scroll={false}
                replace
                aria-current={isSelected ? "true" : undefined}
                aria-label={`${axis.label} ${option.label}${option.purchasable ? "" : ", немає в наявності"}`}
                title={option.purchasable ? undefined : "Немає в наявності"}
                className={cn(
                  "relative flex h-12 items-center justify-center rounded-md border text-base font-medium tabular-nums transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                  compact ? "w-full px-1" : "px-4",
                  isSelected
                    ? option.purchasable
                      ? "border-brand-ink bg-brand-ink text-white"
                      : // Chosen, but sold out: marked as the current one without looking like something to buy.
                        "border-2 border-brand-ink bg-brand-mist text-brand-muted line-through"
                    : option.purchasable
                      ? "border-brand-line bg-white text-brand-ink hover:border-brand-ink"
                      : "border-dashed border-brand-line bg-brand-mist text-brand-muted/70 line-through hover:border-brand-muted",
                )}
              >
                {option.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Size and colour choices of a product. Every option is a link to the page of
 * that variant, so a selection is shareable, crawlable and works before
 * JavaScript loads. Sizes are buttons, never a drop-down, and sold-out sizes
 * stay visible so the shopper sees at a glance what is left.
 */
export default function VariantSelector({ variants, pending }: Props) {
  const hasSiblings = variants.siblings.length > 1 && variants.siblingAxisLabel
  if (!hasSiblings && variants.axes.length === 0) return null

  return (
    <div className="space-y-6">
      {hasSiblings && <Siblings label={variants.siblingAxisLabel as string} options={variants.siblings} pending={pending} />}
      {variants.axes.map((axis) => (
        <Axis key={axis.key} axis={axis} pending={pending} />
      ))}
    </div>
  )
}
