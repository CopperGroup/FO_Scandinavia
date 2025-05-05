"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Warehouse = {
  Description: string
  Ref: string
  Number: string
  TypeOfWarehouse: string
  WarehouseIndex?: string
  CategoryOfWarehouse?: string
}

interface WarehouseSelectProps {
  cityRef: string
  value: string
  onChange: (value: string, ref: string, index?: string) => void
  disabled?: boolean
  type?: "Branch" | "Postomat" | "All"
}

export function WarehouseSelect({ cityRef, value, onChange, disabled = false, type = "All" }: WarehouseSelectProps) {
  const [open, setOpen] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [filteredWarehouses, setFilteredWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch warehouses when cityRef changes
  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!cityRef) {
        console.log("No cityRef provided, skipping warehouse fetch")
        return
      }

      console.log("Fetching warehouses for cityRef:", cityRef)
      try {
        setLoading(true)
        const response = await fetch("/api/nova/warehouses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cityRef }),
          cache: "no-store",
        })

        const result = await response.json()
        console.log("Warehouse API response:", result)

        if (result.success && result.data) {
          let warehouseData = result.data

          console.log("Warehouse data before filtering:", warehouseData)

          // Filter by warehouse type if specified
          if (type !== "All") {
            // Nova Poshta API returns different TypeOfWarehouse values than expected
            // We need to check CategoryOfWarehouse or other properties
            if (type === "Postomat") {
              warehouseData = warehouseData.filter(
                (warehouse: Warehouse) =>
                  warehouse.CategoryOfWarehouse === "Postomat" ||
                  warehouse.Description.toLowerCase().includes("поштомат"),
              )
            } else if (type === "Branch") {
              warehouseData = warehouseData.filter(
                (warehouse: Warehouse) =>
                  warehouse.CategoryOfWarehouse === "Store" ||
                  warehouse.CategoryOfWarehouse === "Branch" ||
                  (!warehouse.Description.toLowerCase().includes("поштомат") &&
                    !warehouse.CategoryOfWarehouse?.includes("Postomat")),
              )
            }
          }

          console.log("Filtered warehouse data:", warehouseData)

          setWarehouses(warehouseData)
          setFilteredWarehouses(warehouseData.slice(0, 10))
        } else {
          console.log("No warehouses found or API error:", result)
          setWarehouses([])
          setFilteredWarehouses([])
        }
      } catch (error) {
        console.error("Error fetching warehouses:", error)
        setWarehouses([])
        setFilteredWarehouses([])
      } finally {
        setLoading(false)
      }
    }

    fetchWarehouses()
  }, [cityRef, type])

  // Filter warehouses based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredWarehouses(warehouses.slice(0, 10))
      return
    }

    const normalizedTerm = searchTerm.toLowerCase()
    const filtered = warehouses
      .filter(
        (warehouse) =>
          warehouse.Description.toLowerCase().includes(normalizedTerm) ||
          warehouse.Number.toString().includes(normalizedTerm),
      )
      .slice(0, 20) // Limit results for performance

    setFilteredWarehouses(filtered)
  }, [searchTerm, warehouses])

  // Find warehouse name by value if it exists
  const selectedWarehouse = value ? warehouses.find((warehouse) => warehouse.Ref === value)?.Description : ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between rounded-xl border-gray-200 bg-white text-left font-normal shadow-sm transition-all",
            !value && "text-muted-foreground",
          )}
          disabled={disabled || !cityRef}
        >
          {value ? selectedWarehouse : cityRef ? "Виберіть відділення" : "Спочатку виберіть місто"}
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 shadow-md">
        <Command>
          <CommandInput
            placeholder="Пошук відділення..."
            className="h-10"
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <CommandList>
              {warehouses.length === 0 ? (
                <CommandEmpty>Відділення не знайдено</CommandEmpty>
              ) : filteredWarehouses.length === 0 ? (
                <CommandEmpty>Відділення не знайдено за запитом</CommandEmpty>
              ) : (
                <CommandGroup className="max-h-60 overflow-y-auto">
                  {filteredWarehouses.map((warehouse) => (
                    <CommandItem
                      key={warehouse.Ref}
                      value={warehouse.Description}
                      onSelect={() => {
                        onChange(warehouse.Description, warehouse.Ref, warehouse.WarehouseIndex)
                        setOpen(false)
                      }}
                      className="flex items-center py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{warehouse.Description}</span>
                        <span className="text-xs text-muted-foreground">
                          {warehouse.CategoryOfWarehouse === "Postomat" ||
                          warehouse.Description.toLowerCase().includes("поштомат")
                            ? "Поштомат"
                            : "Відділення"}{" "}
                          №{warehouse.Number}
                        </span>
                      </div>
                      <Check
                        className={cn("ml-auto h-4 w-4", value === warehouse.Description ? "opacity-100" : "opacity-0")}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
