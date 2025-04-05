import { Type, Image, Box } from "lucide-react"
import { Square, Text, Heading1, Link2, FormInput, FileText, List, Minus, ImagesIcon as Icons } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { FaGithub, FaTwitter, FaFacebook, FaLinkedin, FaInstagram } from "react-icons/fa"
import { MdHome, MdSettings, MdPerson, MdEmail, MdNotifications } from "react-icons/md"
import type React from "react"

export const getElementIcon = (type: string) => {
  // For Lucide icons, show the actual icon
  if (type in LucideIcons) {
    const IconComponent = LucideIcons[type as keyof typeof LucideIcons]
    return <IconComponent className="h-4 w-4 text-gray-500" />
  }

  // For React Icons, show the actual icon if possible
  if (type.startsWith("Fa") || type.startsWith("Md")) {
    const iconMap: Record<string, React.ComponentType<any>> = {
      FaGithub,
      FaTwitter,
      FaFacebook,
      FaLinkedin,
      FaInstagram,
      MdHome,
      MdSettings,
      MdPerson,
      MdEmail,
      MdNotifications,
    }

    if (type in iconMap) {
      const IconComponent = iconMap[type]
      return <IconComponent className="h-4 w-4 text-gray-500" />
    }
  }

  // Default icons for common elements
  switch (type) {
    case "div":
      return <Square className="h-4 w-4 text-gray-500" />
    case "p":
      return <Text className="h-4 w-4 text-gray-500" />
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return <Heading1 className="h-4 w-4 text-gray-500" />
    case "img":
    case "Image":
      return <Image className="h-4 w-4 text-gray-500" />
    case "a":
    case "Link":
      return <Link2 className="h-4 w-4 text-gray-500" />
    case "button":
    case "Button":
      return <Square className="h-4 w-4 text-gray-500" />
    case "input":
    case "Input":
      return <FormInput className="h-4 w-4 text-gray-500" />
    case "form":
      return <FileText className="h-4 w-4 text-gray-500" />
    case "ul":
    case "ol":
      return <List className="h-4 w-4 text-gray-500" />
    case "li":
      return <Minus className="h-4 w-4 text-gray-500" />
    case "span":
      return <Type className="h-4 w-4 text-gray-500" />
    case "icon":
      return <Icons className="h-4 w-4 text-gray-500" />
    default:
      return <Box className="h-4 w-4 text-gray-500" />
  }
}

