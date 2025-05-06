"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Trash2, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { CitySelect } from "@/components/interface/nova/city-select"
import { WarehouseSelect } from "@/components/interface/nova/warehouse-select"

interface SavedLocation {
  id: string
  cityName: string
  cityRef: string
  warehouseName: string
  warehouseRef: string
}

interface NovaPoshtaModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (cityRef: string, warehouseRef: string) => void
}

export function NovaPoshtaModal({ isOpen, onClose, onGenerate }: NovaPoshtaModalProps) {
  const [cityName, setCityName] = useState("")
  const [cityRef, setCityRef] = useState("")
  const [warehouseName, setWarehouseName] = useState("")
  const [warehouseRef, setWarehouseRef] = useState("")
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [showNewLocation, setShowNewLocation] = useState(true)
  const [mounted, setMounted] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Handle mounting state for client-side rendering
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Load saved locations from local storage
  useEffect(() => {
    if (mounted) {
      const savedData = localStorage.getItem("novaPoshtaLocations")
      if (savedData) {
        try {
          const locations = JSON.parse(savedData)
          setSavedLocations(locations)

          // If we have saved locations, select the first one by default
          if (locations.length > 0 && !selectedLocationId) {
            setSelectedLocationId(locations[0].id)
            setShowNewLocation(false)
          }
        } catch (error) {
          console.error("Error parsing saved locations:", error)
        }
      }
    }
  }, [mounted, selectedLocationId])

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey)
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
      // Restore scrolling when modal is closed
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (backdropRef.current === e.target) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  // Handle animation on open/close
  useEffect(() => {
    if (isOpen && modalRef.current && backdropRef.current) {
      // Trigger animations
      backdropRef.current.classList.remove("opacity-0")
      backdropRef.current.classList.add("opacity-100")

      modalRef.current.classList.remove("opacity-0", "translate-y-4")
      modalRef.current.classList.add("opacity-100", "translate-y-0")
    }
  }, [isOpen])

  // Handle city selection
  const handleCityChange = (name: string, ref: string) => {
    setCityName(name)
    setCityRef(ref)
    setWarehouseName("")
    setWarehouseRef("")
  }

  // Handle warehouse selection
  const handleWarehouseChange = (name: string, ref: string) => {
    setWarehouseName(name)
    setWarehouseRef(ref)
  }

  // Handle saved location selection
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId)
    setShowNewLocation(false)
  }

  // Handle new location selection
  const handleNewLocationSelect = () => {
    setSelectedLocationId(null)
    setShowNewLocation(true)
    setCityName("")
    setCityRef("")
    setWarehouseName("")
    setWarehouseRef("")
  }

  // Handle generate button click
  const handleGenerate = () => {
    if (showNewLocation) {
      // Using new location
      if (cityRef && warehouseRef) {
        // Save to local storage
        const newLocation: SavedLocation = {
          id: Date.now().toString(),
          cityName,
          cityRef,
          warehouseName,
          warehouseRef,
        }

        const updatedLocations = [...savedLocations, newLocation]
        localStorage.setItem("novaPoshtaLocations", JSON.stringify(updatedLocations))

        // Call the onGenerate callback with the selected refs
        onGenerate(cityRef, warehouseRef)
        onClose()
      }
    } else {
      // Using saved location
      const location = savedLocations.find((loc) => loc.id === selectedLocationId)
      if (location) {
        // Call the onGenerate callback with the selected refs
        onGenerate(location.cityRef, location.warehouseRef)
        onClose()
      }
    }
  }

  // Handle location deletion
  const handleDeleteLocation = (e: React.MouseEvent, locationId: string) => {
    e.stopPropagation()
    const updatedLocations = savedLocations.filter((loc) => loc.id !== locationId)
    setSavedLocations(updatedLocations)
    localStorage.setItem("novaPoshtaLocations", JSON.stringify(updatedLocations))

    // If we deleted the selected location, select the first available or switch to new location
    if (locationId === selectedLocationId) {
      if (updatedLocations.length > 0) {
        setSelectedLocationId(updatedLocations[0].id)
      } else {
        setSelectedLocationId(null)
        setShowNewLocation(true)
      }
    }
  }

  const isGenerateDisabled = showNewLocation ? !cityRef || !warehouseRef : !selectedLocationId

  // Handle close with animation
  const handleCloseWithAnimation = () => {
    if (modalRef.current && backdropRef.current) {
      // Trigger closing animations
      backdropRef.current.classList.remove("opacity-100")
      backdropRef.current.classList.add("opacity-0")

      modalRef.current.classList.remove("opacity-100", "translate-y-0")
      modalRef.current.classList.add("opacity-0", "translate-y-4")

      // Delay actual closing to allow animation to complete
      setTimeout(() => {
        onClose()
      }, 200) // Match this with the transition duration
    } else {
      onClose()
    }
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-200"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md opacity-0 translate-y-4 transition-all duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
              Оберіть відділення для відправки
            </h2>
            <p className="text-sm text-slate-500">Виберіть місто та відділення Нової Пошти для формування накладної</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleCloseWithAnimation}>
            <X className="h-4 w-4" />
            <span className="sr-only">Закрити</span>
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {savedLocations.length > 0 && (
            <>
              <div className="space-y-2">
                {savedLocations.map((location) => (
                  <div
                    key={location.id}
                    className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer ${
                      selectedLocationId === location.id && !showNewLocation
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleLocationSelect(location.id)}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedLocationId === location.id && !showNewLocation ? "border-blue-500" : "border-gray-300"
                      }`}
                    >
                      {selectedLocationId === location.id && !showNewLocation && (
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{location.cityName}</p>
                      <p className="text-sm text-muted-foreground">{location.warehouseName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteLocation(e, location.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Видалити</span>
                    </Button>
                  </div>
                ))}

                <div
                  className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer ${
                    showNewLocation ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={handleNewLocationSelect}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      showNewLocation ? "border-blue-500" : "border-gray-300"
                    }`}
                  >
                    {showNewLocation && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                  </div>
                  <p className="font-medium">Додати нове відділення</p>
                </div>
              </div>

              <Separator className="my-4" />
            </>
          )}

          {showNewLocation && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">Місто</Label>
                <CitySelect value={cityName} onChange={handleCityChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse">Відділення</Label>
                <WarehouseSelect
                  cityRef={cityRef}
                  value={warehouseRef}
                  onChange={handleWarehouseChange}
                  type="Branch" // Only show branches, not poshtomats
                  disabled={!cityRef}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={handleCloseWithAnimation}>
            Скасувати
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerateDisabled}>
            Сформувати
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
