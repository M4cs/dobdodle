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
}

export type GameMode = "daily" | "unlimited" | "rapid"

/** A progressively-revealed clue about the answer's name. */
export interface Hint {
  label: string
  value: string
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
  maxGuesses: number
  guesses: GuessFeedback[]
  hints: Hint[]
  nextHint: string | null // label of the hint unlocked by the next guess
  hardcore: boolean
  solved: boolean
  finished: boolean
  reveal: Reveal | null
}

export interface GuessFeedback {
  id: string
  name: string
  correct: boolean
  distanceKm: number
  direction: string // 8-point arrow toward the answer's birthplace
  proximity: number // 0..100, higher = closer
  sharedCategories: number
  birth: NamedPoint // guessed person's birthplace
  yearDelta: number | null
  yearHint: "earlier" | "later" | "same" | null // answer born earlier/later
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
