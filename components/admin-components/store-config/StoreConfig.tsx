"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import LandingConfig from "./landing-config/LandingConfig"

export default function StoreConfig() {
  const [activeTab, setActiveTab] = useState("landing")

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="landing" onValueChange={setActiveTab} className="w-full">
        <div className="border-b">
          <div className="container mx-auto">
            <TabsList className="h-16">
              <TabsTrigger value="landing" className="text-lg">
                Landing Page
              </TabsTrigger>
              <TabsTrigger value="catalog" className="text-lg">
                Catalog
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-lg">
                Contact Us
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="container mx-auto py-8">
          <TabsContent value="landing">
            <LandingConfig />
          </TabsContent>

          <TabsContent value="catalog">
            {/* <CatalogConfig /> */}
          </TabsContent>

          <TabsContent value="contact">
            {/* <ContactConfig /> */}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

