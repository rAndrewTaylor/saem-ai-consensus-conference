import { cn } from "@/lib/utils"

const variants = {
  default: "bg-white/[0.08] text-white/70",
  primary: "bg-purple-500/15 text-purple-300",
  success: "bg-emerald-500/15 text-emerald-300",
  warning: "bg-amber-500/15 text-amber-300",
  danger: "bg-red-500/15 text-red-300",
  live: "bg-emerald-500/15 text-emerald-300 animate-pulse",
  cyan: "bg-cyan-500/15 text-cyan-300",
}

export function Badge({ variant = "default", className, children, ...props }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", variants[variant], className)} {...props}>
      {children}
    </span>
  )
}
