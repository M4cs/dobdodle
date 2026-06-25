import { useMemo } from "react"
import { ExternalLink, Lightbulb, Skull, Sprout } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { GuessRow } from "./guess-row"
import { GuessSearch } from "./guess-search"
import { WorldMap, type MapPoint } from "./world-map"
import { formatGameDate } from "../lib/dates"
import { formatDistance, haversine } from "../lib/geo"
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
        lines: [b.name, `Born ${puzzle.dobDisplay}`],
      })
      if (d) {
        pts.push({
          kind: "died",
          key: "died",
          lat: d.lat,
          lon: d.lon,
          pulse: true,
          heading: "Place of death",
          lines: [d.name, puzzle.dodDisplay ? `Died ${puzzle.dodDisplay}` : ""].filter(
            Boolean
          ),
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
        lines: [
          `Born in ${g.birth.name}`,
          g.correct ? "Correct!" : `${formatDistance(g.distanceKm)} from the answer`,
        ],
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
      <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
        <div className="relative">
          <WorldMap points={points} connect />
          <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="pointer-events-auto gap-1.5 bg-card/90 px-2.5 py-1 text-sm backdrop-blur"
            >
              <span className="size-2.5 rounded-full bg-born" />
              Born {puzzle.dobDisplay}
            </Badge>
            {puzzle.dodDisplay && (
              <Badge
                variant="outline"
                className="pointer-events-auto gap-1.5 bg-card/90 px-2.5 py-1 text-sm backdrop-blur"
              >
                <span className="size-2.5 rounded-full bg-died" />
                Died {puzzle.dodDisplay}
              </Badge>
            )}
          </div>
        </div>
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
              <span className="text-base font-medium">Who was born here?</span>
              <GuessDots used={puzzle.guesses.length} total={puzzle.maxGuesses} />
            </div>
          )}
          {!compact && (puzzle.hints.length > 0 || puzzle.nextHint) && (
            <HintChips hints={puzzle.hints} nextHint={puzzle.nextHint} />
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

function HintChips({
  hints,
  nextHint,
}: {
  hints: PublicPuzzle["hints"]
  nextHint: string | null
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Lightbulb className="size-3.5" /> Hints
      </span>
      {hints.length === 0 && (
        <span className="text-xs text-muted-foreground">
          Make a guess to unlock your first hint.
        </span>
      )}
      {hints.map((h, i) => (
        <Badge key={i} variant="secondary" className="gap-1">
          <span className="text-muted-foreground">{h.label}</span>
          <span className="font-semibold">{h.value}</span>
        </Badge>
      ))}
      {nextHint && (
        <span className="ml-auto text-xs text-muted-foreground">
          Next: {nextHint}
        </span>
      )}
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
        "flex gap-4 rounded-xl border p-4",
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
          <span className="flex items-center gap-2">
            <Sprout className="size-3.5 text-born" />
            {formatGameDate(r.dob)} · {r.birth.name}
          </span>
          {r.dod && r.death && (
            <span className="flex items-center gap-2">
              <Skull className="size-3.5 text-died" />
              {formatGameDate(r.dod)} · {r.death.name}
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
