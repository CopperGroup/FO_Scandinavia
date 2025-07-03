'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn, createSearchString, extractNumber, sleep } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter, useSearchParams } from "next/navigation"
import { useAppContext } from "@/app/(root)/context"
import { Button } from '../ui/button'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Link from 'next/link'
import { Slider } from '../ui/slider'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'
import ClearFilterButton from '../interface/ClearFilterButton'
import ApplyFilterButton from '../interface/ApplyFilterButton'
import { Input } from '../ui/input'
import CategoryFilterComponent from './CategoriesSelect'
import { CategoryType, FilterCategoryType, PageFilterType } from '@/lib/types/types'


interface Props {
  maxPrice: number,
  minPrice: number,
  categories: FilterCategoryType[],
  checkParams: {
    vendors: string[],
  },
  unitParams: Record<string, { totalProducts: number; type: string; min: number; max: number }>;
  selectParams: Record<string, { totalProducts: number, type: string, values: { value: string, valueTotalProducts: number }[] }>;
  category: any,
  delay: number, // This delay might be problematic if it was meant for debouncing auto-apply
  counts: {
    categoriesCount: { [key: string]: number },
    vendorsCount: { [key: string]: number },
  }
}

const checkParamsNames = ["vendors"] as const;
const checkParamsNamesUa = { vendors: "Виробник" };
type CheckParams = typeof checkParamsNames[number];

