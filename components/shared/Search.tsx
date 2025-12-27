"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { useDebounce } from "use-debounce"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppContext } from "@/app/(root)/context"
import { trackFacebookEvent } from "@/helpers/pixel"
import { Button } from "@/components/ui/button"
import { Search as SearchIcon } from "lucide-react" // Import Search icon from lucide-react

type SortParams = "default" | "low_price" | "hight_price"

const Search = ({ initialSearchText = "" }: { initialSearchText: string }) => {
  const { catalogData, setCatalogData } = useAppContext()
  const [sort, setSort] = useState<SortParams>(catalogData.sort)
  const [searchText, setSearchText] = useState<string>(initialSearchText)
  const [debounce] = useDebounce(searchText, 0)

  useEffect(() => {
    setCatalogData({ ...catalogData, search: debounce, sort: sort })

    if (searchText.trim() != "") {
      trackFacebookEvent("Search", {
        search_string: debounce,
      })
    }
  }, [debounce, sort])

  const handleSearchClick = () => {
    setCatalogData((prev: any) => ({ ...prev, search: searchText }));
    
  };

  return (
    <div className="flex flex-col sm:flex-row w-full gap-3 items-center">
      <div className="relative w-full flex items-center group">
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#006AA7]/5 via-transparent to-[#FECC02]/5 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-xl"></div>
        
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 group-focus-within:text-[#006AA7] transition-colors duration-300">
          <SearchIcon className="h-5 w-5" />
        </div>
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Пошук товарів..."
          className="pl-10 pr-4 border-slate-200 focus:border-[#006AA7] focus:ring-2 focus:ring-[#006AA7]/20 h-11 rounded-full flex-grow shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md focus:shadow-lg"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchClick();
            }
          }}
        />
        <Button 
          onClick={handleSearchClick} 
          className="ml-2 h-11 rounded-full px-5 bg-gradient-to-r from-[#006AA7] to-[#005a8e] hover:from-[#005a8e] hover:to-[#004d7a] text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <SearchIcon className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline font-medium">Пошук</span>
        </Button>
      </div>

      <Select value={sort} onValueChange={(element: SortParams) => setSort(element)}>
        <SelectTrigger className="w-full sm:w-[180px] h-11 border-slate-200 focus:border-[#006AA7] focus:ring-2 focus:ring-[#006AA7]/20 rounded-full shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
          <SelectValue placeholder="Сортування" />
        </SelectTrigger>
        <SelectContent className="rounded-xl shadow-xl border-slate-200">
          <SelectGroup>
            <SelectItem value="default" className="rounded-lg">За замовчуванням</SelectItem>
            <SelectItem value="low_price" className="rounded-lg">Ціна: від низької до високої</SelectItem>
            <SelectItem value="hight_price" className="rounded-lg">Ціна: від високої до низької</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export default Search