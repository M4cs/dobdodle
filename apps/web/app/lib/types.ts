// Shared types. Nothing here is secret; safe to send to the client EXCEPT the
// full Person record (which ties an identity to coordinates/dates). The client
// only ever receives PublicPuzzle / GuessFeedback / Reveal.

export interface GameDate {
  iso: string // "1879-03-14" or "-0044-03-15" (leading - = BCE)
  year: number // signed; negative = BCE
  precision: number // 11=day, 10=month, 9=year, <9 coarser
}

export interface Place {
  name: string
  lat: number
  lon: number
  region?: string // state/province/county (Wikidata P131)
  country?: string // Wikidata P17
}

export interface Person {
  id: string
  name: string
  description: string
  image: string | null
  dob: GameDate
  dod: GameDate | null
  birth: Place
  death: Place | null
  alive: boolean
  categories: string[]
  rank: number
  daily: boolean // eligible for the daily puzzle (top-popularity)
  weight: number // daily selection weight (shock/controversy factor, 1..6)
}

export type GameMode = "daily" | "unlimited" | "rapid"

/** Anonymous daily-result standing shown after a daily finishes. */
export interface DailyStats {
  beatPct: number // % of today's players you finished ahead of
  total: number // players who have finished today's puzzle
  yourGuesses: number
  solved: boolean
}

export interface NamedPoint {
  lat: number
  lon: number
  name: string
  region?: string
  country?: string
}

/** A puzzle as seen by the client: markers + dates, never the identity. */
export interface PublicPuzzle {
  token: string
  slot: number
  birth: NamedPoint
  death: NamedPoint | null
  alive: boolean
  dobDisplay: string
  dodDisplay: string | null
  categories: string[] // the answer's categories, shown as a starting hint
  hint: string | null // one-line role hint, revealed on demand (never the name)
  maxGuesses: number
  guesses: GuessFeedback[]
  solved: boolean
  finished: boolean
  revealed: boolean // finished because the player gave up / asked to reveal
  reveal: Reveal | null
}

/** Whether the true answer's value is higher/lower than the guess's. */
export type Direction = "up" | "down" | "same"

/**
 * Wordle-style per-attribute comparison of a guess against the hidden answer.
 * `*Match` => exact match (green); numeric fields carry a direction arrow.
 */
export interface GuessFeedback {
  id: string
  name: string
  correct: boolean
  birth: NamedPoint // guessed person's birthplace (also used for the map marker)
  birthPlaceMatch: boolean
  birthYearLabel: string
  birthYearMatch: boolean
  birthYearDir: Direction
  death: NamedPoint | null
  deathPlaceMatch: boolean
  deathYearLabel: string
  deathYearMatch: boolean
  deathYearDir: Direction
  age: number // age at death (lifespan in years)
  ageMatch: boolean
  ageDir: Direction
  popularity: number // 0..100 (100 = most famous)
  popularityMatch: boolean
  popularityDir: Direction
}

export interface Reveal {
  id: string
  name: string
  description: string
  image: string | null
  dob: GameDate
  dod: GameDate | null
  birth: Place
  death: Place | null
  wikipedia: string
}

/** Lightweight entry for the client-side autocomplete (no dates/coords). */
export interface NameEntry {
  id: string
  name: string
  hint: string // occupation-ish descriptor, years stripped
}
