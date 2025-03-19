"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export type Category = {
  name: string
  categoryId: string
}

interface CategorySelectProps {
  form: any
  categories: Category[]
}

export function CategorySelect({ form, categories }: CategorySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [newCategory, setNewCategory] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  // Get the current value of the category field (array of strings)
  const selectedCategories = form.watch("category") || []

  // Filter categories based on search query
  const filteredCategories = React.useMemo(() => {
    setIsLoading(true)
    const result = categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedCategories.includes(cat.categoryId),
    )
    setIsLoading(false)
    return result
  }, [categories, searchQuery, selectedCategories])

  // Add a category to the selection
  const addCategory = (categoryId: string) => {
    const currentCategories = [...selectedCategories]
    if (!currentCategories.includes(categoryId)) {
      form.setValue("category", [...currentCategories, categoryId])
    }
  }

  // Remove a category from the selection
  const removeCategory = (categoryId: string) => {
    const currentCategories = [...selectedCategories]
    form.setValue(
      "category",
      currentCategories.filter((id) => id !== categoryId),
    )
  }

  // Add a new custom category
  const addNewCategory = () => {
    if (newCategory.trim() === "") return

    // Check if this category name already exists
    const existingCategory = categories.find((cat) => cat.name.toLowerCase() === newCategory.toLowerCase())

    if (existingCategory) {
      // If it exists, add its ID
      addCategory(existingCategory.categoryId)
    } else {
      // If it's new, add the name directly (you'll need to handle this on the backend)
      addCategory(newCategory)
    }

    setNewCategory("")
  }

  return (
    <div className="w-full h-fit pl-4 pr-5 py-4 border rounded-2xl">
      <h4 className="w-full text-base-semibold text-[15px] mb-4">Категорія</h4>

      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className="text-small-medium text-[14px] text-dark-1">
              Категорії товару<span className="text-subtle-medium"> *</span>
            </FormLabel>

            {/* Display selected categories as badges */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedCategories.map((categoryId: string) => {
                  // Find the category name (if it's an existing category)
                  const category = categories.find((cat) => cat.categoryId === categoryId)
                  const displayName = category ? category.name : categoryId

                  return (
                    <Badge key={categoryId} variant="secondary" className="px-2 py-1">
                      {displayName}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeCategory(categoryId)} />
                    </Badge>
                  )
                })}
              </div>
            )}

            {/* Searchable dropdown for existing categories */}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-[13px] text-gray-700 font-normal bg-neutral-100"
                  >
                    <span className="truncate">
                      {selectedCategories.length > 0
                        ? `${selectedCategories.length} ${selectedCategories.length === 1 ? "категорія" : "категорій"} вибрано`
                        : "Виберіть категорії"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>

              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 min-h-[260px] bg-white">
                <Command className="w-full">
                  <CommandInput placeholder="Пошук категорій..." onValueChange={setSearchQuery} />

                  {/* Add new category input */}
                  <div className="flex items-center p-2 border-b">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Додати нову категорію"
                      className="flex-1 h-8 text-small-regular"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={addNewCategory}
                      disabled={!newCategory.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <CommandList>
                    {isLoading ? (
                      <CommandItem className="justify-center">
                        <span className="animate-spin mr-2">⏳</span>
                        Завантаження...
                      </CommandItem>
                    ) : filteredCategories.length === 0 ? (
                      <CommandEmpty>Категорій не знайдено.</CommandEmpty>
                    ) : (
                      <CommandGroup className="max-h-[200px] overflow-y-auto">
                        {filteredCategories.map((category) => (
                          <CommandItem
                            key={category.categoryId}
                            onSelect={() => {
                              addCategory(category.categoryId)
                              setSearchQuery("")
                            }}
                            className="flex items-center"
                          >
                            <div className="mr-2 h-4 w-4 flex-shrink-0 flex items-center justify-center border rounded">
                              {selectedCategories.includes(category.categoryId) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="truncate">{category.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

