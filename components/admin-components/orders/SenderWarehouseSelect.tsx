"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { X, Plus, Trash2, MapPin, Building, Sparkles } from "lucide-react"
import { CitySelect } from "@/components/interface/nova/city-select"
import { WarehouseSelect } from "@/components/interface/nova/warehouse-select"
import { addWarehouse, deleteWarehouse, getWarehouses } from "@/lib/actions/store.actions"

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
  // State management
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    cityName: "",
    cityRef: "",
    warehouseName: "",
    warehouseRef: "",
  })

  // Refs for modal management
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Load saved locations on mount
  useEffect(() => {
    if (isOpen) {
      loadSavedLocations()
    }
  }, [isOpen])

  // Handle escape key and body scroll
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal()
    }

    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Handle backdrop clicks
  useEffect(() => {
    if (!isOpen) return

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === backdropRef.current) {
        closeModal()
      }
    }

    document.addEventListener("mousedown", handleBackdropClick)
    return () => document.removeEventListener("mousedown", handleBackdropClick)
  }, [isOpen])

  // Load saved locations from server
  const loadSavedLocations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getWarehouses()
      const locations: SavedLocation[] = JSON.parse(data)
      setSavedLocations(locations)

      // Auto-select first location if available
      if (locations.length > 0 && !selectedLocationId) {
        setSelectedLocationId(locations[0].id)
      }

      // Show add form if no locations exist
      if (locations.length === 0) {
        setShowAddForm(true)
      }
    } catch (err) {
      console.error("Failed to load warehouses:", err)
      setError("Не вдалося завантажити збережені відділення")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle city selection in form
  const handleCitySelect = (cityName: string, cityRef: string) => {
    setFormData((prev) => ({
      ...prev,
      cityName,
      cityRef,
      warehouseName: "",
      warehouseRef: "",
    }))
  }

  // Handle warehouse selection in form
  const handleWarehouseSelect = (warehouseName: string, warehouseRef: string) => {
    setFormData((prev) => ({
      ...prev,
      warehouseName,
      warehouseRef,
    }))
  }

  // Handle location selection from saved list
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId)
    setShowAddForm(false)
  }

  // Show add new warehouse form
  const handleShowAddForm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowAddForm(true)
    setSelectedLocationId(null)
    setFormData({
      cityName: "",
      cityRef: "",
      warehouseName: "",
      warehouseRef: "",
    })
  }

  // Hide add form
  const handleHideAddForm = () => {
    setShowAddForm(false)
    setFormData({
      cityName: "",
      cityRef: "",
      warehouseName: "",
      warehouseRef: "",
    })

    // Select first location if available
    if (savedLocations.length > 0) {
      setSelectedLocationId(savedLocations[0].id)
    }
  }

  // Delete a saved location
  const handleDeleteLocation = async (e: React.MouseEvent, locationId: string) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    try {
      await deleteWarehouse(locationId)
      await loadSavedLocations()

      // Clear selection if deleted location was selected
      if (selectedLocationId === locationId) {
        setSelectedLocationId(null)
      }
    } catch (err) {
      console.error("Failed to delete warehouse:", err)
      setError("Не вдалося видалити відділення")
    } finally {
      setIsLoading(false)
    }
  }

  // Generate waybill
  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      let cityRef = ""
      let warehouseRef = ""

      if (selectedLocationId) {
        // Use selected saved location
        const location = savedLocations.find((loc) => loc.id === selectedLocationId)
        if (location) {
          cityRef = location.cityRef
          warehouseRef = location.warehouseRef
        }
      } else if (showAddForm && formData.cityRef && formData.warehouseRef) {
        // Save new location and use it
        await addWarehouse({
          cityName: formData.cityName,
          cityRef: formData.cityRef,
          warehouseName: formData.warehouseName,
          warehouseRef: formData.warehouseRef,
        })

        cityRef = formData.cityRef
        warehouseRef = formData.warehouseRef

        // Reload locations to include the new one
        await loadSavedLocations()
      } else {
        setError("Будь ласка, оберіть або додайте відділення")
        setIsLoading(false)
        return
      }

      if (cityRef && warehouseRef) {
        onGenerate(cityRef, warehouseRef)
        closeModal()
      }
    } catch (err) {
      console.error("Failed to generate waybill:", err)
      setError("Не вдалося створити накладну")
    } finally {
      setIsLoading(false)
    }
  }

  // Close modal with animation
  const closeModal = () => {
    if (modalRef.current && backdropRef.current) {
      modalRef.current.classList.add("animate-out", "fade-out-0", "zoom-out-95")
      backdropRef.current.classList.add("animate-out", "fade-out-0")

      setTimeout(() => {
        onClose()
      }, 150)
    } else {
      onClose()
    }
  }

  // Check if generate button should be enabled
  const canGenerate = selectedLocationId || (showAddForm && formData.cityRef && formData.warehouseRef)

  if (!isOpen) return null

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    >
      <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-h-[95vh] p-4 flex justify-center">
        <div
          ref={modalRef}
          className={`bg-white border border-gray-200 shadow-2xl shadow-blue-500/5 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl flex flex-col md:flex-row overflow-hidden transition-all ${
            showAddForm ? "w-full max-w-6xl" : "w-full max-w-3xl"
          }`}
        >
          {/* Left Panel - Saved Locations */}
          <div className={`${showAddForm ? "md:w-1/2" : "w-full"} flex flex-col border-r border-gray-100`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Building className="h-5 w-5 text-blue-500" />
                  <h2 className="text-xl font-semibold text-gray-900">Мої відділення</h2>
                </div>
                <p className="text-sm text-gray-600">Оберіть збережене відділення або додайте нове</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                className="hover:bg-gray-100 transition-colors rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500"></div>
              </div>
            )}

            {/* Saved Locations List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[400px] bg-white">
              {!isLoading && savedLocations.length === 0 && (
                <div className="text-center py-12">
                  <div className="relative mb-6">
                    <Building className="h-16 w-16 text-gray-300 mx-auto" />
                    <Sparkles className="h-6 w-6 text-blue-400 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <p className="text-gray-600 mb-6 text-lg">У вас ще немає збережених відділень</p>
                  <Button
                    variant="outline"
                    onClick={handleShowAddForm}
                    className="bg-white border-gray-300 hover:bg-gray-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Додати перше відділення
                  </Button>
                </div>
              )}

              {savedLocations.map((location) => (
                <div
                  key={location.id}
                  className={`group relative border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedLocationId === location.id
                      ? "border-blue-200 bg-blue-50/30 shadow-md shadow-blue-100/30"
                      : "border-gray-200 hover:border-blue-200 bg-white hover:bg-blue-50/20"
                  }`}
                  onClick={() => handleLocationSelect(location.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedLocationId === location.id
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 group-hover:border-blue-400"
                        }`}
                      >
                        {selectedLocationId === location.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <p className="font-medium truncate text-gray-900">{location.cityName}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm text-gray-600 truncate">{location.warehouseName}</p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                      onClick={(e) => handleDeleteLocation(e, location.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-white">
              {savedLocations.length > 0 && !showAddForm && (
                <Button
                  variant="outline"
                  className="w-full mb-3 bg-white border-gray-300 hover:bg-gray-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 transition-all duration-200"
                  onClick={handleShowAddForm}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Додати нове відділення
                </Button>
              )}

              {!showAddForm && selectedLocationId && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={handleGenerate}
                  disabled={isLoading || !canGenerate}
                >
                  Створити накладну
                </Button>
              )}
            </div>
          </div>

          {/* Right Panel - Add New Warehouse Form */}
          {showAddForm && (
            <div className="md:w-1/2 flex flex-col">
              {/* Form Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Plus className="h-5 w-5 text-blue-500" />
                    <h2 className="text-xl font-semibold text-gray-900">Нове відділення</h2>
                  </div>
                  <p className="text-sm text-gray-600">Заповніть дані для додавання нового відділення</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleHideAddForm}
                  className="hover:bg-gray-100 transition-colors rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Form Content */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto min-h-[400px] bg-white">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <MapPin className="h-3 w-3 text-blue-500" />
                    <span>Місто *</span>
                  </Label>
                  <div className="relative">
                    <CitySelect value={formData.cityName} onChange={handleCitySelect} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warehouse" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Building className="h-3 w-3 text-blue-500" />
                    <span>Відділення *</span>
                  </Label>
                  <div className="relative">
                    <WarehouseSelect
                      cityRef={formData.cityRef}
                      value={formData.warehouseRef}
                      onChange={handleWarehouseSelect}
                      type="Branch"
                      disabled={!formData.cityRef}
                    />
                  </div>
                  {!formData.cityRef && (
                    <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Спочатку оберіть місто</p>
                  )}
                </div>
              </div>

              {/* Form Footer */}
              <div className="p-6 border-t border-gray-100 bg-white">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleHideAddForm}
                    disabled={isLoading}
                    className="flex-1 bg-white border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Скасувати
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading || !canGenerate}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Створити накладну
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
