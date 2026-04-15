import { cn } from "@/lib/utils"

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("rounded-xl border border-white/[0.06] bg-[#1C1A2E] shadow-lg shadow-black/20 transition-all duration-300 hover:border-white/[0.1] hover:shadow-xl hover:shadow-black/30", className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("flex items-center justify-between border-b border-white/[0.06] px-6 py-4", className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-lg font-semibold text-white", className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  )
}
