import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"
import type { PublicPuzzle } from "../lib/types"

interface GuessResponse {
  ok: boolean
  error?: string
  puzzle?: PublicPuzzle
}

/**
 * Owns client-side puzzle state and submits guesses to the server action.
 * The server is authoritative: it returns the updated puzzle (with feedback
 * and, once finished, the reveal), which we splice back in by slot.
 */
export function useGuessing(initial: PublicPuzzle[]) {
  const fetcher = useFetcher<GuessResponse>()
  const [puzzles, setPuzzles] = useState<PublicPuzzle[]>(initial)
  const seen = useRef<GuessResponse | null>(null)

  useEffect(() => {
    if (fetcher.data && fetcher.data !== seen.current) {
      seen.current = fetcher.data
      const p = fetcher.data.puzzle
      if (p) setPuzzles((prev) => prev.map((x) => (x.slot === p.slot ? p : x)))
    }
  }, [fetcher.data])

  function guess(token: string, guessId: string) {
    fetcher.submit(
      { token, guessId },
      { method: "post", action: "/api/guess" }
    )
  }

  return {
    puzzles,
    guess,
    pending: fetcher.state !== "idle",
    justResolved: fetcher.state === "idle" ? fetcher.data?.puzzle : undefined,
  }
}
