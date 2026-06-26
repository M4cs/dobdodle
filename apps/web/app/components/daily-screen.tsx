import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"
import { CategoryBar } from "./category-bar"
import { GameShell } from "./game-shell"
import { PuzzleBoard } from "./puzzle-board"
import { ShareButton } from "./share-button"
import { useGuessing } from "./use-guessing"
import { shareDaily } from "../lib/share"
import type { GameData } from "../lib/play.server"
import type { DailyStats, PublicPuzzle } from "../lib/types"

function PercentileCard({ stats }: { stats: DailyStats }) {
  const { beatPct, total, solved } = stats
  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
        <Trophy className="size-5" />
      </span>
      <div className="min-w-0 text-sm">
        {total <= 1 ? (
          <p className="font-medium">
            You’re the first to finish today’s puzzle!
          </p>
        ) : (
          <p>
            <span className="font-semibold">
              {solved ? `Top ${Math.max(1, 100 - beatPct)}%` : "Tough one today"}
            </span>{" "}
            — you finished ahead of{" "}
            <span className="font-semibold text-foreground">{beatPct}%</span> of{" "}
            {total.toLocaleString()} players today.
          </p>
        )}
      </div>
    </div>
  )
}

function prettyDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function DailyScreen({ data }: { data: GameData }) {
  const { puzzles, guess, pending, stats: liveStats } = useGuessing(data.puzzles)
  const serverPuzzle = puzzles[0]
  const stats = liveStats ?? data.stats

  // Persist the daily result locally so it survives even if the server cookie
  // is cleared: you can't replay a finished daily, and in-progress state is
  // restored. The richer (more-guessed) of local vs. server wins.
  const storageKey = `dobdodle:daily:${data.key}:${data.category}`
  const [stored, setStored] = useState<PublicPuzzle | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setStored(JSON.parse(raw) as PublicPuzzle)
    } catch {}
  }, [storageKey])

  // Mirror the server's authoritative state to localStorage — but never let a
  // fresh state overwrite a finished one (which would re-open a solved daily if
  // the cookie was cleared).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const existing = raw ? (JSON.parse(raw) as PublicPuzzle) : null
      if (existing?.finished && !serverPuzzle.finished) return
      localStorage.setItem(storageKey, JSON.stringify(serverPuzzle))
    } catch {}
  }, [serverPuzzle, storageKey])

  // The cookie restores in-progress play; localStorage adds an offline-proof
  // lock on a finished daily so it can't be replayed.
  const puzzle =
    stored?.finished && !serverPuzzle.finished ? stored : serverPuzzle

  return (
    <GameShell
      data={data}
      title="Daily challenge"
      subtitle={`${prettyDate(data.key)} · 5 guesses · same for everyone`}
      hideCategories
    >
      <PuzzleBoard
        puzzle={puzzle}
        names={data.names}
        pending={pending}
        autoFocus
        onGuess={(id) => guess(puzzle.token, id)}
        share={
          <div className="flex flex-col items-center gap-3">
            {stats && <PercentileCard stats={stats} />}
            <ShareButton
              getText={() => shareDaily(puzzle, data.category, data.key)}
            />
            <p className="text-center text-sm text-muted-foreground">
              That’s today’s puzzle — come back tomorrow, or try{" "}
              <a className="font-medium text-foreground underline" href="/unlimited">
                Unlimited
              </a>{" "}
              and{" "}
              <a className="font-medium text-foreground underline" href="/rapid">
                Rapid
              </a>
              .
            </p>
          </div>
        }
      />
      {puzzle.finished && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="mb-3 px-0.5 text-sm font-medium text-muted-foreground">
            Play a category challenge
          </h2>
          <CategoryBar categories={data.categories} active={data.category} />
        </div>
      )}
    </GameShell>
  )
}
