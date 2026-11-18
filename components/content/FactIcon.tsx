import { Clock, CreditCard, Gift, Heart, MessageCircle, PackageCheck, RotateCcw, ShieldCheck, Star, Truck, type LucideIcon } from "lucide-react"
import type { FactIconKey } from "@/lib/content/schema"

const ICONS: Record<FactIconKey, LucideIcon> = {
  truck: Truck,
  package: PackageCheck,
  return: RotateCcw,
  chat: MessageCircle,
  card: CreditCard,
  shield: ShieldCheck,
  clock: Clock,
  gift: Gift,
  star: Star,
  heart: Heart,
}

/** The icon of an editable "fact" (lib/content/schema.ts, FACT_ICONS). Used by the storefront and by the admin preview. */
export default function FactIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as FactIconKey] ?? Star
  return <Icon className={className} aria-hidden="true" />
}
