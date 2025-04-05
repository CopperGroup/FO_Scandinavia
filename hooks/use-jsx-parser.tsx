"use client"

import { useState, useEffect, useCallback } from "react"
import type { ParsedElement } from "@/types/editor"

export function useJsxParser(initialContent: string) {
  const [content, setContent] = useState(initialContent)
  const [parsedContent, setParsedContent] = useState<ParsedElement | null>(null)

  // This is a simplified parser for demonstration
  const simpleParse = useCallback(
    (jsxString: string): ParsedElement => {
      // If we already have parsed content and it's not the initial render,
      // return the existing parsed content to preserve user changes
      if (parsedContent) {
        return parsedContent
      }

      // Otherwise, create a mock parsed structure
      const mockParsed = createMockParsedStructure(jsxString)
      return mockParsed
    },
    [parsedContent],
  )

  // Create a static reference to store the latest parsed content
  let latestParsedContent: ParsedElement | null = null

  // Update the createMockParsedStructure function to examine the working GitHub icon
  const createMockParsedStructure = (jsxString: string): ParsedElement => {
    // If we already have parsed content, return it to preserve user changes
    if (latestParsedContent) {
      return latestParsedContent
    }

    // This is the initial mock implementation for demonstration
    const initialStructure = {
      "id": "root",
      "type": "section",
      "parent": null,
      "className": "w-full bg-gradient-to-b from-white to-[#f9fafb] py-20 relative overflow-hidden -mt-28",
      "children": [
        {
          "id": "categories",
          "type": "div",
          "parent": "section-0",
          "className": "container mx-auto px-4 sm:px-6 lg:px-8 relative z-10",
          "children": [
            {
              "id": "div-1",
              "type": "div",
              "parent": "categories",
              "className": "grid grid-cols-12 gap-6 lg:gap-8",
              "children": [
                {
                  "id": "div-2",
                  "type": "div",
                  "parent": "div-1",
                  "className": "col-span-12 lg:col-span-7 relative",
                  "children": [
                    {
                      "id": "div-3",
                      "type": "div",
                      "parent": "div-2",
                      "className": "bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]",
                      "children": [
                        {
                          "id": "div-4",
                          "type": "div",
                          "parent": "div-3",
                          "className": "flex flex-col lg:flex-row h-full",
                          "children": [
                            {
                              "id": "div-5",
                              "type": "div",
                              "parent": "div-4",
                              "className": "lg:w-3/5 relative",
                              "children": [
                                {
                                  "id": "link-6",
                                  "type": "Link",
                                  "parent": "div-5",
                                  "className": "block h-full",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "div-7",
                                      "type": "div",
                                      "parent": "link-6",
                                      "className": "relative h-72 lg:h-full overflow-hidden",
                                      "children": [
                                        {
                                          "id": "image-8",
                                          "type": "Image",
                                          "parent": "div-7",
                                          "className": "object-cover transition-transform duration-700 ease-out hover:scale-105",
                                          "attributes": {
                                            "src": "/assets/3.jpg",
                                            "alt": "Продукти",
                                            "fill": "true",
                                            "sizes": "(max-width: 768px) 100vw, 50vw",
                                            "priority": "true"
                                          },
                                          "componentInfo": {
                                            "isComponent": true,
                                            "packageName": "next/image",
                                            "importName": "Image",
                                            "importType": "default"
                                          }
                                        },
                                        {
                                          "id": "div-9",
                                          "type": "div",
                                          "parent": "div-7",
                                          "className": "absolute inset-0 bg-gradient-to-r from-[#006AA7]/80 via-[#006AA7]/40 to-transparent"
                                        },
                                        {
                                          "id": "div-10",
                                          "type": "div",
                                          "parent": "div-7",
                                          "className": "absolute bottom-0 left-0 p-8",
                                          "children": [
                                            {
                                              "id": "div-11",
                                              "type": "div",
                                              "parent": "div-10",
                                              "className": "flex items-center mb-3",
                                              "children": [
                                                {
                                                  "id": "div-12",
                                                  "type": "div",
                                                  "parent": "div-11",
                                                  "className": "w-8 h-1 bg-[#FECC02] mr-3"
                                                },
                                                {
                                                  "id": "span-13",
                                                  "type": "span",
                                                  "parent": "div-11",
                                                  "className": "text-small-semibold uppercase tracking-wider text-white opacity-90",
                                                  "textContent": "Категорія"
                                                }
                                              ]
                                            },
                                            {
                                              "id": "h3-14",
                                              "type": "h3",
                                              "parent": "div-10",
                                              "className": "text-heading2-bold text-white mb-2 drop-shadow-sm",
                                              "textContent": "Продукти"
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "id": "div-15",
                              "type": "div",
                              "parent": "div-4",
                              "className": "lg:w-2/5 p-8 flex flex-col justify-center",
                              "children": [
                                {
                                  "id": "div-16",
                                  "type": "div",
                                  "parent": "div-15",
                                  "className": "space-y-4 mb-6",
                                  "children": [
                                    {
                                      "id": "link-17",
                                      "type": "Link",
                                      "parent": "div-16",
                                      "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                      "attributes": {
                                        "href": "/catalog"
                                      },
                                      "componentInfo": {
                                        "isComponent": true,
                                        "packageName": "next/link",
                                        "importName": "Link",
                                        "importType": "default"
                                      },
                                      "children": [
                                        {
                                          "id": "span-18",
                                          "type": "span",
                                          "parent": "link-17",
                                          "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                          "children": [
                                            {
                                              "id": "chevronright-19",
                                              "type": "ChevronRight",
                                              "parent": "span-18",
                                              "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                              "componentInfo": {
                                                "isComponent": true,
                                                "packageName": "@/components/ui",
                                                "importName": "ChevronRight",
                                                "importType": "named"
                                              }
                                            }
                                          ]
                                        },
                                        {
                                          "id": "span-20",
                                          "type": "span",
                                          "parent": "link-17",
                                          "textContent": "Консерви"
                                        }
                                      ]
                                    },
                                    {
                                      "id": "link-21",
                                      "type": "Link",
                                      "parent": "div-16",
                                      "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                      "attributes": {
                                        "href": "/catalog"
                                      },
                                      "componentInfo": {
                                        "isComponent": true,
                                        "packageName": "next/link",
                                        "importName": "Link",
                                        "importType": "default"
                                      },
                                      "children": [
                                        {
                                          "id": "span-22",
                                          "type": "span",
                                          "parent": "link-21",
                                          "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                          "children": [
                                            {
                                              "id": "chevronright-23",
                                              "type": "ChevronRight",
                                              "parent": "span-22",
                                              "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                              "componentInfo": {
                                                "isComponent": true,
                                                "packageName": "@/components/ui",
                                                "importName": "ChevronRight",
                                                "importType": "named"
                                              }
                                            }
                                          ]
                                        },
                                        {
                                          "id": "span-24",
                                          "type": "span",
                                          "parent": "link-21",
                                          "textContent": "Напої"
                                        }
                                      ]
                                    },
                                    {
                                      "id": "link-25",
                                      "type": "Link",
                                      "parent": "div-16",
                                      "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                      "attributes": {
                                        "href": "/catalog"
                                      },
                                      "componentInfo": {
                                        "isComponent": true,
                                        "packageName": "next/link",
                                        "importName": "Link",
                                        "importType": "default"
                                      },
                                      "children": [
                                        {
                                          "id": "span-26",
                                          "type": "span",
                                          "parent": "link-25",
                                          "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                          "children": [
                                            {
                                              "id": "chevronright-27",
                                              "type": "ChevronRight",
                                              "parent": "span-26",
                                              "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                              "componentInfo": {
                                                "isComponent": true,
                                                "packageName": "@/components/ui",
                                                "importName": "ChevronRight",
                                                "importType": "named"
                                              }
                                            }
                                          ]
                                        },
                                        {
                                          "id": "span-28",
                                          "type": "span",
                                          "parent": "link-25",
                                          "textContent": "Солодощі"
                                        }
                                      ]
                                    }
                                  ]
                                },
                                {
                                  "id": "link-29",
                                  "type": "Link",
                                  "parent": "div-15",
                                  "className": "text-base-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "span-30",
                                      "type": "span",
                                      "parent": "link-29",
                                      "textContent": "Переглянути всі"
                                    },
                                    {
                                      "id": "chevronright-31",
                                      "type": "ChevronRight",
                                      "parent": "link-29",
                                      "className": "ml-1 w-4 h-4",
                                      "componentInfo": {
                                        "isComponent": true,
                                        "packageName": "@/components/ui",
                                        "importName": "ChevronRight",
                                        "importType": "named"
                                      }
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "div-32",
                  "type": "div",
                  "parent": "div-1",
                  "className": "col-span-12 lg:col-span-5 relative",
                  "children": [
                    {
                      "id": "div-33",
                      "type": "div",
                      "parent": "div-32",
                      "className": "bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]",
                      "children": [
                        {
                          "id": "link-34",
                          "type": "Link",
                          "parent": "div-33",
                          "className": "block",
                          "attributes": {
                            "href": "/catalog"
                          },
                          "componentInfo": {
                            "isComponent": true,
                            "packageName": "next/link",
                            "importName": "Link",
                            "importType": "default"
                          },
                          "children": [
                            {
                              "id": "div-35",
                              "type": "div",
                              "parent": "link-34",
                              "className": "relative h-56 overflow-hidden",
                              "children": [
                                {
                                  "id": "image-36",
                                  "type": "Image",
                                  "parent": "div-35",
                                  "className": "object-cover transition-transform duration-700 ease-out hover:scale-105",
                                  "attributes": {
                                    "src": "/assets/2.jpg",
                                    "alt": "Взуття",
                                    "fill": "true",
                                    "sizes": "(max-width: 768px) 100vw, 33vw"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/image",
                                    "importName": "Image",
                                    "importType": "default"
                                  }
                                },
                                {
                                  "id": "div-37",
                                  "type": "div",
                                  "parent": "div-35",
                                  "className": "absolute inset-0 bg-gradient-to-t from-[#006AA7]/90 via-[#006AA7]/50 to-transparent"
                                },
                                {
                                  "id": "div-38",
                                  "type": "div",
                                  "parent": "div-35",
                                  "className": "absolute bottom-0 left-0 p-6",
                                  "children": [
                                    {
                                      "id": "div-39",
                                      "type": "div",
                                      "parent": "div-38",
                                      "className": "flex items-center mb-2",
                                      "children": [
                                        {
                                          "id": "div-40",
                                          "type": "div",
                                          "parent": "div-39",
                                          "className": "w-6 h-0.5 bg-[#FECC02] mr-2"
                                        },
                                        {
                                          "id": "span-41",
                                          "type": "span",
                                          "parent": "div-39",
                                          "className": "text-subtle-semibold uppercase tracking-wider text-white opacity-90",
                                          "textContent": "Категорія"
                                        }
                                      ]
                                    },
                                    {
                                      "id": "h3-42",
                                      "type": "h3",
                                      "parent": "div-38",
                                      "className": "text-heading3-bold text-white mb-1 drop-shadow-sm",
                                      "textContent": "Взуття"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "id": "div-43",
                          "type": "div",
                          "parent": "div-33",
                          "className": "p-6",
                          "children": [
                            {
                              "id": "div-44",
                              "type": "div",
                              "parent": "div-43",
                              "className": "grid grid-cols-2 gap-3",
                              "children": [
                                {
                                  "id": "link-45",
                                  "type": "Link",
                                  "parent": "div-44",
                                  "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "span-46",
                                      "type": "span",
                                      "parent": "link-45",
                                      "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                      "children": [
                                        {
                                          "id": "chevronright-47",
                                          "type": "ChevronRight",
                                          "parent": "span-46",
                                          "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                          "componentInfo": {
                                            "isComponent": true,
                                            "packageName": "@/components/ui",
                                            "importName": "ChevronRight",
                                            "importType": "named"
                                          }
                                        }
                                      ]
                                    },
                                    {
                                      "id": "span-48",
                                      "type": "span",
                                      "parent": "link-45",
                                      "textContent": "Дитяче"
                                    }
                                  ]
                                },
                                {
                                  "id": "link-49",
                                  "type": "Link",
                                  "parent": "div-44",
                                  "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "span-50",
                                      "type": "span",
                                      "parent": "link-49",
                                      "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                      "children": [
                                        {
                                          "id": "chevronright-51",
                                          "type": "ChevronRight",
                                          "parent": "span-50",
                                          "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                          "componentInfo": {
                                            "isComponent": true,
                                            "packageName": "@/components/ui",
                                            "importName": "ChevronRight",
                                            "importType": "named"
                                          }
                                        }
                                      ]
                                    },
                                    {
                                      "id": "span-52",
                                      "type": "span",
                                      "parent": "link-49",
                                      "textContent": "Жіноче"
                                    }
                                  ]
                                },
                                {
                                  "id": "link-53",
                                  "type": "Link",
                                  "parent": "div-44",
                                  "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "span-54",
                                      "type": "span",
                                      "parent": "link-53",
                                      "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                      "children": [
                                        {
                                          "id": "chevronright-55",
                                          "type": "ChevronRight",
                                          "parent": "span-54",
                                          "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                          "componentInfo": {
                                            "isComponent": true,
                                            "packageName": "@/components/ui",
                                            "importName": "ChevronRight",
                                            "importType": "named"
                                          }
                                        }
                                      ]
                                    },
                                    {
                                      "id": "span-56",
                                      "type": "span",
                                      "parent": "link-53",
                                      "textContent": "Чоловіче"
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "id": "link-57",
                              "type": "Link",
                              "parent": "div-43",
                              "className": "text-small-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center mt-4",
                              "attributes": {
                                "href": "/catalog"
                              },
                              "componentInfo": {
                                "isComponent": true,
                                "packageName": "next/link",
                                "importName": "Link",
                                "importType": "default"
                              },
                              "children": [
                                {
                                  "id": "span-58",
                                  "type": "span",
                                  "parent": "link-57",
                                  "textContent": "Переглянути всі"
                                },
                                {
                                  "id": "chevronright-59",
                                  "type": "ChevronRight",
                                  "parent": "link-57",
                                  "className": "ml-1 w-3 h-3",
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "@/components/ui",
                                    "importName": "ChevronRight",
                                    "importType": "named"
                                  }
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "div-60",
                  "type": "div",
                  "parent": "div-1",
                  "className": "col-span-12 lg:col-span-5 relative",
                  "children": [
                    {
                      "id": "div-61",
                      "type": "div",
                      "parent": "div-60",
                      "className": "bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]",
                      "children": [
                        {
                          "id": "link-62",
                          "type": "Link",
                          "parent": "div-61",
                          "className": "block",
                          "attributes": {
                            "href": "/catalog"
                          },
                          "componentInfo": {
                            "isComponent": true,
                            "packageName": "next/link",
                            "importName": "Link",
                            "importType": "default"
                          },
                          "children": [
                            {
                              "id": "div-63",
                              "type": "div",
                              "parent": "link-62",
                              "className": "relative h-56 overflow-hidden",
                              "children": [
                                {
                                  "id": "image-64",
                                  "type": "Image",
                                  "parent": "div-63",
                                  "className": "object-cover transition-transform duration-700 ease-out hover:scale-105",
                                  "attributes": {
                                    "src": "/assets/1.jpg",
                                    "alt": "Одяг",
                                    "fill": "true",
                                    "sizes": "(max-width: 768px) 100vw, 33vw"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/image",
                                    "importName": "Image",
                                    "importType": "default"
                                  }
                                },
                                {
                                  "id": "div-65",
                                  "type": "div",
                                  "parent": "div-63",
                                  "className": "absolute inset-0 bg-gradient-to-t from-[#006AA7]/90 via-[#006AA7]/50 to-transparent"
                                },
                                {
                                  "id": "div-66",
                                  "type": "div",
                                  "parent": "div-63",
                                  "className": "absolute bottom-0 left-0 p-6",
                                  "children": [
                                    {
                                      "id": "div-67",
                                      "type": "div",
                                      "parent": "div-66",
                                      "className": "flex items-center mb-2",
                                      "children": [
                                        {
                                          "id": "div-68",
                                          "type": "div",
                                          "parent": "div-67",
                                          "className": "w-6 h-0.5 bg-[#FECC02] mr-2"
                                        },
                                        {
                                          "id": "span-69",
                                          "type": "span",
                                          "parent": "div-67",
                                          "className": "text-subtle-semibold uppercase tracking-wider text-white opacity-90",
                                          "textContent": "Категорія"
                                        }
                                      ]
                                    },
                                    {
                                      "id": "h3-70",
                                      "type": "h3",
                                      "parent": "div-66",
                                      "className": "text-heading3-bold text-white mb-1 drop-shadow-sm",
                                      "textContent": "Одяг"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "id": "div-71",
                          "type": "div",
                          "parent": "div-61",
                          "className": "p-6",
                          "children": [
                            {
                              "id": "div-72",
                              "type": "div",
                              "parent": "div-71",
                              "className": "grid grid-cols-2 gap-3",
                              "children": [
                                {
                                  "id": "link-73",
                                  "type": "Link",
                                  "parent": "div-72",
                                  "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "span-74",
                                      "type": "span",
                                      "parent": "link-73",
                                      "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                      "children": [
                                        {
                                          "id": "chevronright-75",
                                          "type": "ChevronRight",
                                          "parent": "span-74",
                                          "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                          "componentInfo": {
                                            "isComponent": true,
                                            "packageName": "@/components/ui",
                                            "importName": "ChevronRight",
                                            "importType": "named"
                                          }
                                        }
                                      ]
                                    },
                                    {
                                      "id": "span-76",
                                      "type": "span",
                                      "parent": "link-73",
                                      "textContent": "Жіночий одяг"
                                    }
                                  ]
                                },
                                {
                                  "id": "link-77",
                                  "type": "Link",
                                  "parent": "div-72",
                                  "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "span-78",
                                      "type": "span",
                                      "parent": "link-77",
                                      "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                      "children": [
                                        {
                                          "id": "chevronright-79",
                                          "type": "ChevronRight",
                                          "parent": "span-78",
                                          "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                          "componentInfo": {
                                            "isComponent": true,
                                            "packageName": "@/components/ui",
                                            "importName": "ChevronRight",
                                            "importType": "named"
                                          }
                                        }
                                      ]
                                    },
                                    {
                                      "id": "span-80",
                                      "type": "span",
                                      "parent": "link-77",
                                      "textContent": "Чоловічий одяг"
                                    }
                                  ]
                                },
                                {
                                  "id": "link-81",
                                  "type": "Link",
                                  "parent": "div-72",
                                  "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "span-82",
                                      "type": "span",
                                      "parent": "link-81",
                                      "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                      "children": [
                                        {
                                          "id": "chevronright-83",
                                          "type": "ChevronRight",
                                          "parent": "span-82",
                                          "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                          "componentInfo": {
                                            "isComponent": true,
                                            "packageName": "@/components/ui",
                                            "importName": "ChevronRight",
                                            "importType": "named"
                                          }
                                        }
                                      ]
                                    },
                                    {
                                      "id": "span-84",
                                      "type": "span",
                                      "parent": "link-81",
                                      "textContent": "Дитячий одяг"
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "id": "link-85",
                              "type": "Link",
                              "parent": "div-71",
                              "className": "text-small-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center mt-4",
                              "attributes": {
                                "href": "/catalog"
                              },
                              "componentInfo": {
                                "isComponent": true,
                                "packageName": "next/link",
                                "importName": "Link",
                                "importType": "default"
                              },
                              "children": [
                                {
                                  "id": "span-86",
                                  "type": "span",
                                  "parent": "link-85",
                                  "textContent": "Переглянути всі"
                                },
                                {
                                  "id": "chevronright-87",
                                  "type": "ChevronRight",
                                  "parent": "link-85",
                                  "className": "ml-1 w-3 h-3",
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "@/components/ui",
                                    "importName": "ChevronRight",
                                    "importType": "named"
                                  }
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "div-88",
                  "type": "div",
                  "parent": "div-1",
                  "className": "col-span-12 lg:col-span-7 relative",
                  "children": [
                    {
                      "id": "div-89",
                      "type": "div",
                      "parent": "div-88",
                      "className": "bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]",
                      "children": [
                        {
                          "id": "div-90",
                          "type": "div",
                          "parent": "div-89",
                          "className": "flex flex-col lg:flex-row h-full",
                          "children": [
                            {
                              "id": "div-91",
                              "type": "div",
                              "parent": "div-90",
                              "className": "lg:w-2/5 p-8 flex flex-col justify-center order-2 lg:order-1",
                              "children": [
                                {
                                  "id": "div-92",
                                  "type": "div",
                                  "parent": "div-91",
                                  "className": "space-y-4 mb-6",
                                  "children": [
                                    {
                                      "id": "link-93",
                                      "type": "Link",
                                      "parent": "div-92",
                                      "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                      "attributes": {
                                        "href": "/catalog"
                                      },
                                      "componentInfo": {
                                        "isComponent": true,
                                        "packageName": "next/link",
                                        "importName": "Link",
                                        "importType": "default"
                                      },
                                      "children": [
                                        {
                                          "id": "span-94",
                                          "type": "span",
                                          "parent": "link-93",
                                          "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                          "children": [
                                            {
                                              "id": "chevronright-95",
                                              "type": "ChevronRight",
                                              "parent": "span-94",
                                              "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                              "componentInfo": {
                                                "isComponent": true,
                                                "packageName": "@/components/ui",
                                                "importName": "ChevronRight",
                                                "importType": "named"
                                              }
                                            }
                                          ]
                                        },
                                        {
                                          "id": "span-96",
                                          "type": "span",
                                          "parent": "link-93",
                                          "textContent": "Постільна білизна"
                                        }
                                      ]
                                    },
                                    {
                                      "id": "link-97",
                                      "type": "Link",
                                      "parent": "div-92",
                                      "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                      "attributes": {
                                        "href": "/catalog"
                                      },
                                      "componentInfo": {
                                        "isComponent": true,
                                        "packageName": "next/link",
                                        "importName": "Link",
                                        "importType": "default"
                                      },
                                      "children": [
                                        {
                                          "id": "span-98",
                                          "type": "span",
                                          "parent": "link-97",
                                          "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                          "children": [
                                            {
                                              "id": "chevronright-99",
                                              "type": "ChevronRight",
                                              "parent": "span-98",
                                              "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                              "componentInfo": {
                                                "isComponent": true,
                                                "packageName": "@/components/ui",
                                                "importName": "ChevronRight",
                                                "importType": "named"
                                              }
                                            }
                                          ]
                                        },
                                        {
                                          "id": "span-100",
                                          "type": "span",
                                          "parent": "link-97",
                                          "textContent": "Декор"
                                        }
                                      ]
                                    },
                                    {
                                      "id": "link-101",
                                      "type": "Link",
                                      "parent": "div-92",
                                      "className": "flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group",
                                      "attributes": {
                                        "href": "/catalog"
                                      },
                                      "componentInfo": {
                                        "isComponent": true,
                                        "packageName": "next/link",
                                        "importName": "Link",
                                        "importType": "default"
                                      },
                                      "children": [
                                        {
                                          "id": "span-102",
                                          "type": "span",
                                          "parent": "link-101",
                                          "className": "w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300",
                                          "children": [
                                            {
                                              "id": "chevronright-103",
                                              "type": "ChevronRight",
                                              "parent": "span-102",
                                              "className": "w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100",
                                              "componentInfo": {
                                                "isComponent": true,
                                                "packageName": "@/components/ui",
                                                "importName": "ChevronRight",
                                                "importType": "named"
                                              }
                                            }
                                          ]
                                        },
                                        {
                                          "id": "span-104",
                                          "type": "span",
                                          "parent": "link-101",
                                          "textContent": "Домашній текстиль"
                                        }
                                      ]
                                    }
                                  ]
                                },
                                {
                                  "id": "link-105",
                                  "type": "Link",
                                  "parent": "div-91",
                                  "className": "text-base-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "span-106",
                                      "type": "span",
                                      "parent": "link-105",
                                      "textContent": "Переглянути всі"
                                    },
                                    {
                                      "id": "chevronright-107",
                                      "type": "ChevronRight",
                                      "parent": "link-105",
                                      "className": "ml-1 w-4 h-4",
                                      "componentInfo": {
                                        "isComponent": true,
                                        "packageName": "@/components/ui",
                                        "importName": "ChevronRight",
                                        "importType": "named"
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "id": "div-108",
                              "type": "div",
                              "parent": "div-90",
                              "className": "lg:w-3/5 relative order-1 lg:order-2",
                              "children": [
                                {
                                  "id": "link-109",
                                  "type": "Link",
                                  "parent": "div-108",
                                  "className": "block h-full",
                                  "attributes": {
                                    "href": "/catalog"
                                  },
                                  "componentInfo": {
                                    "isComponent": true,
                                    "packageName": "next/link",
                                    "importName": "Link",
                                    "importType": "default"
                                  },
                                  "children": [
                                    {
                                      "id": "div-110",
                                      "type": "div",
                                      "parent": "link-109",
                                      "className": "relative h-72 lg:h-full overflow-hidden",
                                      "children": [
                                        {
                                          "id": "image-111",
                                          "type": "Image",
                                          "parent": "div-110",
                                          "className": "object-cover transition-transform duration-700 ease-out hover:scale-105",
                                          "attributes": {
                                            "src": "/assets/4.jpg",
                                            "alt": "Все для дому",
                                            "fill": "true",
                                            "sizes": "(max-width: 768px) 100vw, 50vw"
                                          },
                                          "componentInfo": {
                                            "isComponent": true,
                                            "packageName": "next/image",
                                            "importName": "Image",
                                            "importType": "default"
                                          }
                                        },
                                        {
                                          "id": "div-112",
                                          "type": "div",
                                          "parent": "div-110",
                                          "className": "absolute inset-0 bg-gradient-to-l from-[#006AA7]/80 via-[#006AA7]/40 to-transparent"
                                        },
                                        {
                                          "id": "div-113",
                                          "type": "div",
                                          "parent": "div-110",
                                          "className": "absolute bottom-0 right-0 p-8 text-right",
                                          "children": [
                                            {
                                              "id": "div-114",
                                              "type": "div",
                                              "parent": "div-113",
                                              "className": "flex items-center justify-end mb-3",
                                              "children": [
                                                {
                                                  "id": "span-115",
                                                  "type": "span",
                                                  "parent": "div-114",
                                                  "className": "text-small-semibold uppercase tracking-wider text-white opacity-90",
                                                  "textContent": "Категорія"
                                                },
                                                {
                                                  "id": "div-116",
                                                  "type": "div",
                                                  "parent": "div-114",
                                                  "className": "w-8 h-1 bg-[#FECC02] ml-3"
                                                }
                                              ]
                                            },
                                            {
                                              "id": "h3-117",
                                              "type": "h3",
                                              "parent": "div-113",
                                              "className": "text-heading2-bold text-white mb-2 drop-shadow-sm",
                                              "textContent": "\"Все для дому\""
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "id": "div-118",
              "type": "div",
              "parent": "categories",
              "className": "text-center mt-16",
              "children": [
                {
                  "id": "link-119",
                  "type": "Link",
                  "parent": "div-118",
                  "className": "inline-block text-base-semibold text-white bg-[#006AA7] hover:bg-[#005a8e] px-8 py-4 rounded-full transition-colors duration-300 shadow-sm",
                  "attributes": {
                    "href": "/catalog?page=1&sort=default",
                    "title": "Каталог"
                  },
                  "componentInfo": {
                    "isComponent": true,
                    "packageName": "next/link",
                    "importName": "Link",
                    "importType": "default"
                  },
                  "children": [
                    {
                      "id": "span-120",
                      "type": "span",
                      "parent": "link-119",
                      "className": "flex items-center",
                      "textContent": "Переглянути всі категорії",
                      "children": [
                        {
                          "id": "chevronright-121",
                          "type": "ChevronRight",
                          "parent": "span-120",
                          "className": "ml-2 w-4 h-4",
                          "componentInfo": {
                            "isComponent": true,
                            "packageName": "@/components/ui",
                            "importName": "ChevronRight",
                            "importType": "named"
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }

    latestParsedContent = initialStructure
    return initialStructure
  }

  // Update the setParsedContentWithDeepClone function to store the latest content
  const setParsedContentWithDeepClone = (content: ParsedElement) => {
    // Store the latest content for future use
    latestParsedContent = content
    setParsedContent(content)
  }

  // Parse JSX string to a manipulable structure
  useEffect(() => {
    try {
      // Only parse on initial load or when content changes from parent
      if (!parsedContent || content !== initialContent) {
        setParsedContentWithDeepClone(simpleParse(content))
      }
    } catch (error) {
      console.error("Error parsing JSX:", error)
    }
  }, [content, initialContent, parsedContent, simpleParse])

  // Add this function to check if any element in the tree has animations enabled
  const hasAnimations = (element: ParsedElement): boolean => {
    if (element.animations?.enabled) {
      return true
    }

    if (element.children) {
      for (const child of element.children) {
        if (hasAnimations(child)) {
          return true
        }
      }
    }

    return false
  }

  // Convert the parsed structure back to JSX
  const generateJsx = useCallback((element: ParsedElement): string => {
    if (!element) return ""

    // Create a more accurate JSX representation
    const generateElementJsx = (el: ParsedElement): string => {
      // Skip rendering root fragments, just render their children
      if (el.isRootFragment) {
        if (el.children && el.children.length > 0) {
          return el.children.map((child) => generateElementJsx(child)).join("\n")
        }
        return ""
      }

      // Determine if we should use a component name based on componentInfo
      let tagName = el.type

      // Check if animations are enabled and apply motion prefix
      if (el.animations?.enabled) {
        // For standard HTML elements, add motion. prefix
        if (
          [
            "div",
            "p",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "span",
            "button",
            "section",
            "article",
            "header",
            "footer",
            "ul",
            "ol",
            "li",
          ].includes(el.type)
        ) {
          tagName = `motion.${el.type}`
        }
      }
      // Special handling for Lucide icons
      if (el.componentInfo?.packageName === "lucide-react") {
        return `<DynamicIcon name="${el.type}"  />`
      }
      // Check if this is a component with componentInfo
      else if (el.componentInfo?.isComponent) {
        tagName = el.componentInfo.importName
      }
      // Otherwise, handle special cases like Image and Link
      else if (el.type === "img") {
        const src = el.attributes?.src || ""
        const isExternalUrl = src.startsWith("http") || src.startsWith("/placeholder.svg")
        tagName = isExternalUrl ? "img" : "Image"
      } else if (el.type === "a") {
        const href = el.attributes?.href || ""
        const isExternalUrl = href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")
        tagName = isExternalUrl ? "a" : "Link"
      } else if (el.type === "icon") {
        // For icons, use the icon name directly
        const { icon, iconLibrary } = el.attributes || {}
        if (icon && iconLibrary === "lucide") {
          tagName = icon
        } else if (icon && iconLibrary === "react-icons") {
          tagName = icon
        }
      } else if (el.type === "Fragment") {
        // For React fragments, use the fragment syntax
        tagName = ""
      }

      // Start the tag
      let jsx = tagName ? `<${tagName}` : "<>"

      // Add className if it exists and it's not a fragment
      if (el.className && tagName) {
        jsx += ` className="${el.className}"`
      }

      // Add style if it exists and it's not a fragment
      if (el.style && Object.keys(el.style).length > 0 && tagName) {
        const styleStr = Object.entries(el.style)
          .map(([key, value]) => `${key}: '${value}'`)
          .join(", ")

        jsx += ` style={{ ${styleStr} }}`
      }

      // Add attributes if they exist and it's not a fragment
      if (el.attributes && tagName) {
        // Skip icon-specific attributes for icon elements
        const skipAttrs = el.type === "icon" ? ["icon", "iconLibrary", "iconSize", "iconColor", "iconStroke"] : []

        Object.entries(el.attributes).forEach(([key, value]) => {
          if (skipAttrs.includes(key)) return

          // List of attributes that should be treated as numbers
          const numericAttributes = ["width", "height", "size", "strokeWidth", "repeat", "duration", "delay"]

          // For numeric attributes, don't use quotes
          if (numericAttributes.includes(key)) {
            jsx += ` ${key}={${value}}`
          } else {
            jsx += ` ${key}="${value}"`
          }
        })
      }

      // Add animation props if enabled and it's not a fragment
      if (el.animations?.enabled && tagName) {
        const { type, duration, delay, repeat, ease, trigger, direction, angle, distance, intensity } = el.animations

        // Set up animation variants and props based on animation type and trigger
        if (trigger === "load" || trigger === "inView") {
          // For load and inView triggers, use initial/animate/whileInView
          jsx += ` initial={`

          if (type === "fade") {
            jsx += `{ opacity: 0 }`
          } else if (type === "slide") {
            if (direction === "right") {
              jsx += `{ x: ${distance || 100}, opacity: 0 }`
            } else if (direction === "up") {
              jsx += `{ y: -${distance || 100}, opacity: 0 }`
            } else if (direction === "down") {
              jsx += `{ y: ${distance || 100}, opacity: 0 }`
            } else {
              // default to left
              jsx += `{ x: -${distance || 100}, opacity: 0 }`
            }
          } else if (type === "scale") {
            if (direction === "out") {
              jsx += `{ scale: ${(intensity || 1) + 1}, opacity: 0 }`
            } else {
              jsx += `{ scale: 0, opacity: 0 }`
            }
          } else if (type === "rotate") {
            jsx += `{ rotate: ${angle || 180}, opacity: 0 }`
          } else {
            jsx += `{ opacity: 0 }`
          }
          jsx += `}`

          // Add animate or whileInView based on trigger
          if (trigger === "inView") {
            jsx += ` whileInView={{ opacity: 1`

            if (type === "slide") {
              jsx += `, x: 0, y: 0`
            } else if (type === "scale") {
              jsx += `, scale: 1`
            } else if (type === "rotate") {
              jsx += `, rotate: 0`
            }

            jsx += ` }} viewport={{ once: false, amount: 0.3 }}`
          } else {
            jsx += ` animate={{ opacity: 1`

            if (type === "slide") {
              jsx += `, x: 0, y: 0`
            } else if (type === "scale") {
              jsx += `, scale: 1`
            } else if (type === "rotate") {
              jsx += `, rotate: 0`
            }

            jsx += ` }}`
          }
        } else if (trigger === "hover") {
          // For hover trigger
          jsx += ` whileHover={`

          if (type === "fade") {
            jsx += `{ opacity: 0.7 }`
          } else if (type === "scale") {
            jsx += `{ scale: ${intensity || 1.1} }`
          } else if (type === "rotate") {
            jsx += `{ rotate: ${angle || 10} }`
          } else if (type === "bounce") {
            jsx += `{ y: -${distance || 10} }`
          } else {
            jsx += `{ scale: 1.05 }`
          }
          jsx += `}`
        } else if (trigger === "click") {
          // For click trigger
          jsx += ` whileTap={`

          if (type === "scale") {
            jsx += `{ scale: 0.95 }`
          } else if (type === "rotate") {
            jsx += `{ rotate: ${angle || 5} }`
          } else {
            jsx += `{ scale: 0.95 }`
          }
          jsx += `}`
        }

        // Add special animation types
        if (type === "bounce" && trigger === "load") {
          jsx += ` animate={{ y: [0, -${distance || 20}, 0] }}`
        } else if (type === "pulse" && trigger === "load") {
          jsx += ` animate={{ scale: [1, ${intensity || 1.1}, 1] }}`
        } else if (type === "flip" && trigger === "load") {
          if (direction === "y") {
            jsx += ` animate={{ rotateY: [0, 180, 360] }}`
          } else {
            jsx += ` animate={{ rotateX: [0, 180, 360] }}`
          }
        }

        // Add transition properties for all animation types
        jsx += ` transition={{ duration: ${duration}, delay: ${delay}`

        if (repeat && repeat > 0) {
          if (repeat === Number.POSITIVE_INFINITY || repeat === "Infinity") {
            jsx += `, repeat: Infinity`
          } else {
            jsx += `, repeat: ${repeat}`
          }
        }

        if (ease) {
          jsx += `, ease: "${ease}"`
        }

        if (type === "bounce" || type === "pulse") {
          jsx += `, times: [0, 0.5, 1]`
        }

        jsx += ` }}`
      }

      // Self-closing tags for components and void elements
      if (
        el.type === "img" ||
        el.type === "input" ||
        el.type === "br" ||
        el.type === "hr" ||
        (el.componentInfo?.isComponent &&
          (el.componentInfo.packageName === "lucide-react" || el.componentInfo.packageName?.includes("react-icons")))
      ) {
        jsx += " />"
        return jsx
      }

      jsx += ">"

      // Add text content or children
      if (el.textContent) {
        jsx += el.textContent
      } else if (el.children && el.children.length > 0) {
        el.children.forEach((child) => {
          jsx += generateElementJsx(child)
        })
      }

      // Close tag
      jsx += tagName ? `</${tagName}>` : "</>"

      return jsx
    }

    // Generate the JSX content
    const jsxContent = generateElementJsx(element)

    // For the root element, wrap in a React component
    if (element.id === "root") {
      let imports = ""

      // Check if we need to import framer-motion
      if (hasAnimations(element)) {
        imports += `import { motion } from "framer-motion";\n`
      }

      return `${imports}
export default function Component() {
  return (
    ${jsxContent}
  );
}
`
    }

    return jsxContent
  }, [])

  return {
    content,
    setContent,
    parsedContent,
    setParsedContent: setParsedContentWithDeepClone,
    generateJsx,
  }
}