const Filter = ({ maxPrice, minPrice, categories, checkParams, selectParams, unitParams, category, delay, counts }: Props) => {
  const { catalogData, setCatalogData } = useAppContext();
  const router = useRouter();
  const search = useSearchParams();

  // Initialize filter state from URL params only once on mount
  const [filter, setFilter] = useState<PageFilterType>(() => {
    const searchParams = Object.fromEntries(search.entries());
    return {
      page: searchParams.page || "1",
      price: [
        parseFloat(searchParams.minPrice || minPrice.toString()),
        parseFloat(searchParams.maxPrice || maxPrice.toString()),
      ],
      categories: searchParams.categories ? searchParams.categories.split(",") : [],
      vendors: searchParams.vendor ? searchParams.vendor.split(',') : [],
      selectParamsValues: searchParams.selectParams ? searchParams.selectParams.split(',') : [],
      unitParamsValues: searchParams.unitParams ? searchParams.unitParams.split(',') : []
    };
  });

  // State for mobile sidebar visibility and body overflow
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const filterSidebarRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [checkParamsSearchTerms, setCheckParamsSearchTerms] = useState<{ [key: string]: string }>({});

  // Effect to set initial catalogData.sort from URL
  useEffect(() => {
    const searchParams = Object.fromEntries(search.entries());
    setCatalogData((prev: any) => ({ ...prev, sort: searchParams.sort || "default" }));
  }, [search, setCatalogData]);


  // Effect to manage body overflow based on mobile filter state
  useEffect(() => {
    // Only apply this logic on screens where the filter sidebar can hide/show
    // This is typically for mobile viewports. You might need to adjust the breakpoint.
    const isMobileView = window.innerWidth <= 768; // Example breakpoint for md
    if (isMobileView && filterSidebarRef.current) {
      if (isMobileFilterOpen) {
        document.body.style.overflow = 'hidden';
        filterSidebarRef.current.style.transform = `translateX(0%)`;
        if (filterButtonRef.current) {
          filterButtonRef.current.style.transform = `translateX(300px)`; // Move button out of view
          filterButtonRef.current.style.opacity = '0';
          filterButtonRef.current.style.pointerEvents = 'none'; // Make it unclickable when hidden
        }
      } else {
        document.body.style.overflow = 'auto';
        filterSidebarRef.current.style.transform = `translateX(-100%)`;
        if (filterButtonRef.current) {
          filterButtonRef.current.style.transform = `translateX(0px)`;
          filterButtonRef.current.style.opacity = '1';
          filterButtonRef.current.style.pointerEvents = 'auto'; // Make it clickable
        }
      }
    } else {
      // On larger screens, ensure body overflow is normal and sidebar is visible
      document.body.style.overflow = 'auto';
      if (filterSidebarRef.current) {
        filterSidebarRef.current.style.transform = `translateX(0%)`; // Ensure visible
      }
      if (filterButtonRef.current) {
        filterButtonRef.current.style.display = 'none'; // Hide button on desktop
      }
    }

    // Cleanup function: important to reset overflow when component unmounts or breakpoint changes
    return () => {
      document.body.style.overflow = 'auto';
      if (filterButtonRef.current) {
        filterButtonRef.current.style.display = 'block'; // Or whatever default it should be
        filterButtonRef.current.style.opacity = '1';
        filterButtonRef.current.style.pointerEvents = 'auto';
      }
    };
  }, [isMobileFilterOpen]); // Depend on isMobileFilterOpen to trigger this effect

  // Function to toggle the mobile filter sidebar
  const toggleMobileFilter = () => {
    setIsMobileFilterOpen(prev => !prev);
  };


  const handleApplyFilter = () => {
    const searchString = createSearchString({
      pNumber: "1", // Reset to page 1 on filter change
      sort: catalogData.sort,
      categories: filter.categories,
      vendors: filter.vendors,
      search: catalogData.search,
      price: filter.price,
      category, // Assuming 'category' is a single string/ID for the current catalog view
      minPrice, // Pass original minPrice for initial range setup
      maxPrice, // Pass original maxPrice for initial range setup
      selectParamsValues: filter.categories.length > 0 ? filter.selectParamsValues : [],
      unitParamsValues: filter.categories.length > 0 ? filter.unitParamsValues : []
    });

    router.push(`/catalog?${searchString}`);
    // Close the mobile filter after applying
    setIsMobileFilterOpen(false);
  };

  const handleChangePrice = (newValue: [number, number]) => {
    setFilter(prevFilter => ({ ...prevFilter, page: "1", price: newValue }));
  };


  const handleCheckboxChange = (checkParam: CheckParams, value: string) => {
    const isChecked = filter[checkParam].includes(value);

    setFilter((prevFilter): any => {
      if (!isChecked) {
        return { ...prevFilter, page: "1", [checkParam]: [...prevFilter[checkParam], value] };
      } else {
        return { ...prevFilter, page: "1", [checkParam]: prevFilter[checkParam].filter(param => param !== value) };
      }
    });
  };

  const handleSelectParamChange = (paramName: string, value: string) => {
    setFilter((prevFilter) => {
      // Find if the param already exists in the selectParamsValues
      const existingEntry = prevFilter.selectParamsValues.find((entry) =>
        entry.startsWith(`${paramName}--`)
      );

      let updatedParams = [...prevFilter.selectParamsValues];

      if (existingEntry) {
        // Remove the `${paramName}--` prefix and split the values by `__`
        const values = existingEntry.replace(`${paramName}--`, "").split("__");

        if (values.includes(value)) {
          // Remove the value from the array if it's already selected
          const updatedValues = values.filter((v) => v !== value);

          if (updatedValues.length > 0) {
            // Update the selectParamsValues with the modified values
            updatedParams = updatedParams.map((entry) =>
              entry.startsWith(`${paramName}--`) ? `${paramName}--${updatedValues.join("__")}` : entry
            );
          } else {
            // If no values are left, remove this param completely
            updatedParams = updatedParams.filter((entry) => !entry.startsWith(`${paramName}--`));
          }
        } else {
          // Add new value to the list if not already selected
          updatedParams = updatedParams.map((entry) =>
            entry.startsWith(`${paramName}--`) ? `${paramName}--${[...values, value].join("__")}` : entry
          );
        }
      } else {
        // If the param doesn't exist in the list, add it
        updatedParams.push(`${paramName}--${value}`);
      }

      return { ...prevFilter, page: "1", selectParamsValues: updatedParams };
    });
  };

  const handleUnitParamChange = (paramName: string, min: number, max: number) => {
    setFilter((prevFilter) => {
      const { unitParamsValues } = prevFilter;
      const existingEntryIndex = unitParamsValues.findIndex((entry) =>
        entry.startsWith(`${paramName}--`)
      );

      const paramMin = unitParams[paramName]?.min;
      const paramMax = unitParams[paramName]?.max;

      let updatedParams = [...unitParamsValues];

      if (min === paramMin && max === paramMax) {
        // Remove the param from the array if it matches the full range
        updatedParams = updatedParams.filter((entry) => !entry.startsWith(`${paramName}--`));
      } else {
        const newEntry = `${paramName}--${min}m${max}`;
        if (existingEntryIndex !== -1) {
          // Replace the existing entry
          updatedParams[existingEntryIndex] = newEntry;
        } else {
          // Add new entry
          updatedParams.push(newEntry);
        }
      }

      return { ...prevFilter, page: "1", unitParamsValues: updatedParams };
    });
  };

  const handleSearchChange = (param: string, value: string) => {
    setCheckParamsSearchTerms(prev => ({ ...prev, [param]: value }))
  }

  const filterValues = (param: CheckParams, values: string[]) => {
    const searchTerm = checkParamsSearchTerms[param] || ""
    return values.filter(value =>
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  return (
    <>
      <Button
        ref={filterButtonRef}
        onClick={toggleMobileFilter} // Use the new toggle function
        className="fixed duration-300 left-0 top-36 rounded-none rounded-r md:hidden transition-all z-50"
      >
        <i className="fa fa-filter pointer-events-none"></i>
      </Button>
      <div
        ref={filterSidebarRef}
        className='transition-all duration-300 w-[25%] border-[1.5px] shadow-small px-5 rounded-3xl max-[1023px]:w-[30%] max-[850px]:w-[35%] max-[1080px]:px-3 max-[880px]:px-2 max-md:w-[300px] max-md:rounded-l-none max-md:fixed max-md:bg-white max-md:flex max-md:flex-col justify-center z-[120] items-center max-md:overflow-y-scroll overflow-x-hidden max-md:h-full max-md:translate-x-[-100%] max-[360px]:w-full max-[360px]:rounded-none top-0 left-0'
        style={{ transform: isMobileFilterOpen ? 'translateX(0%)' : 'translateX(-100%)' }} // Control transform with state
      >
        <div className='h-full max-md:w-[270px] py-10'>
          <div className="w-full h-fit flex justify-between">
            <h2 className='text-[28px]'>Фільтр</h2>
            <Button onClick={toggleMobileFilter} className="duration-300 size-12 rounded-full md:hidden"><i className="fa fa-times pointer-events-none"></i></Button> {/* Changed to 'times' icon for closing */}
          </div>
          <div className='mt-4 pb-4 w-full'>
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-[18px] bg-zinc-100 rounded-3xl font-medium py-[6px] px-3">Ціна</AccordionTrigger>
                <AccordionContent className="flex flex-col items-center shrink-0 px-3">
                  <Slider
                    value={filter.price}
                    onValueChange={handleChangePrice} // Use the local state handler
                    max={maxPrice}
                    min={minPrice}
                    step={1}
                    className={cn("w-full mt-4")}
                  />
                  <div className='flex gap-1 justify-between mt-7 w-full'>
                    <div>
                      <label htmlFor="minPrice">Від</label>
                      <input
                        className='w-20 h-8 mt-2 text-center border flex items-center justify-center rounded-2xl'
                        onChange={(e) => handleChangePrice([e.target.value !== "₴" ? parseFloat(e.target.value.slice(1)) : 0, filter.price[1]])}
                        value={`₴${filter.price[0]}`}
                        id="minPrice"
                      />
                    </div>
                    <div>
                      <label htmlFor="maxPrice">До</label>
                      <input
                        className='w-20 h-8 mt-2 text-center border flex items-center justify-center rounded-2xl'
                        onChange={(e) => handleChangePrice([filter.price[0], e.target.value !== "₴" ? parseFloat(e.target.value.slice(1)) : 0])}
                        value={`₴${filter.price[1]}`}
                        id="maxPrice"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="space-y-3 pb-5 mt-6 md:hidden">
            <ApplyFilterButton onClick={handleApplyFilter} />
            <ClearFilterButton />
          </div>

          <div className='mt-4 pb-4 w-full min-[601px]:hidden'>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className='text-[18px] bg-zinc-100 rounded-3xl font-medium py-[6px] px-3'>Сортування</AccordionTrigger>
                <AccordionContent className="px-3">
                  <RadioGroup className="py-3" onValueChange={(element) => setCatalogData((prev: any) => ({ ...prev, sort: element }))} value={catalogData.sort}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="default" />
                      <Label htmlFor="default">Без сортування</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low_price" id="low_price" />
                      <Label htmlFor="low_price">Ціна(низька)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hight_price" id="hight_price" />
                      <Label htmlFor="hight_price">Ціна(Висока)</Label>
                    </div>
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <CategoryFilterComponent
            categories={categories}
            filter={filter}
            setFilter={setFilter}
          />
          <>
            {checkParamsNames.map((param) => (
              <div key={param} className='mt-4 pb-4 w-full'>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className='text-[18px] bg-zinc-100 rounded-3xl font-medium py-[6px] px-3'>
                      {checkParamsNamesUa[param]}
                    </AccordionTrigger>
                    <AccordionContent className="pl-3">
                      <Input
                        type="text"
                        placeholder={`Пошук ${checkParamsNamesUa[param].toLowerCase()}...`}
                        value={checkParamsSearchTerms[param] || ""}
                        onChange={(e) => handleSearchChange(param, e.target.value)}
                        className="h-8 w-11/12 text-small-medium border-0 border-b rounded-none focus-visible:ring-transparent focus-visible:border-black mt-4 mb-1"
                      />
                      <div className="max-h-[300px] overflow-y-auto">
                        {filterValues(param, checkParams[param]).map((value, index) => (
                          <div key={index} className="w-full h-fit flex justify-between items-center">
                            <div className="flex items-center space-x-2 mt-4">
                              <Checkbox
                                id={`${param}-${value}`}
                                className="size-5 rounded-md border-neutral-600 data-[state=checked]:bg-black data-[state=checked]:text-white"
                                onCheckedChange={() => handleCheckboxChange(param, value)}
                                checked={filter[param].includes(value)}
                              />
                              <label
                                htmlFor={`${param}-${value}`}
                                className="text-small-regular leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {value}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
          </>

          {Object.entries(selectParams).length > 0 &&
            <Accordion type="single" collapsible className="w-full mt-4">
              <AccordionItem value="selectParams">
                <AccordionTrigger className='text-[18px] bg-zinc-100 rounded-3xl font-medium py-[6px] px-3'>
                  Параметри
                </AccordionTrigger>
                <AccordionContent>
                  <div className='overflow-hidden'>
                    <div className='max-h-[300px] overflow-y-auto pl-2'>
                      {Object.entries(selectParams).map(([paramName, paramData]) => (
                        <div key={paramName} className='mt-4 w-full '>
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value={paramName}>
                              <AccordionTrigger className='text-[14px] bg-neutral-100 rounded-3xl font-normal py-[6px] px-3'>
                                {paramName}
                              </AccordionTrigger>
                              <AccordionContent className="pl-3 max-h-[300px] overflow-y-auto">
                                {paramData.values.map(({ value, valueTotalProducts }, index) => {
                                  // Find the existing entry for the param in selectParamsValues
                                  const existingEntry = filter.selectParamsValues.find((entry) =>
                                    entry.startsWith(`${paramName}--`)
                                  );

                                  // Initialize isChecked as false
                                  let isChecked = false;

                                  if (existingEntry) {
                                    // Remove `${paramName}--` and split by `__`
                                    const values = existingEntry.replace(`${paramName}--`, "").split("__");
                                    // Check if the value is in the list of selected values
                                    isChecked = values.includes(value);
                                  }

                                  return (
                                    <div key={index} className="w-full h-fit flex justify-between items-center">
                                      <div className="flex items-center space-x-2 mt-4">
                                        <Checkbox
                                          id={value}
                                          className="size-5 rounded-md border-neutral-600 data-[state=checked]:bg-black data-[state=checked]:text-white"
                                          onCheckedChange={() => handleSelectParamChange(paramName, value)}
                                          checked={isChecked}
                                        />
                                        <label
                                          htmlFor={value}
                                          className="text-small-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                          {value}
                                        </label>
                                      </div>
                                    </div>
                                  );
                                })}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          }

          {Object.entries(unitParams).length > 0 &&
            <>
              {Object.entries(unitParams).map(([paramName, { min, max }]) => {
                const currentEntry = filter.unitParamsValues.find((entry) => entry.startsWith(`${paramName}--`));

                let currentMin = min;
                let currentMax = max;

                if (currentEntry) {
                  const [, range] = currentEntry.split("--");
                  [currentMin, currentMax] = range.split("m").map(Number);
                }

                return (
                  <UnitSlider
                    key={paramName}
                    paramName={paramName}
                    currentMin={currentMin}
                    currentMax={currentMax}
                    minBoundary={min}
                    maxBoundary={max}
                    handleUnitParamChange={handleUnitParamChange}
                  />
                );
              })}

            </>
          }
          <div className="space-y-3 pb-5 mt-6 max-md:hidden">
            <ApplyFilterButton onClick={handleApplyFilter} />
            <ClearFilterButton />
          </div>
        </div>
      </div>
    </>
  )
}

export default Filter

const UnitSlider = ({ paramName, currentMin, currentMax, minBoundary, maxBoundary, handleUnitParamChange }: {
  paramName: string,
  currentMin: number,
  currentMax: number,
  minBoundary: number,
  maxBoundary: number,
  handleUnitParamChange: (paramName: string, min: number, max: number) => void;
}) => {

  const [sliderValues, setSliderValues] = useState<{ min: number, max: number }>({ min: currentMin, max: currentMax });

  // Update local slider values if props change (e.g., when filter is cleared or loaded from URL)
  useEffect(() => {
    setSliderValues({ min: currentMin, max: currentMax });
  }, [currentMin, currentMax]);


  const handleCommit = () => {
    handleUnitParamChange(paramName, sliderValues.min, sliderValues.max)
  }
  return (
    <div className="mt-4 pb-4 w-full" key={paramName}>
      <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-[18px] bg-zinc-100 rounded-3xl font-medium py-[6px] px-3">
            {paramName}
          </AccordionTrigger>
          <AccordionContent className="flex flex-col items-center shrink-0 px-3">
            <Slider
              value={[sliderValues.min, sliderValues.max]}
              onValueChange={([newMin, newMax]) => setSliderValues({ min: newMin, max: newMax })}
              onValueCommit={handleCommit} // Only apply filter state on commit
              max={maxBoundary}
              min={minBoundary}
              step={1}
              className="w-full mt-4"
            />

            <div className="flex justify-between mt-7 w-full">
              <FilterInput
                paramName={paramName}
                setting="min"
                currentValue={sliderValues.min} // Pass slider's current state
                minBoundary={minBoundary}
                maxBoundary={maxBoundary}
                handleUnitParamChange={handleUnitParamChange}
              />
              <FilterInput
                paramName={paramName}
                setting="max"
                currentValue={sliderValues.max} // Pass slider's current state
                minBoundary={minBoundary}
                maxBoundary={maxBoundary}
                handleUnitParamChange={handleUnitParamChange}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

const FilterInput = ({ paramName, setting, currentValue, minBoundary, maxBoundary, handleUnitParamChange }: {
  paramName: string,
  setting: "min" | "max",
  currentValue: number, // Changed to single currentValue
  minBoundary: number,
  maxBoundary: number,
  handleUnitParamChange: (paramName: string, min: number, max: number) => void;
}) => {
  const [inputValue, setInputValue] = useState<string>(currentValue.toString());

  // Update local input value if props change
  useEffect(() => {
    setInputValue(currentValue.toString());
  }, [currentValue]);


  const handleChange = (value: string) => {
    setInputValue(value);
  }

  const handleInputUnfocus = () => {
    let numericalValue = parseFloat(extractNumber(inputValue) || (setting === "min" ? minBoundary.toString() : maxBoundary.toString()));

    if (isNaN(numericalValue)) { // Handle case where extractNumber returns an empty string or non-numeric
      numericalValue = setting === "min" ? minBoundary : maxBoundary;
    } else if (numericalValue < minBoundary) {
      numericalValue = minBoundary;
    } else if (numericalValue > maxBoundary) {
      numericalValue = maxBoundary;
    }

    setInputValue(numericalValue.toString()); // Update displayed value after validation

    // Pass the correct min/max values to the parent handler
    if (setting === "min") {
      handleUnitParamChange(paramName, numericalValue, maxBoundary); // Use maxBoundary for max when setting min
    } else { // setting === "max"
      handleUnitParamChange(paramName, minBoundary, numericalValue); // Use minBoundary for min when setting max
    }
  }

  return (
    <div>
      <label htmlFor={`${setting}-${paramName}`}>{setting === "min" ? "Від" : "До"}</label>
      <input
        className="w-20 h-8 mt-2 text-center border flex items-center justify-center rounded-2xl"
        value={inputValue}
        onChange={(e) => handleChange(e.currentTarget.value)}
        onBlur={handleInputUnfocus}
        id={`${setting}-${paramName}`}
      />
    </div>
  );
};