"use client"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import CategoriesEditor from "./CategoriesEditor"

export default function LandingConfig() {
  const { toast } = useToast()

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your landing page settings have been saved successfully.",
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Landing Page Settings</h1>
        <p className="text-muted-foreground">Configure settings for your store's landing page.</p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="hero">
          <AccordionTrigger className="text-xl font-semibold">Hero Section</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="hero-title" className="text-right">
                        Title
                      </Label>
                      <Input id="hero-title" defaultValue="Welcome to Our Store" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="hero-subtitle" className="text-right">
                        Subtitle
                      </Label>
                      <Input
                        id="hero-subtitle"
                        defaultValue="Discover amazing products at great prices"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="hero-image" className="text-right">
                        Background Image
                      </Label>
                      <Input id="hero-image" type="file" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Show Overlay</Label>
                      <div className="col-span-3">
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="categories">
          <AccordionTrigger className="text-xl font-semibold">Categories Section</AccordionTrigger>
          <AccordionContent>
            <CategoriesEditor />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="featured">
          <AccordionTrigger className="text-xl font-semibold">Featured Products</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="featured-title" className="text-right">
                        Section Title
                      </Label>
                      <Input id="featured-title" defaultValue="Featured Products" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="featured-count" className="text-right">
                        Number of Products
                      </Label>
                      <Input
                        id="featured-count"
                        type="number"
                        defaultValue="4"
                        min="1"
                        max="12"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Show Ratings</Label>
                      <div className="col-span-3">
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}

