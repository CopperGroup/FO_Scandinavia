"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { debounce } from "lodash"

type City = {
  Description: string
  Ref: string
}

interface CitySelectProps {
  value: string
  onChange: (value: string, ref: string) => void
  disabled?: boolean
}

export function CitySelect({ value, onChange, disabled = false }: CitySelectProps) {
  const [open, setOpen] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [selectedCityRef, setSelectedCityRef] = useState<string>("")

  // Fetch all cities on component mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/nova/cities")
        const result = await response.json()

        if (result.success && result.data) {
          setCities(result.data)
          // Initially show top cities or most popular
          setFilteredCities(result.data.slice(0, 10))
        }
      } catch (error) {
        console.error("Error fetching cities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [])

  // Filter cities based on search term
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (!term) {
        setFilteredCities(cities.slice(0, 10))
        return
      }

      const normalizedTerm = term.toLowerCase()
      const filtered = cities.filter((city) => city.Description.toLowerCase().includes(normalizedTerm)).slice(0, 20) // Limit results for performance

      setFilteredCities(filtered)
    }, 300),
    [cities],
  )

  useEffect(() => {
    debouncedSearch(searchTerm)
    return () => debouncedSearch.cancel()
  }, [searchTerm, debouncedSearch])

  // Find city name by value if it exists
  const selectedCity = value ? cities.find((city) => city.Description === value)?.Description : ""

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
          disabled={disabled}
        >
          {value ? selectedCity : "Виберіть місто"}
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
            placeholder="Пошук міста..."
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
              <CommandEmpty>Місто не знайдено</CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                {filteredCities.map((city) => (
                  <CommandItem
                    key={city.Ref}
                    value={city.Description}
                    onSelect={() => {
                      onChange(city.Description, city.Ref)
                      setSelectedCityRef(city.Ref)
                      setOpen(false)
                    }}
                    className="flex items-center py-2"
                  >
                    <span className="font-medium">{city.Description}</span>
                    <Check
                      className={cn("ml-auto h-4 w-4", value === city.Description ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
