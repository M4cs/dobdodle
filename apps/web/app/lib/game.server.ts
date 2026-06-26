// Authoritative game logic. Runs only on the server. The selection of which
// person answers a given (mode, key, category, slot) depends on a server-side
// SECRET, so the client — which has neither the dataset nor the secret — cannot
// reproduce the mapping or learn the answer ahead of a correct guess.
import { createHmac, randomBytes } from "node:crypto"
import { formatGameDate, yearLabel } from "./dates"
import {
  ALL_CATEGORY,
  BY_ID,
  dailyPool,
  isValidCategory,
  PEOPLE,
  pool,
} from "./dataset.server"
import type {
  Direction,
  GameMode,
  GuessFeedback,
  Person,
  Place,
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

// Deterministic float in [0, 1) from the secret-keyed hash.
function hashFloat(s: string): number {
  return hashInt(s) / 0x100000000
}

// Weighted, deterministic pick: people with a higher shock/controversy weight
// are proportionally more likely to be chosen for the daily.
function weightedPick(people: Person[], seed: string): Person {
  const total = people.reduce((sum, p) => sum + (p.weight || 1), 0)
  let target = hashFloat(seed) * total
  for (const p of people) {
    target -= p.weight || 1
    if (target < 0) return p
  }
  return people[people.length - 1]
}

function resolveAnswer(
  mode: GameMode,
  key: string,
  category: string,
  slot: number
): Person {
  if (mode === "daily") {
    // Daily draws from the curated pool, weighted toward controversial /
    // newsworthy deaths so they surface more often.
    return weightedPick(dailyPool(category), `daily|${key}|${category}|${slot}`)
  }
  // Other modes use uniform selection over the full category pool for variety.
  const p = pool(category)
  const gameId = `${mode}|${key}|${category}`
  return p[sequence(gameId, p.length, slot + 1)[slot]]
}

// ---- tokens (opaque handle for a single puzzle) -----------------------------
interface TokenData {
  mode: GameMode
  key: string
  category: string
  slot: number
}
const b64url = {
  encode: (s: string) => Buffer.from(s, "utf8").toString("base64url"),
  decode: (s: string) => Buffer.from(s, "base64url").toString("utf8"),
}
export function encodeToken(t: TokenData): string {
  return b64url.encode(`${t.mode}␟${t.key}␟${t.category}␟${t.slot}`)
}
export function decodeToken(token: string): TokenData | null {
  try {
    const [mode, key, category, slot] = b64url.decode(token).split("␟")
    if (!isMode(mode) || !isValidCategory(category)) return null
    const slotN = Number(slot)
    if (!Number.isInteger(slotN) || slotN < 0 || slotN >= SLOTS[mode]) return null
    return { mode, key, category, slot: slotN }
  } catch {
    return null
  }
}

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
// 0..100 fame score from the all-time rank (1 = most famous).
const POP_MAX = Math.max(1, PEOPLE.length - 1)
function popularity(p: Person): number {
  return Math.round((1 - (p.rank - 1) / POP_MAX) * 100)
}

function dirOf(answerVal: number, guessVal: number): Direction {
  return answerVal > guessVal ? "up" : answerVal < guessVal ? "down" : "same"
}

function samePlace(a?: Place | null, b?: Place | null): boolean {
  return !!a && !!b && a.lat === b.lat && a.lon === b.lon
}

// Age at death (lifespan), in years. Everyone in the dataset is deceased.
function ageOf(p: Person): number {
  return p.dod ? p.dod.year - p.dob.year : 0
}

function evaluateGuess(answer: Person, guess: Person): GuessFeedback {
  const aPop = popularity(answer)
  const gPop = popularity(guess)
  const aAge = ageOf(answer)
  const gAge = ageOf(guess)
  const deathYearMatch =
    !!guess.dod && !!answer.dod && guess.dod.year === answer.dod.year
  return {
    id: guess.id,
    name: guess.name,
    correct: guess.id === answer.id,
    birth: {
      lat: guess.birth.lat,
      lon: guess.birth.lon,
      name: guess.birth.name,
      region: guess.birth.region,
      country: guess.birth.country,
    },
    birthPlaceMatch: samePlace(guess.birth, answer.birth),
    birthYearLabel: yearLabel(guess.dob),
    birthYearMatch: guess.dob.year === answer.dob.year,
    birthYearDir: dirOf(answer.dob.year, guess.dob.year),
    death: guess.death
      ? {
          lat: guess.death.lat,
          lon: guess.death.lon,
          name: guess.death.name,
          region: guess.death.region,
          country: guess.death.country,
        }
      : null,
    deathPlaceMatch: samePlace(guess.death, answer.death),
    deathYearLabel: guess.dod ? yearLabel(guess.dod) : "—",
    deathYearMatch,
    deathYearDir:
      guess.dod && answer.dod ? dirOf(answer.dod.year, guess.dod.year) : "same",
    age: gAge,
    ageMatch: gAge === aAge,
    ageDir: dirOf(aAge, gAge),
    popularity: gPop,
    popularityMatch: Math.abs(aPop - gPop) <= 1,
    popularityDir: dirOf(aPop, gPop),
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
    categories: answer.categories,
    maxGuesses: max,
    guesses,
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
