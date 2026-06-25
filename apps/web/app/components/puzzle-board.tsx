import { useMemo } from "react"
import { ExternalLink, Skull, Sprout } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { GuessRow } from "./guess-row"
import { GuessSearch } from "./guess-search"
import { WorldMap, type MapPoint } from "./world-map"
import { categoryEmoji } from "../lib/categories"
import { formatGameDate } from "../lib/dates"
import { haversine } from "../lib/geo"
import { placeContext, placeLabel, placeShort } from "../lib/place"
import type { NameEntry, PublicPuzzle } from "../lib/types"

interface PuzzleBoardProps {
  puzzle: PublicPuzzle
  names: NameEntry[]
  onGuess: (guessId: string) => void
  pending?: boolean
  compact?: boolean // rapid mode: single guess, tighter layout
  autoFocus?: boolean
}

export function PuzzleBoard({
  puzzle,
  names,
  onGuess,
  pending,
  compact,
  autoFocus,
}: PuzzleBoardProps) {
  const points = useMemo<MapPoint[]>(() => {
    const pts: MapPoint[] = []
    const b = puzzle.birth
    const d = puzzle.death
    const coincident =
      d && haversine(b.lat, b.lon, d.lat, d.lon) < 3 // same spot

    if (coincident && d) {
      const samePlace = b.name === d.name
      pts.push({
        kind: "both",
        key: "both",
        lat: b.lat,
        lon: b.lon,
        pulse: true,
        heading: "Born & died here",
        lines: [
          samePlace ? b.name : `${b.name} → ${d.name}`,
          placeContext(b),
          `Born ${puzzle.dobDisplay}`,
          puzzle.dodDisplay ? `Died ${puzzle.dodDisplay}` : "",
        ].filter(Boolean),
      })
    } else {
      pts.push({
        kind: "born",
        key: "born",
        lat: b.lat,
        lon: b.lon,
        pulse: true,
        heading: "Place of birth",
        lines: [b.name, placeContext(b), `Born ${puzzle.dobDisplay}`].filter(Boolean),
      })
      if (d) {
        pts.push({
          kind: "died",
          key: "died",
          lat: d.lat,
          lon: d.lon,
          pulse: true,
          heading: "Place of death",
          lines: [
            d.name,
            placeContext(d),
            puzzle.dodDisplay ? `Died ${puzzle.dodDisplay}` : "",
          ].filter(Boolean),
        })
      }
    }

    puzzle.guesses.forEach((g, i) =>
      pts.push({
        kind: g.correct ? "guess-correct" : "guess",
        key: `guess-${i}`,
        lat: g.birth.lat,
        lon: g.birth.lon,
        heading: g.name,
        lines: [`Born in ${g.birth.name}`, placeContext(g.birth)].filter(Boolean),
      })
    )
    return pts
  }, [puzzle])

  const excludeIds = useMemo(
    () => new Set(puzzle.guesses.map((g) => g.id)),
    [puzzle.guesses]
  )
  const remaining = puzzle.maxGuesses - puzzle.guesses.length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Category
        </span>
        {(puzzle.categories ?? []).length > 0 ? (
          (puzzle.categories ?? []).map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium"
            >
              <span aria-hidden>{categoryEmoji(c)}</span>
              {c}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
            Unknown
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DateStat tone="born" label="Born" date={puzzle.dobDisplay} point={puzzle.birth} />
        {puzzle.death && puzzle.dodDisplay && (
          <DateStat
            tone="died"
            label="Died"
            date={puzzle.dodDisplay}
            point={puzzle.death}
          />
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
        <WorldMap points={points} connect />
        {!puzzle.finished && (
          <p className="border-t border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground">
            Drag to pan · scroll or pinch to zoom · tap a marker for details
          </p>
        )}
      </div>

      {puzzle.finished && puzzle.reveal ? (
        <Reveal puzzle={puzzle} />
      ) : (
        <>
          {!compact && (
            <div className="flex items-center justify-between px-0.5">
              <span className="text-base font-medium">Who is it?</span>
              <GuessDots used={puzzle.guesses.length} total={puzzle.maxGuesses} />
            </div>
          )}
          <GuessSearch
            names={names}
            onGuess={onGuess}
            disabled={pending || puzzle.finished}
            excludeIds={excludeIds}
            autoFocus={autoFocus}
            placeholder={
              compact
                ? "One guess — who is it?"
                : `Guess who… (${remaining} left)`
            }
          />
        </>
      )}

      {puzzle.guesses.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {[...puzzle.guesses].reverse().map((g, i) => (
            <GuessRow key={`${g.id}-${i}`} g={g} />
          ))}
        </div>
      )}
    </div>
  )
}

function DateStat({
  tone,
  label,
  date,
  point,
}: {
  tone: "born" | "died"
  label: string
  date: string
  point: PublicPuzzle["birth"]
}) {
  const place = placeShort(point)
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span
          className={cn("size-2 rounded-full", tone === "born" ? "bg-born" : "bg-died")}
        />
        {label}
      </div>
      <div className="mt-1.5 font-heading text-xl leading-tight font-bold sm:text-2xl">
        {date}
      </div>
      <div
        className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"
        title={placeLabel(point)}
      >
        <span className="truncate">{place.text}</span>
        {place.flag && <span className="shrink-0">{place.flag}</span>}
      </div>
    </div>
  )
}

function GuessDots({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-2.5 rounded-full transition-colors",
            i < used ? "bg-muted-foreground/40" : "bg-primary"
          )}
        />
      ))}
    </div>
  )
}

function Reveal({ puzzle }: { puzzle: PublicPuzzle }) {
  const r = puzzle.reveal!
  return (
    <div
      className={cn(
        "flex gap-4 rounded-xl border p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500",
        puzzle.solved
          ? "border-success/40 bg-success/5"
          : "border-border bg-muted/40"
      )}
    >
      {r.image && (
        <img
          src={r.image}
          alt={r.name}
          loading="lazy"
          className="size-20 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold tracking-wide uppercase",
              puzzle.solved ? "text-success" : "text-muted-foreground"
            )}
          >
            {puzzle.solved
              ? `Solved in ${puzzle.guesses.length}`
              : "Out of guesses"}
          </span>
        </div>
        <h3 className="font-heading text-xl leading-tight font-semibold">{r.name}</h3>
        {r.description && (
          <p className="text-sm text-muted-foreground">{r.description}</p>
        )}
        <div className="mt-2 flex flex-col gap-1 text-sm">
          <span className="flex items-start gap-2">
            <Sprout className="mt-0.5 size-3.5 shrink-0 text-born" />
            <span>
              {formatGameDate(r.dob)} · {placeLabel(r.birth)}
            </span>
          </span>
          {r.dod && r.death && (
            <span className="flex items-start gap-2">
              <Skull className="mt-0.5 size-3.5 shrink-0 text-died" />
              <span>
                {formatGameDate(r.dod)} · {placeLabel(r.death)}
              </span>
            </span>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href={r.wikipedia} target="_blank" rel="noreferrer">
            Wikipedia <ExternalLink />
          </a>
        </Button>
      </div>
    </div>
  )
}
