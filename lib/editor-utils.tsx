import { Type, Image, Link, Box, BoxIcon as Button } from "lucide-react"

export const getElementIcon = (type: string) => {
  switch (type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
    case "p":
    case "span":
      return <Type className="h-4 w-4" />
    case "img":
      return <Image className="h-4 w-4" />
    case "a":
      return <Link className="h-4 w-4" />
    case "div":
      return <Box className="h-4 w-4" />
    case "button":
      return <Button className="h-4 w-4" />
    default:
      return <Box className="h-4 w-4" />
  }
}

