import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Timer, Trophy, Zap } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { GameShell } from "./game-shell"
import { PuzzleBoard } from "./puzzle-board"
import { ShareButton } from "./share-button"
import { useGuessing } from "./use-guessing"
import { shareRapid } from "../lib/share"
import type { GameData } from "../lib/play.server"

const DURATION = 60
type Phase = "idle" | "playing" | "over"

export function RapidScreen({ data }: { data: GameData }) {
  const { puzzles, guess, pending } = useGuessing(data.puzzles)
  const [phase, setPhase] = useState<Phase>("idle")
  const [index, setIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const advancedRef = useRef(-1)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const current = puzzles[index]
  const answered = puzzles.filter((p) => p.finished).length
  const solved = puzzles.filter((p) => p.solved).length

  // countdown
  useEffect(() => {
    if (phase !== "playing") return
    if (timeLeft <= 0) {
      setPhase("over")
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  // auto-advance after each single guess resolves
  useEffect(() => {
    if (phase !== "playing") return
    if (current?.finished && advancedRef.current !== index) {
      advancedRef.current = index
      const t = setTimeout(() => {
        if (index >= puzzles.length - 1) setPhase("over")
        else setIndex((i) => i + 1)
      }, 1100)
      return () => clearTimeout(t)
    }
  }, [current?.finished, index, phase, puzzles.length])

  function start() {
    advancedRef.current = -1
    setIndex(0)
    setTimeLeft(DURATION)
    setPhase("playing")
  }

  function playAgain() {
    const next = new URLSearchParams(params)
    next.set("seed", Math.random().toString(36).slice(2, 10))
    navigate(`?${next.toString()}`)
  }

  return (
    <GameShell
      data={data}
      title="Rapid fire"
      subtitle="60 seconds · one guess per person · how many can you name?"
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Zap className="size-7" />
          </span>
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-semibold">Ready?</h2>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">
              You have 60 seconds. Each person gives you exactly one guess — name
              as many as you can.
            </p>
          </div>
          <Button size="lg" onClick={start}>
            <Timer /> Start the clock
          </Button>
        </div>
      )}

      {phase === "playing" && current && (
        <div className="flex flex-col gap-4">
          <RapidHud timeLeft={timeLeft} solved={solved} answered={answered} />
          <PuzzleBoard
            key={index}
            puzzle={current}
            names={data.names}
            pending={pending}
            compact
            autoFocus
            onGuess={(id) => guess(current.token, id)}
          />
        </div>
      )}

      {phase === "over" && (
        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Trophy className="size-7" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Time!
            </p>
            <p className="font-heading text-4xl font-bold tabular-nums">{solved}</p>
            <p className="text-sm text-muted-foreground">
              correct out of {answered} guessed
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <ShareButton
              getText={() => shareRapid(solved, answered, data.category, data.seed)}
            />
            <Button size="lg" variant="outline" onClick={playAgain}>
              <Zap /> Play again
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/daily">Daily</a>
            </Button>
          </div>
        </div>
      )}
    </GameShell>
  )
}

function RapidHud({
  timeLeft,
  solved,
  answered,
}: {
  timeLeft: number
  solved: number
  answered: number
}) {
  const low = timeLeft <= 10
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-muted-foreground">Score</span>
        <span className="font-heading text-xl font-bold tabular-nums">{solved}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          / {answered}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Timer
          className={cn("size-4", low ? "text-destructive" : "text-muted-foreground")}
        />
        <span
          className={cn(
            "font-heading text-xl font-bold tabular-nums",
            low && "text-destructive"
          )}
        >
          {timeLeft}s
        </span>
      </div>
    </div>
  )
}
