import { useMemo, useState } from "react"
import { Check, ExternalLink, Eye, Lightbulb } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { GuessRow } from "./guess-row"
import { GuessSearch } from "./guess-search"
import { WorldMap, type MapPoint } from "./world-map"
import { categoryEmoji } from "../lib/categories"
import { formatGameDate } from "../lib/dates"
import { haversine } from "../lib/geo"
import { placeContext, placeLabel, placeShort } from "../lib/place"
import type { GuessFeedback, NameEntry, Place, PublicPuzzle } from "../lib/types"

interface PuzzleBoardProps {
  puzzle: PublicPuzzle
  names: NameEntry[]
  onGuess: (guessId: string) => void
  pending?: boolean
  compact?: boolean // rapid mode: single guess, tighter layout
  autoFocus?: boolean
  /** Rendered right under the result card when finished (e.g. a share button). */
  share?: React.ReactNode
  /** Give up on this puzzle and reveal the answer (Unlimited). */
  onReveal?: (token: string) => void
  /** Fired the first time the hint is shown (e.g. Rapid docks the clock). */
  onHintShown?: () => void
  /** Small note on the hint button, e.g. "−5s" in Rapid. */
  hintCostNote?: string
}

export function PuzzleBoard({
  puzzle,
  names,
  onGuess,
  pending,
  compact,
  autoFocus,
  share,
  onReveal,
  onHintShown,
  hintCostNote,
}: PuzzleBoardProps) {
  const [hintShown, setHintShown] = useState(false)

  function revealHint() {
    if (hintShown) return
    setHintShown(true)
    onHintShown?.()
  }
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

  const categoryHint = (
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
  )

  const dateStats = (
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
  )

  const mapBlock = (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
      <WorldMap points={points} connect />
      {!puzzle.finished && (
        <p className="border-t border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground">
          Drag to pan · scroll or pinch to zoom · tap a marker for details
        </p>
      )}
    </div>
  )

  const guessList = puzzle.guesses.length > 0 && (
    <div className="flex flex-col gap-1.5">
      {[...puzzle.guesses].reverse().map((g, i) => (
        <GuessRow key={`${g.id}-${i}`} g={g} />
      ))}
    </div>
  )

  // After finishing, the full per-attribute cards are replaced by a compact
  // recap: each guess as name + attempt number, with the winning guess in green.
  const guessSummary = puzzle.guesses.length > 0 && (
    <GuessSummary guesses={puzzle.guesses} />
  )

  // Finished (non-rapid): lead with the result + share so they're in view
  // without scrolling; the map and clues slide down below the guesses.
  if (puzzle.finished && puzzle.reveal && !compact) {
    return (
      <div className="flex flex-col gap-5">
        <Reveal puzzle={puzzle} />
        {share}
        {guessSummary}
        <div className="flex flex-col gap-5 border-t border-border pt-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            The puzzle
          </span>
          {categoryHint}
          {dateStats}
          {mapBlock}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {categoryHint}
      {dateStats}
      {mapBlock}

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
              compact ? "One guess — who is it?" : `Guess who… (${remaining} left)`
            }
          />
          {(puzzle.hint || onReveal) && (
            <HintBar
              hint={puzzle.hint}
              shown={hintShown}
              costNote={hintCostNote}
              onShow={revealHint}
              onReveal={onReveal ? () => onReveal(puzzle.token) : undefined}
              revealPending={pending}
            />
          )}
        </>
      )}

      {puzzle.finished && puzzle.reveal ? guessSummary : guessList}
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

function HintBar({
  hint,
  shown,
  costNote,
  onShow,
  onReveal,
  revealPending,
}: {
  hint: string | null
  shown: boolean
  costNote?: string
  onShow: () => void
  onReveal?: () => void
  revealPending?: boolean
}) {
  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {hint && !shown && (
          <button type="button" onClick={onShow} className={pill}>
            <Lightbulb className="size-4" /> Need a hint?
            {costNote && <span className="text-xs opacity-70">{costNote}</span>}
          </button>
        )}
        {onReveal && (
          <button
            type="button"
            onClick={onReveal}
            disabled={revealPending}
            className={pill}
          >
            <Eye className="size-4" /> Reveal answer
          </button>
        )}
      </div>
      {hint && shown && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="text-foreground">{hint}</span>
        </div>
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

function GuessSummary({ guesses }: { guesses: GuessFeedback[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {guesses.map((g, i) => (
        <li
          key={`${g.id}-${i}`}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2",
            g.correct ? "border-primary/40 bg-primary/5" : "border-border bg-card"
          )}
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
              g.correct
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {i + 1}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-heading text-base font-semibold",
              g.correct ? "text-primary" : "text-foreground"
            )}
          >
            {g.name}
          </span>
          {g.correct && <Check className="size-4 shrink-0 text-primary" />}
        </li>
      ))}
    </ol>
  )
}

function Reveal({ puzzle }: { puzzle: PublicPuzzle }) {
  const r = puzzle.reveal!
  const hasDeath = Boolean(r.dod && r.death)
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 rounded-xl border p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500",
        puzzle.solved ? "border-primary/40 bg-primary/5" : "border-border bg-muted/40"
      )}
    >
      <a
        href={r.wikipedia}
        target="_blank"
        rel="noreferrer"
        aria-label={`${r.name} on Wikipedia`}
        title="View on Wikipedia"
        className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        <ExternalLink className="size-4" />
      </a>
      <div className="flex gap-4">
        {r.image && (
          <img
            src={r.image}
            alt={r.name}
            loading="lazy"
            className="size-20 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1 pr-10">
          <span
            className={cn(
              "text-xs font-semibold tracking-wide uppercase",
              puzzle.solved ? "text-primary" : "text-muted-foreground"
            )}
          >
            {puzzle.solved
              ? `Solved in ${puzzle.guesses.length}`
              : puzzle.revealed
                ? "Revealed"
                : "Out of guesses"}
          </span>
          <h3 className="font-heading text-xl leading-tight font-semibold">{r.name}</h3>
          {r.description && (
            <p className="text-sm text-muted-foreground">{r.description}</p>
          )}
        </div>
      </div>
      <div className={cn("grid gap-3", hasDeath ? "grid-cols-2" : "grid-cols-1")}>
        <VitalStat tone="born" label="Born" date={formatGameDate(r.dob)} place={r.birth} />
        {hasDeath && (
          <VitalStat
            tone="died"
            label="Died"
            date={formatGameDate(r.dod!)}
            place={r.death!}
          />
        )}
      </div>
    </div>
  )
}

function VitalStat({
  tone,
  label,
  date,
  place,
}: {
  tone: "born" | "died"
  label: string
  date: string
  place: Place
}) {
  const short = placeShort(place)
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        <span
          className={cn("size-2 rounded-full", tone === "born" ? "bg-born" : "bg-died")}
        />
        {label}
      </div>
      <div className="mt-1 font-heading text-lg leading-tight font-bold sm:text-xl">
        {date}
      </div>
      <div
        className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"
        title={placeLabel(place)}
      >
        <span className="truncate">{short.text}</span>
        {short.flag && <span className="shrink-0">{short.flag}</span>}
      </div>
    </div>
  )
}
