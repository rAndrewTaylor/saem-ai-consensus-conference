import { cn } from "@/lib/utils"

export function Progress({ value = 0, max = 100, className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full", className)} style={{ backgroundColor: 'var(--th-input-bg)' }}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#1B5E8A] to-[#00B4D8] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
