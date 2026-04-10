import { cn } from "@/lib/utils"

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md", className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("flex items-center justify-between border-b border-gray-100 px-6 py-4", className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900", className)} {...props}>
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
