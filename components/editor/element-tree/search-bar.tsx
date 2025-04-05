"use client"

import type React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Search elements..."
        className="pl-8 h-8 text-sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 px-2"
          onClick={() => setSearchQuery("")}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

