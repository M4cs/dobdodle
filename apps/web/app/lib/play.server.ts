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
import type { GameMode, NameEntry, PublicPuzzle } from "./types"

export interface GameData {
  mode: GameMode
  category: string
  categories: string[]
  key: string
  seed: string | null
  puzzles: PublicPuzzle[]
  names: NameEntry[]
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

  return {
    mode,
    category,
    categories: [ALL_CATEGORY, ...CATEGORIES],
    key,
    seed,
    puzzles,
    names: nameIndex(),
  }
}

export interface GuessResult {
  ok: boolean
  error?: string
  puzzle?: PublicPuzzle
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
  return {
    result: { ok: true, puzzle },
    headers: { "Set-Cookie": await commitSession(session) },
  }
}
