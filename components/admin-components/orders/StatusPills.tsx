import { Pill } from "@/components/admin/ui"
import { deliveryStatusInfo, paymentStatusInfo } from "@/lib/admin/status"

export function PaymentPill({ status }: { status: string }) {
  const info = paymentStatusInfo(status)
  return (
    <Pill tone={info.tone} tip={info.tip}>
      {info.label}
    </Pill>
  )
}

export function DeliveryPill({ status }: { status: string }) {
  const info = deliveryStatusInfo(status)
  return (
    <Pill tone={info.tone} tip={info.tip}>
      {info.label}
    </Pill>
  )
}
