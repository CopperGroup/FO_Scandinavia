"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchPageDataByName, updatePageData } from "@/lib/actions/page.actions"

// Типи на основі наданої схеми
interface DataInput {
  name: string
  value: string
}

interface PageData {
  name: string
  dataInputs: DataInput[]
}

// Макетні дані для різних типів сторінок (Примітка: Це статичні приклади, реальні дані будуть завантажені)
export default function EditPageById({ params }: { params: { pageName: string } }) {
  const router = useRouter()
  const { pageName } = params

  const [pageData, setPageData] = useState<PageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Симуляція запиту до API
    const fetchData = async () => {
      setIsLoading(true)

      // Симуляція затримки мережі
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Отримання даних за назвою
      const result = await fetchPageDataByName({ name: pageName }, 'json')

      const data = JSON.parse(result)

      if (data) {
        setPageData(data as PageData)
      } else {
        // Якщо даних немає, використовуємо шаблон за замовчуванням
        setPageData({
          name: "Нова сторінка", // Translated from "New Page"
          dataInputs: [{ name: "content", value: "" }],
        })
      }

      setIsLoading(false)
    }

    fetchData()
  }, [pageName])

  const handleInputChange = (index: number, value: string) => {
    if (!pageData) return

    const updatedInputs = [...pageData.dataInputs]
    updatedInputs[index] = {
      ...updatedInputs[index],
      value,
    }

    setPageData({
      ...pageData,
      dataInputs: updatedInputs,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pageData) return

    setIsSubmitting(true)

    await updatePageData({ name: pageName, dataInputs: pageData.dataInputs })
    // Симуляція виклику API
    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-16">
        <div className="w-full">
          <div className="mb-6">
            <Button variant="ghost" className="flex items-center gap-2" onClick={() => router.push("/admin/pages")}>
              <ArrowLeft className="h-4 w-4" />
              Назад до сторінок {/* Kept existing Ukrainian text */}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!pageData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-16">
        <div className="w-full">
          <Card>
            <CardContent>
              <p className="text-center py-8">Сторінку не знайдено</p> {/* Translated "Page not found" */}
              <div className="flex justify-center">
                {/* Changed "Return to Dashboard" to "Back to Pages" contextually */}
                <Button onClick={() => router.push("/admin/pages")}>Повернутися до сторінок</Button> {/* Translated */}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-16">
      <div className="w-full">
        <div className="mb-6">
          <Button variant="ghost" className="flex items-center gap-2" onClick={() => router.push("/admin/pages")}>
            <ArrowLeft className="h-4 w-4" />
            Назад до сторінок {/* Translated "Back to Pages" */}
          </Button>
        </div>

        <Card>
          <CardHeader>
            {/* Translated "Edit " */}
            <CardTitle>Редагувати {pageData.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="border-t pt-4">
                  {/* Translated "Page Content" */}
                  <h3 className="text-lg font-medium mb-4">Вміст сторінки</h3>

                  {pageData.dataInputs.map((input, index) => (
                    <div key={index} className="mb-4">
                      {/* Note: input.name is dynamic. For full localization, these keys might need mapping */}
                      <Label htmlFor={`input-${index}`}>{input.name}</Label>
                      <Input
                        id={`input-${index}`}
                        value={input.value}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                     "Збереження..." // Translated "Saving..."
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Зберегти зміни {/* Translated "Save Changes" */}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}