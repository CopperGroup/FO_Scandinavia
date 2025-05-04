"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"

type VariantOption = {
  _id: string
  value: string
}

type SelectParams = Record<string, VariantOption[]>

type ProductVariantSelectorProps = {
  selectParams: SelectParams
  productId: string
}

export default function ProductVariantSelector({ selectParams, productId }: ProductVariantSelectorProps) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    const initialVariants: Record<string, string> = {}

    Object.entries(selectParams).forEach(([param, options]) => {
      const defaultOption = options.find((option) => option._id === productId)
      if (defaultOption) {
        initialVariants[param] = defaultOption._id
      } else if (options.length > 0) {
        initialVariants[param] = options[0]._id // Fallback to the first option
      }
    })

    setSelectedVariants(initialVariants)
  }, [selectParams, productId])

  const handleVariantChange = (param: string, value: string) => {
    setSelectedVariants((prev) => ({ ...prev, [param]: value }))
    router.push(`/catalog/${value}`)
  }

  if (Object.keys(selectedVariants).length === 0) {
    // Avoid rendering until selectedVariants is fully initialized
    return null
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {Object.entries(selectParams).map(([param, options]) => (
        <div key={param} className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium text-gray-900">{param}</label>
            <span className="text-xs text-gray-500">Обов&apos;язково</span>
          </div>

          {/* Option buttons for visual options like colors, sizes, etc. */}
          {options.length <= 5 && param.toLowerCase().includes("колір") ? (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {options.map((option) => {
                const isSelected = selectedVariants[param] === option._id
                return (
                  <button
                    key={option._id}
                    onClick={() => handleVariantChange(param, option._id)}
                    className={`relative h-8 sm:h-10 min-w-[60px] sm:min-w-[80px] px-2 sm:px-4 rounded-full border transition-all duration-200 text-xs sm:text-sm ${
                      isSelected
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                    }`}
                    aria-label={`Вибрати ${option.value}`}
                  >
                    <span>{option.value.replaceAll("_", " ")}</span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gray-900 rounded-full flex items-center justify-center border-2 border-white">
                        <Check className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <Select defaultValue={selectedVariants[param]} onValueChange={(value) => handleVariantChange(param, value)}>
              <SelectTrigger className="w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 h-10 sm:h-12 text-xs sm:text-sm">
                <SelectValue placeholder={`Виберіть ${param}`} />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                {options.map((option) => (
                  <SelectItem
                    key={option._id}
                    value={option._id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-md my-1 text-xs sm:text-sm"
                  >
                    <span>{option.value.replaceAll("_", " ")}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
    </div>
  )
}
