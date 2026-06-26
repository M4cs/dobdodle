import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { placeShort } from "../lib/place"
import type { Direction, GuessFeedback } from "../lib/types"

interface TileSpec {
  label: string
  value: string
  match: boolean
  flag?: string
  dir?: Direction
}

export function GuessRow({ g }: { g: GuessFeedback }) {
  const born = placeShort(g.birth)
  const died = g.death ? placeShort(g.death) : { text: "—", flag: "" }

  const tiles: TileSpec[] = [
    { label: "Born in", value: born.text, flag: born.flag, match: g.birthPlaceMatch },
    {
      label: "Birth year",
      value: g.birthYearLabel,
      match: g.birthYearMatch,
      dir: g.birthYearMatch ? undefined : g.birthYearDir,
    },
    { label: "Died in", value: died.text, flag: died.flag, match: g.deathPlaceMatch },
    {
      label: "Death year",
      value: g.deathYearLabel,
      match: g.deathYearMatch,
      dir: g.deathYearMatch ? undefined : g.deathYearDir,
    },
    {
      label: "Age",
      value: String(g.age),
      match: g.ageMatch,
      dir: g.ageMatch ? undefined : g.ageDir,
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
        "rounded-2xl border p-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300",
        g.correct ? "border-success/50 bg-success/5" : "border-border bg-card"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1.5">
        <span className="truncate font-heading text-lg font-semibold sm:text-xl">
          {g.name}
        </span>
        {g.correct && (
          <span className="shrink-0 text-sm font-semibold text-success">
            🎯 Correct
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {tiles.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>
    </div>
  )
}

function Tile({ label, value, match, flag, dir }: TileSpec) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg px-2.5 py-2",
        match
          ? "bg-success text-[color:var(--color-born-foreground)]"
          : "bg-muted text-foreground"
      )}
    >
      <span
        className={cn(
          "text-[10px] font-semibold tracking-wide uppercase",
          match ? "opacity-80" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span className="flex items-center gap-1 text-base leading-tight font-semibold">
        <span className="truncate" title={value}>
          {value}
        </span>
        {flag && <span className="shrink-0">{flag}</span>}
        {dir === "up" && <ArrowUp className="size-3.5 shrink-0" />}
        {dir === "down" && <ArrowDown className="size-3.5 shrink-0" />}
      </span>
    </div>
  )
}
