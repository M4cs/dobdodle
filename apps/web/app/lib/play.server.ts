import { redirect } from "react-router"
import { ALL_CATEGORY, CATEGORIES, nameIndex } from "./dataset.server"
import {
  buildPuzzle,
  dailyKey,
  decodeToken,
  gameIdOf,
  newSeed,
  normalizeCategory,
  SLOTS,
  applyGuess,
} from "./game.server"
import { commitSession, getSession, readGuesses, writeGuesses } from "./session.server"
import { dailyPercentile, recordDailyScore, scoreFor } from "./db.server"
import type { DailyStats, GameMode, NameEntry, PublicPuzzle } from "./types"

export interface GameData {
  mode: GameMode
  category: string
  categories: string[]
  key: string
  seed: string | null
  puzzles: PublicPuzzle[]
  names: NameEntry[]
  stats?: DailyStats // daily only, once finished
}

// Percentile standing for a finished daily puzzle (read-only).
async function dailyStats(
  day: string,
  category: string,
  puzzle: PublicPuzzle
): Promise<DailyStats | undefined> {
  const score = scoreFor(puzzle.guesses.length, puzzle.solved, puzzle.maxGuesses)
  const pct = await dailyPercentile(day, category, score)
  if (!pct) return undefined
  return {
    beatPct: pct.beatPct,
    total: pct.total,
    yourGuesses: puzzle.guesses.length,
    solved: puzzle.solved,
  }
}

// How many puzzles to prepare up front per mode.
const SLOT_COUNT: Record<GameMode, number> = {
  daily: 1,
  unlimited: 5,
  rapid: 60,
}

export async function loadGame(
  request: Request,
  mode: GameMode
): Promise<GameData> {
  const url = new URL(request.url)
  const category = normalizeCategory(url.searchParams.get("cat"))

  let key: string
  let seed: string | null = null
  if (mode === "daily") {
    key = dailyKey()
  } else {
    seed = url.searchParams.get("seed")
    if (!seed) {
      seed = newSeed()
      const next = new URLSearchParams({ seed })
      if (category !== ALL_CATEGORY) next.set("cat", category)
      throw redirect(`?${next.toString()}`)
    }
    key = seed
  }

  const session = await getSession(request.headers.get("Cookie"))
  const count = SLOT_COUNT[mode]
  const puzzles: PublicPuzzle[] = []
  for (let slot = 0; slot < count && slot < SLOTS[mode]; slot++) {
    const t = { mode, key, category, slot }
    puzzles.push(buildPuzzle(t, readGuesses(session, gameIdOf(t), slot)))
  }

  const stats =
    mode === "daily" && puzzles[0]?.finished
      ? await dailyStats(key, category, puzzles[0])
      : undefined

  return {
    mode,
    category,
    categories: [ALL_CATEGORY, ...CATEGORIES],
    key,
    seed,
    puzzles,
    names: nameIndex(),
    stats,
  }
}

export interface GuessResult {
  ok: boolean
  error?: string
  puzzle?: PublicPuzzle
  stats?: DailyStats
}

/** Validate + record a guess server-side; returns the updated puzzle + cookie. */
export async function submitGuess(
  request: Request
): Promise<{ result: GuessResult; headers?: HeadersInit }> {
  const form = await request.formData()
  const token = String(form.get("token") ?? "")
  const guessId = String(form.get("guessId") ?? "")
  const t = decodeToken(token)
  if (!t) return { result: { ok: false, error: "Invalid puzzle." } }

  const session = await getSession(request.headers.get("Cookie"))
  const gameId = gameIdOf(t)
  const prev = readGuesses(session, gameId, t.slot)
  const { guesses, puzzle, accepted } = applyGuess(t, prev, guessId)

  if (!accepted) {
    return { result: { ok: false, error: "Guess not accepted.", puzzle } }
  }
  writeGuesses(session, gameId, t.slot, guesses)

  // Record the anonymous daily result once per session, then report standing.
  let stats: DailyStats | undefined
  if (t.mode === "daily" && puzzle.finished) {
    const scored = (session.get("scored") ?? []) as string[]
    if (!scored.includes(gameId)) {
      await recordDailyScore(t.key, t.category, puzzle.guesses.length, puzzle.solved)
      session.set("scored", [...scored, gameId].slice(-60))
    }
    stats = await dailyStats(t.key, t.category, puzzle)
  }

  return {
    result: { ok: true, puzzle, stats },
    headers: { "Set-Cookie": await commitSession(session) },
  }
}
