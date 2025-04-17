"use client"

import type React from "react"
import { PackageSearch, ArrowLeft, Home, Search } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Store } from "@/constants/store"
import { Metadata } from "next"

export default function ProductNotFound() {
  const [searchTerm, setSearchTerm] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      // Encode the search term for URL
      const encodedSearch = encodeURIComponent(searchTerm)
      // Use window.location for navigation instead of router
      window.location.href = `https://fo-scandinavia.vercel.app/catalog?page=1&sort=default&search=${encodedSearch}`
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-blue-100">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full">
              <PackageSearch className="h-12 w-12 text-yellow-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-blue-800 mb-2">Товар не знайдено</h1>
          <p className="text-blue-600 mb-6">
            Ми не змогли знайти товар, який ви шукаєте. Можливо, він розпроданий або більше не доступний.
          </p>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Пошук товарів..."
                className="pl-10 border-blue-200 focus:border-yellow-400 focus:ring-yellow-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 border-none">
              Шукати знову
            </Button>
          </form>

          <div className="flex gap-4 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
            <div className="flex-1">
              <Button variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => window.location.href = Store.domain}>
                <Home className="mr-2 h-4 w-4" />
                Головна
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
