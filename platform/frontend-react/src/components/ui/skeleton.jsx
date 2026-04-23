import { cn } from "@/lib/utils"

export function Skeleton({ className, ...props }) {
  return (
    <div className={cn("animate-pulse rounded-lg", className)} style={{ backgroundColor: 'var(--th-input-bg)' }} {...props} />
  )
}
