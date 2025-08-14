import React from "react"
import { cn } from "@/app/lib/utils"

interface SpinnerProps {
  size?: number
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 16, className }) => {
  const borderSize = Math.max(2, Math.round(size / 8))
  return (
    <div
      className={cn("inline-block animate-spin rounded-full border-solid border-muted-foreground/30 border-t-foreground", className)}
      style={{ width: size, height: size, borderWidth: borderSize }}
    />
  )
}

