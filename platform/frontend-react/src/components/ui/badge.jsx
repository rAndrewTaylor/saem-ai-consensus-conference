import { cn } from "@/lib/utils"

const variants = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-primary-100 text-primary-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  live: "bg-emerald-100 text-emerald-700 animate-pulse",
}

export function Badge({ variant = "default", className, children, ...props }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", variants[variant], className)} {...props}>
      {children}
    </span>
  )
}
