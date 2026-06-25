import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type { Direction, GuessFeedback } from "../lib/types"

interface TileSpec {
  label: string
  value: string
  match: boolean
  dir?: Direction
}

export function GuessRow({ g }: { g: GuessFeedback }) {
  const tiles: TileSpec[] = [
    {
      label: "Category",
      value: g.categories.length ? g.categories.join(" · ") : "—",
      match: g.categoryMatch,
    },
    { label: "Born in", value: g.birthPlace, match: g.birthPlaceMatch },
    {
      label: "Birth year",
      value: g.birthYearLabel,
      match: g.birthYearMatch,
      dir: g.birthYearMatch ? undefined : g.birthYearDir,
    },
    { label: "Died in", value: g.deathPlace, match: g.deathPlaceMatch },
    {
      label: "Death year",
      value: g.deathYearLabel,
      match: g.deathYearMatch,
      dir: g.deathYearMatch ? undefined : g.deathYearDir,
    },
    {
      label: "Popularity",
      value: String(g.popularity),
      match: g.popularityMatch,
      dir: g.popularityMatch ? undefined : g.popularityDir,
    },
  ]

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300",
        g.correct ? "border-success/50 bg-success/5" : "border-border bg-card"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="truncate font-heading text-lg font-semibold">{g.name}</span>
        {g.correct && (
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-success">
            🎯 Correct
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>
    </div>
  )
}

function Tile({ label, value, match, dir }: TileSpec) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5 rounded-xl px-3 py-2.5",
        match
          ? "bg-success text-[color:var(--color-born-foreground)]"
          : "bg-muted text-foreground"
      )}
    >
      <span
        className={cn(
          "text-[11px] font-semibold tracking-wide uppercase",
          match ? "opacity-80" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span className="flex items-center gap-1 text-base leading-tight font-semibold">
        <span className="break-words">{value}</span>
        {dir === "up" && <ArrowUp className="size-4 shrink-0" />}
        {dir === "down" && <ArrowDown className="size-4 shrink-0" />}
      </span>
    </div>
  )
}
