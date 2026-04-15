import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const variants = {
  primary: "bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-900/30",
  secondary: "bg-white/[0.06] text-white/90 border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.16]",
  success: "bg-emerald-500/90 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20",
  danger: "bg-red-500/90 text-white hover:bg-red-500 shadow-lg shadow-red-900/20",
  ghost: "text-white/60 hover:bg-white/[0.06] hover:text-white/90",
  link: "text-purple-400 hover:text-purple-300 underline-offset-4 hover:underline p-0 h-auto",
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
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#13111C] disabled:pointer-events-none disabled:opacity-50",
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
