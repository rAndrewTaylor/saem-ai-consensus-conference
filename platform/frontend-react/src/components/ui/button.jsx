import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const variants = {
  primary: "bg-gradient-to-r from-[#1B5E8A] to-[#0097A7] text-white hover:from-[#2B86C5] hover:to-[#00B4D8] shadow-lg shadow-[#0C2340]/25",
  secondary: "bg-[var(--th-input-bg)] text-[var(--th-text-2)] border border-[var(--th-border-2)] hover:bg-[var(--th-surface-hover)]",
  success: "bg-emerald-500/90 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20",
  danger: "bg-red-500/90 text-white hover:bg-red-500 shadow-lg shadow-red-900/20",
  ghost: "text-[var(--th-text-muted)] hover:bg-[var(--th-input-bg)] hover:text-[var(--th-text)]",
  link: "text-purple-500 hover:text-purple-400 underline-offset-4 hover:underline p-0 h-auto",
}

const sizes = {
  sm: "h-8 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-base rounded-xl",
  icon: "h-10 w-10 rounded-lg",
}

export function Button({ variant = "primary", size = "md", loading, disabled, className, children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--th-base)] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
