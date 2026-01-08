"use client"

import { Store } from "@/constants/store"

interface FreeDeliveryProgressProps {
  currentAmount: number
  threshold?: number
}

const FreeDeliveryProgress = ({ currentAmount, threshold = Store.freeDelivery }: FreeDeliveryProgressProps) => {
  const progress = Math.min((currentAmount / threshold) * 100, 100)
  const remaining = threshold - currentAmount
  const isFreeDelivery = currentAmount >= threshold

  return (
    <div className="bg-[#f8f8fa] rounded-xl sm:rounded-2xl p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
        <span className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-0">Безкоштовна доставка</span>
        <span className="text-xs sm:text-sm text-gray-500">
          {currentAmount.toFixed(0)} / {threshold} {Store.currency_sign}
        </span>
      </div>
      <div className="h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isFreeDelivery ? "bg-green-600" : "bg-blue-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {remaining > 0 ? (
        <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">
          Додайте ще {remaining.toFixed(0)} {Store.currency_sign} для безкоштовної доставки
        </p>
      ) : (
        <p className="text-[10px] sm:text-xs font-medium text-gray-900 mt-1.5 sm:mt-2">
          Ви отримали безкоштовну доставку! 🎉
        </p>
      )}
    </div>
  )
}

export default FreeDeliveryProgress

