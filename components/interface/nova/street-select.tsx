"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { debounce } from "lodash"

type Street = {
  Description: string
  Ref: string
  StreetsTypeRef: string
  StreetsType: string
}

interface StreetSelectProps {
  cityRef: string
  value: string
  onChange: (value: string, ref: string) => void
  disabled?: boolean
}

export function StreetSelect({ cityRef, value, onChange, disabled = false }: StreetSelectProps) {
  const [open, setOpen] = useState(false)
  const [streets, setStreets] = useState<Street[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!cityRef || term.length < 1) return

      try {
        setLoading(true)
        const response = await fetch("/api/nova/streets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cityRef,
            searchString: term,
          }),
        })

        const result = await response.json()

        if (result.success && result.data) {
          setStreets(result.data)
        } else {
          setStreets([])
        }
      } catch (error) {
        console.error("Error fetching streets:", error)
        setStreets([])
      } finally {
        setLoading(false)
      }
    }, 300),
    [cityRef],
  )

  // Trigger search when search term changes
  useEffect(() => {
    if (searchTerm.length >= 1) {
      debouncedSearch(searchTerm)
    } else if (searchTerm.length === 0) {
      setStreets([])
    }

    return () => debouncedSearch.cancel()
  }, [searchTerm, debouncedSearch])

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
          {value ? value : cityRef ? "Введіть назву вулиці" : "Спочатку виберіть місто"}
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
            placeholder="Пошук вулиці..."
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
              {streets.length === 0 && searchTerm.length >= 1 ? (
                <CommandEmpty>Вулиці не знайдено</CommandEmpty>
              ) : searchTerm.length < 1 ? (
                <CommandEmpty>Введіть мінімум 1 символ для пошуку</CommandEmpty>
              ) : (
                <CommandGroup className="max-h-60 overflow-y-auto">
                  {streets.map((street) => (
                    <CommandItem
                      key={street.Ref}
                      value={street.Description}
                      onSelect={() => {
                        onChange(`${street.StreetsType} ${street.Description}`, street.Ref)
                        setOpen(false)
                      }}
                      className="flex items-center py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {street.StreetsType} {street.Description}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === `${street.StreetsType} ${street.Description}` ? "opacity-100" : "opacity-0",
                        )}
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
