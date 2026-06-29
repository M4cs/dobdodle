import { Link, useSearchParams } from "react-router"
import { cn } from "@workspace/ui/lib/utils"
import type { Difficulty } from "../lib/types"

const TIERS: Array<{ value: Difficulty; label: string; hint: string }> = [
  { value: "easy", label: "Easy", hint: "Household names" },
  { value: "medium", label: "Medium", hint: "Well-known figures" },
  { value: "hard", label: "Hard", hint: "Anyone, no fame bias" },
]

/** Segmented Easy/Medium/Hard control. Switching starts a fresh seeded game. */
export function DifficultyBar({ active }: { active: Difficulty }) {
  const [params] = useSearchParams()

  function hrefFor(diff: Difficulty): string {
    const next = new URLSearchParams(params)
    if (diff === "medium") next.delete("diff")
    else next.set("diff", diff)
    next.delete("seed") // changing difficulty starts a fresh game
    const qs = next.toString()
    return qs ? `?${qs}` : "?"
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Difficulty
      </span>
      <div className="inline-flex rounded-full border border-border bg-card p-0.5">
        {TIERS.map((t) => (
          <Link
            key={t.value}
            to={hrefFor(t.value)}
            viewTransition
            title={t.hint}
            aria-current={t.value === active ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              t.value === active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
