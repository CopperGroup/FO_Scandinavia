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
    <div className="flex flex-col sm:flex-row w-full gap-4 items-center">
      <div className="relative w-full flex items-center">
        {/* The existing search icon inside the input is now redundant if the button provides it */}
        {/* You can remove the absolute positioned svg here if you prefer the button to be the sole search trigger visual */}
        {/* <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div> */}
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search products"
          className="pl-10 border-gray-200 focus:border-gray-300 h-10 rounded-full flex-grow"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchClick();
            }
          }}
        />
        <Button onClick={handleSearchClick} className="ml-2 h-10 rounded-full px-4">
          <SearchIcon className="h-5 w-5" /> {/* Use the imported SearchIcon */}
        </Button>
      </div>

      <Select value={sort} onValueChange={(element: SortParams) => setSort(element)}>
        <SelectTrigger className="w-full sm:w-[180px] h-10 border-gray-200 focus:border-gray-300 rounded-full">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="low_price">Price (Low to High)</SelectItem>
            <SelectItem value="hight_price">Price (High to Low)</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export default Search