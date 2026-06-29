import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { ArrowRight, RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { DifficultyBar } from "./difficulty-bar"
import { GameShell } from "./game-shell"
import { PuzzleBoard } from "./puzzle-board"
import { ShareButton } from "./share-button"
import { useGuessing } from "./use-guessing"
import { shareUnlimited } from "../lib/share"
import type { GameData } from "../lib/play.server"

export function UnlimitedScreen({ data }: { data: GameData }) {
  const { puzzles, guess, reveal, pending } = useGuessing(data.puzzles)
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const current = puzzles[index]
  const solved = puzzles.filter((p) => p.solved).length
  const allFinished = puzzles.every((p) => p.finished)
  const isLast = index === puzzles.length - 1

  function newGame() {
    const next = new URLSearchParams(params)
    next.set("seed", Math.random().toString(36).slice(2, 10))
    navigate(`?${next.toString()}`)
  }

  return (
    <GameShell
      data={data}
      title="Unlimited"
      subtitle="5 people · 5 guesses each · fresh set anytime"
    >
      <div className="mb-4 flex justify-center">
        <DifficultyBar active={data.difficulty} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {puzzles.map((p, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Person ${i + 1}`}
              className={cn(
                "size-7 rounded-full text-xs font-semibold transition-colors",
                i === index && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                p.solved
                  ? "bg-success text-born-foreground"
                  : p.finished
                    ? "bg-muted text-muted-foreground"
                    : "bg-card text-foreground border border-border"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {solved}/{puzzles.length} solved
        </span>
      </div>

      <PuzzleBoard
        key={index}
        puzzle={current}
        names={data.names}
        pending={pending}
        autoFocus
        onGuess={(id) => guess(current.token, id)}
        onReveal={(token) => reveal(token)}
      />

      <div className="mt-5 flex items-center justify-between gap-3">
        {allFinished ? (
          <Button onClick={newGame} className="w-full" size="lg">
            <RotateCcw /> Play five more
          </Button>
        ) : current.finished && !isLast ? (
          <Button onClick={() => setIndex(index + 1)} className="w-full" size="lg">
            Next person <ArrowRight />
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">
            Person {index + 1} of {puzzles.length}
          </span>
        )}
      </div>

      {allFinished && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-center">
          <p className="font-heading text-lg font-semibold">
            You got {solved} of {puzzles.length}
          </p>
          <p className="text-sm text-muted-foreground">
            {solved === puzzles.length
              ? "Flawless run! 🌍"
              : "Tap a number above to review, or play five more."}
          </p>
          <div className="mt-4 flex justify-center">
            <ShareButton
              getText={() =>
                shareUnlimited(puzzles, data.category, data.seed, data.difficulty)
              }
            />
          </div>
        </div>
      )}
    </GameShell>
  )
}
