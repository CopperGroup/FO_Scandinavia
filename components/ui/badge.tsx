import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-subtle-medium",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-neutral-100 text-primary-foreground hover:bg-primary/80 text-subtle-medium",
        secondary:
          "border-transparent bg-neutral-100/70 text-zinc-900 hover:bg-secondary/80 text-subtle-medium",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 text-subtle-medium",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
