import { FileQuestion, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"
import { Store } from "@/constants/store"

export const metadata: Metadata = {
  title: `404 - ${Store.name}`,
  other: {
    isNotFoundPage: "true",
  },
}

export default function NotFound() {

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 p-4">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-blue-100">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full">
              <FileQuestion className="h-12 w-12 text-yellow-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-blue-800 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Сторінку не знайдено</h2>

          <p className="text-blue-600 mb-8">Вибачте, сторінка, яку ви шукаєте, не існує або була переміщена.</p>

          <div className="flex justify-center">
            <a href="https://fo-scandinavia.vercel.app/" className="w-full max-w-xs">
              <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 border-none">
                <Home className="mr-2 h-4 w-4" />
                На головну сторінку
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-6 text-blue-500 text-sm">Код помилки: 404 | Сторінку не знайдено</div>
      </div>
    </div>
  )
}
