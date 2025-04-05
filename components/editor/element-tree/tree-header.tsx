"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"

interface TreeHeaderProps {
  elementCount: number
}

export const TreeHeader: React.FC<TreeHeaderProps> = ({ elementCount }) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-medium text-gray-700">Element Tree</h2>
      <Badge variant="outline" className="text-xs">
        {elementCount} elements
      </Badge>
    </div>
  )
}

