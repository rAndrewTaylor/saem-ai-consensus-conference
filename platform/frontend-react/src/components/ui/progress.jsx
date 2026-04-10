import { cn } from "@/lib/utils"

export function Progress({ value = 0, max = 100, className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-gray-200", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
