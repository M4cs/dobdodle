// Authoritative game logic. Runs only on the server. The selection of which
// person answers a given (mode, key, category, slot) depends on a server-side
// SECRET, so the client — which has neither the dataset nor the secret — cannot
// reproduce the mapping or learn the answer ahead of a correct guess.
import { createHmac, randomBytes } from "node:crypto"
import { formatGameDate } from "./dates"
import {
  ALL_CATEGORY,
  BY_ID,
  dailyPool,
  isValidCategory,
  pool,
} from "./dataset.server"
import { bearing, directionArrow, haversine, proximityScore } from "./geo"
import type {
  GameMode,
  GuessFeedback,
  Hint,
  Person,
  PublicPuzzle,
  Reveal,
} from "./types"

const SECRET = process.env.DOBDODLE_SECRET ?? "dobdodle-dev-secret-change-me"
if (!process.env.DOBDODLE_SECRET) {
  console.warn(
    "[dobdodle] DOBDODLE_SECRET is not set — using an insecure dev secret. " +
      "Set it in production so answers can't be predicted."
  )
}

export const MAX_GUESSES: Record<GameMode, number> = {
  daily: 5,
  unlimited: 5,
  rapid: 1,
}
// How many people a single game can contain. Rapid is effectively endless.
export const SLOTS: Record<GameMode, number> = {
  daily: 1,
  unlimited: 5,
  rapid: 250,
}

export const MODES: GameMode[] = ["daily", "unlimited", "rapid"]
export function isMode(m: string): m is GameMode {
  return (MODES as string[]).includes(m)
}

// ---- deterministic, secret-keyed selection ----------------------------------
function hashInt(s: string): number {
  return createHmac("sha256", SECRET).update(s).digest().readUInt32BE(0)
}

// Memoized, de-duplicated answer-index sequence per game. Deterministic from
// SECRET + gameId, grown on demand and cached so building many slots (rapid
// mode) stays cheap.
const seqCache = new Map<string, number[]>()
function sequence(gameId: string, poolLen: number, count: number): number[] {
  let seq = seqCache.get(gameId)
  if (!seq) {
    seq = []
    seqCache.set(gameId, seq)
    if (seqCache.size > 64) seqCache.delete(seqCache.keys().next().value as string)
  }
  if (seq.length >= count) return seq
  const used = new Set(seq)
  for (let s = seq.length; s < count; s++) {
    let nonce = 0
    let idx = hashInt(`${gameId}|${s}|${nonce}`) % poolLen
    while (used.has(idx) && nonce < poolLen * 4) {
      nonce++
      idx = hashInt(`${gameId}|${s}|${nonce}`) % poolLen
    }
    used.add(idx)
    seq.push(idx)
  }
  return seq
}

function resolveAnswer(
  mode: GameMode,
  key: string,
  category: string,
  slot: number
): Person {
  // Daily draws from the curated, most-guessable pool; other modes use the
  // full category pool for variety.
  const p = mode === "daily" ? dailyPool(category) : pool(category)
  const gameId = `${mode}|${key}|${category}`
  return p[sequence(gameId, p.length, slot + 1)[slot]]
}

// ---- tokens (opaque handle for a single puzzle) -----------------------------
interface TokenData {
  mode: GameMode
  key: string
  category: string
  slot: number
  hard: boolean // hardcore: suppress hints
}
const b64url = {
  encode: (s: string) => Buffer.from(s, "utf8").toString("base64url"),
  decode: (s: string) => Buffer.from(s, "base64url").toString("utf8"),
}
export function encodeToken(t: TokenData): string {
  return b64url.encode(
    `${t.mode}␟${t.key}␟${t.category}␟${t.slot}␟${t.hard ? 1 : 0}`
  )
}
export function decodeToken(token: string): TokenData | null {
  try {
    const [mode, key, category, slot, hard] = b64url.decode(token).split("␟")
    if (!isMode(mode) || !isValidCategory(category)) return null
    const slotN = Number(slot)
    if (!Number.isInteger(slotN) || slotN < 0 || slotN >= SLOTS[mode]) return null
    return { mode, key, category, slot: slotN, hard: hard === "1" }
  } catch {
    return null
  }
}

// Hardcore is purely a presentation choice (hints on/off); it does NOT change
// the answer, so it's excluded from the game id (shared progress).
export function gameIdOf(t: TokenData): string {
  return `${t.mode}|${t.key}|${t.category}`
}

// ---- keys -------------------------------------------------------------------
/** UTC day — the daily puzzle is the same for everyone, set server-side. */
export function dailyKey(): string {
  return new Date().toISOString().slice(0, 10)
}
/** Fresh shareable seed for unlimited / rapid games. */
export function newSeed(): string {
  return randomBytes(6).toString("hex")
}

