import { MapPin } from "lucide-react"
import { formatDistance } from "../lib/geo"
import type { GuessFeedback } from "../lib/types"
import { cn } from "@workspace/ui/lib/utils"

export function GuessRow({ g }: { g: GuessFeedback }) {
  if (g.correct) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300">
        <span className="text-xl leading-none">🎯</span>
        <span className="flex-1 truncate text-base font-semibold">{g.name}</span>
        <span className="text-base font-semibold text-success">Correct!</span>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300">
      <span className="min-w-0 flex-1 truncate text-base font-medium">{g.name}</span>
      <div className="flex items-center gap-3 text-base tabular-nums">
        <span
          className="flex items-center gap-1 text-muted-foreground"
          title="Distance between birthplaces"
        >
          <MapPin className="size-4" />
          {formatDistance(g.distanceKm)}
        </span>
        <span className="text-lg leading-none" title="Direction to the answer">
          {g.direction}
        </span>
        <ProximityBadge proximity={g.proximity} />
      </div>
    </div>
  )
}

function ProximityBadge({ proximity }: { proximity: number }) {
  const tone =
    proximity >= 90
      ? "bg-success/15 text-success"
      : proximity >= 70
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-muted text-muted-foreground"
  return (
    <span
      className={cn(
        "w-14 rounded-md px-2 py-1 text-center text-sm font-semibold",
        tone
      )}
      title="How close your guess was"
    >
      {proximity}%
    </span>
  )
}
