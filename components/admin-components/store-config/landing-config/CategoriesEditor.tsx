"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ChevronUp, ChevronDown, Edit, Save } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"

// Simplified category type
type Subcategory = {
  name: string
  url: string
}

type Category = {
  id: string
  name: string
  image: string
  href: string
  subcategories: Subcategory[]
  featured: boolean
}

export default function CategoriesEditor() {
  const { toast } = useToast()
  // Simulate fetching categories from database
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<"category" | "subcategory" | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>({})

  // Simulate database fetch
  useEffect(() => {
    // This would be replaced with an actual API call
    setTimeout(() => {
      setCategories([
        {
          id: "1",
          name: "Одяг",
          image: "/assets/1.jpg",
          href: "/catalog?page=1&sort=default&categories=clothing",
          subcategories: [
            { name: "Жіночий одяг", url: "/catalog?page=1&sort=default&categories=womens-clothing" },
            { name: "Чоловічий одяг", url: "/catalog?page=1&sort=default&categories=mens-clothing" },
            { name: "Дитячий одяг", url: "/catalog?page=1&sort=default&categories=kids-clothing" },
          ],
          featured: true,
        },
        {
          id: "2",
          name: "Взуття",
          image: "/assets/2.jpg",
          href: "/catalog?page=1&sort=default&categories=footwear",
          subcategories: [
            { name: "Дитяче", url: "/catalog?page=1&sort=default&categories=kids-footwear" },
            { name: "Жіноче", url: "/catalog?page=1&sort=default&categories=womens-footwear" },
            { name: "Чоловіче", url: "/catalog?page=1&sort=default&categories=mens-footwear" },
          ],
          featured: false,
        },
        {
          id: "3",
          name: "Продукти",
          image: "/assets/3.jpg",
          href: "/catalog?page=1&sort=default&categories=food",
          subcategories: [
            { name: "Консерви", url: "/catalog?page=1&sort=default&categories=canned-food" },
            { name: "Напої", url: "/catalog?page=1&sort=default&categories=beverages" },
            { name: "Солодощі", url: "/catalog?page=1&sort=default&categories=sweets" },
          ],
          featured: false,
        },
        {
          id: "4",
          name: "Все для дому",
          image: "/assets/4.jpg",
          href: "/catalog?page=1&sort=default&categories=home",
          subcategories: [
            { name: "Постільна білизна", url: "/catalog?page=1&sort=default&categories=bedding" },
            { name: "Декор", url: "/catalog?page=1&sort=default&categories=decor" },
            { name: "Домашній текстиль", url: "/catalog?page=1&sort=default&categories=home-textiles" },
          ],
          featured: true,
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const handleSaveChanges = () => {
    // This would be an API call to save changes to the database
    toast({
      title: "Changes saved",
      description: "Your category changes have been saved successfully.",
    })
  }

  const startEditCategory = (category: Category) => {
    setSelectedCategory(category.id)
    setEditMode("category")
    setEditData({
      name: category.name,
      href: category.href,
      featured: category.featured,
    })
  }

  const startEditSubcategory = (categoryId: string, index: number) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return

    setSelectedCategory(categoryId)
    setEditMode("subcategory")
    setEditIndex(index)
    setEditData({
      name: category.subcategories[index].name,
      url: category.subcategories[index].url,
    })
  }

  const saveEdit = () => {
    if (!selectedCategory || !editMode) return

    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== selectedCategory) return category

        if (editMode === "category") {
          return {
            ...category,
            name: editData.name,
            href: editData.href,
            featured: editData.featured,
          }
        } else if (editMode === "subcategory" && editIndex !== null) {
          const newSubcategories = [...category.subcategories]
          newSubcategories[editIndex] = {
            name: editData.name,
            url: editData.url,
          }
          return {
            ...category,
            subcategories: newSubcategories,
          }
        }
        return category
      }),
    )

    setEditMode(null)
    setEditIndex(null)
    toast({
      title: "Item updated",
      description: `The ${editMode} has been updated successfully.`,
    })
  }

  const cancelEdit = () => {
    setEditMode(null)
    setEditIndex(null)
  }

  const moveCategory = (id: string, direction: "up" | "down") => {
    const index = categories.findIndex((c) => c.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === categories.length - 1)) return

    const newCategories = [...categories]
    const newIndex = direction === "up" ? index - 1 : index + 1
    const temp = newCategories[index]
    newCategories[index] = newCategories[newIndex]
    newCategories[newIndex] = temp
    setCategories(newCategories)
  }

  const handleImageChange = (categoryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    // In a real app, you would upload the file to your server/storage
    // Here we're just simulating with a URL
    const file = e.target.files[0]
    const imageUrl = URL.createObjectURL(file)

    setCategories((prev) =>
      prev.map((category) => {
        if (category.id === categoryId) {
          return {
            ...category,
            image: imageUrl,
          }
        }
        return category
      }),
    )

    toast({
      title: "Image updated",
      description: "The category image has been updated. Don't forget to save your changes.",
    })
  }

  if (loading) {
    return <div className="p-8 text-center">Loading categories...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Categories Section Configuration</h3>
        <Button onClick={handleSaveChanges}>
          <Save className="mr-2 h-4 w-4" />
          Save All Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {categories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-muted p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded overflow-hidden border">
                    <Image
                      src={category.image || "/placeholder.svg?height=48&width=48"}
                      alt={category.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-lg">{category.name}</h4>
                    <p className="text-sm text-muted-foreground">{category.featured ? "Featured" : "Not Featured"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => moveCategory(category.id, "up")}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => moveCategory(category.id, "down")}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startEditCategory(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedCategory === category.id && editMode === "category" ? (
                <div className="p-4 border-t">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category-name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="category-name"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category-href" className="text-right">
                        URL
                      </Label>
                      <Input
                        id="category-href"
                        value={editData.href}
                        onChange={(e) => setEditData({ ...editData, href: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category-image" className="text-right">
                        Image
                      </Label>
                      <Input
                        id="category-image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(category.id, e)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Featured</Label>
                      <div className="col-span-3">
                        <Switch
                          checked={editData.featured}
                          onCheckedChange={(checked) => setEditData({ ...editData, featured: checked })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button onClick={saveEdit}>Save Changes</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t">
                  <h5 className="font-medium mb-3">Subcategories</h5>
                  <div className="space-y-3">
                    {category.subcategories.map((subcategory, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <div>
                          <p className="font-medium">{subcategory.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">{subcategory.url}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => startEditSubcategory(category.id, index)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {selectedCategory === category.id && editMode === "subcategory" && editIndex !== null && (
                      <div className="p-4 border rounded mt-4">
                        <div className="grid gap-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subcategory-name" className="text-right">
                              Name
                            </Label>
                            <Input
                              id="subcategory-name"
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subcategory-url" className="text-right">
                              URL
                            </Label>
                            <Input
                              id="subcategory-url"
                              value={editData.url}
                              onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                              className="col-span-3"
                            />
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button variant="outline" onClick={cancelEdit}>
                              Cancel
                            </Button>
                            <Button onClick={saveEdit}>Save Changes</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