export function normalizeCategory(c: string | null | undefined): string {
  if (!c || !isValidCategory(c)) return ALL_CATEGORY
  return c
}

// ---- guess evaluation -------------------------------------------------------
function evaluateGuess(answer: Person, guess: Person): GuessFeedback {
  const correct = guess.id === answer.id
  const dist = haversine(
    guess.birth.lat,
    guess.birth.lon,
    answer.birth.lat,
    answer.birth.lon
  )
  const brg = bearing(
    guess.birth.lat,
    guess.birth.lon,
    answer.birth.lat,
    answer.birth.lon
  )
  const shared = guess.categories.filter((c) =>
    answer.categories.includes(c)
  ).length
  return {
    id: guess.id,
    name: guess.name,
    correct,
    distanceKm: Math.round(dist),
    direction: correct ? "🎯" : directionArrow(brg),
    proximity: proximityScore(dist),
    sharedCategories: shared,
    birth: {
      lat: guess.birth.lat,
      lon: guess.birth.lon,
      name: guess.birth.name,
      region: guess.birth.region,
      country: guess.birth.country,
    },
    yearDelta: Math.abs(guess.dob.year - answer.dob.year),
    yearHint:
      answer.dob.year < guess.dob.year
        ? "earlier"
        : answer.dob.year > guess.dob.year
          ? "later"
          : "same",
  }
}

function commonsImage(file: string | null): string | null {
  if (!file) return null
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    file
  )}?width=400`
}

function toReveal(p: Person): Reveal {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    image: commonsImage(p.image),
    dob: p.dob,
    dod: p.dod,
    birth: p.birth,
    death: p.death,
    wikipedia: `https://en.wikipedia.org/wiki/Special:GoToLinkedPage?site=enwiki&itemid=${p.id}`,
  }
}

// Progressive name hints, unlocked one per wrong guess.
function letters(s: string): number {
  return (s.match(/\p{L}/gu) ?? []).length
}
function hintLadder(name: string): Hint[] {
  const parts = name.trim().split(/\s+/)
  const first = parts[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1]! : ""
  return [
    { label: "First name", value: `${letters(first)} letters` },
    {
      label: "Last name",
      value: last ? `${letters(last)} letters` : "No surname",
    },
    { label: "First initial", value: (first[0] ?? "?").toUpperCase() },
    { label: "Surname initial", value: last ? last[0]!.toUpperCase() : "—" },
  ]
}

// ---- public puzzle view -----------------------------------------------------
export function buildPuzzle(t: TokenData, guessedIds: string[]): PublicPuzzle {
  const answer = resolveAnswer(t.mode, t.key, t.category, t.slot)
  const max = MAX_GUESSES[t.mode]
  const guesses = guessedIds
    .map((id) => BY_ID.get(id))
    .filter((p): p is Person => Boolean(p))
    .map((g) => evaluateGuess(answer, g))
  const solved = guesses.some((g) => g.correct)
  const finished = solved || guesses.length >= max

  const ladder = hintLadder(answer.name)
  const used = Math.min(guesses.length, ladder.length)
  const showHints = !t.hard && !finished
  const hints = showHints ? ladder.slice(0, used) : []
  const nextHint =
    showHints && used < ladder.length ? ladder[used]!.label : null

  return {
    token: encodeToken(t),
    slot: t.slot,
    birth: {
      lat: answer.birth.lat,
      lon: answer.birth.lon,
      name: answer.birth.name,
      region: answer.birth.region,
      country: answer.birth.country,
    },
    death: answer.death
      ? {
          lat: answer.death.lat,
          lon: answer.death.lon,
          name: answer.death.name,
          region: answer.death.region,
          country: answer.death.country,
        }
      : null,
    alive: answer.alive,
    dobDisplay: formatGameDate(answer.dob),
    dodDisplay: answer.dod ? formatGameDate(answer.dod) : null,
    maxGuesses: max,
    guesses,
    hints,
    nextHint,
    hardcore: t.hard,
    solved,
    finished,
    reveal: finished ? toReveal(answer) : null,
  }
}

/**
 * Apply a guess, enforcing limits server-side. Returns the updated guess list
 * to persist plus the new public puzzle view. Rejects guesses on finished
 * puzzles or unknown people.
 */
export function applyGuess(
  t: TokenData,
  prevGuessedIds: string[],
  guessId: string
): { guesses: string[]; puzzle: PublicPuzzle; accepted: boolean } {
  const current = buildPuzzle(t, prevGuessedIds)
  const valid = BY_ID.has(guessId)
  const already = prevGuessedIds.includes(guessId)
  if (current.finished || !valid || already) {
    return { guesses: prevGuessedIds, puzzle: current, accepted: false }
  }
  const next = [...prevGuessedIds, guessId]
  return { guesses: next, puzzle: buildPuzzle(t, next), accepted: true }
}
