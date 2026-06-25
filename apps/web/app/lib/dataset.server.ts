// Server-only dataset access. This module imports the full people.json (which
// ties identities to coordinates/dates) and must NEVER be imported by client
// code. The `.server.ts` suffix guarantees React Router strips it from the
// browser bundle.
import data from "../data/people.json"
import type { NameEntry, Person } from "./types"

interface Dataset {
  generatedAt: string
  count: number
  categories: string[]
  people: Person[]
}

const DATASET = data as unknown as Dataset

export const PEOPLE: Person[] = DATASET.people
export const CATEGORIES: string[] = DATASET.categories
export const BY_ID = new Map(PEOPLE.map((p) => [p.id, p]))

export const ALL_CATEGORY = "All"

/** People belonging to a category, in stable fame order. */
export function pool(category: string): Person[] {
  if (category === ALL_CATEGORY) return PEOPLE
  return PEOPLE.filter((p) => p.categories.includes(category))
}

/**
 * Pool for the daily puzzle: the most-viewed (guessable) people in the
 * category. Falls back to the full category pool if too few are flagged.
 */
export function dailyPool(category: string): Person[] {
  const base = pool(category)
  const flagged = base.filter((p) => p.daily)
  return flagged.length >= 10 ? flagged : base.slice(0, 60)
}

export function isValidCategory(c: string): boolean {
  return c === ALL_CATEGORY || CATEGORIES.includes(c)
}

// Strip trailing "(...)" parentheticals and any 4-digit years so the search
// hint can't leak dates that would let players reverse the map.
function sanitizeHint(desc: string): string {
  return desc
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d{3,4}\b/g, "")
    .replace(/\bBC\b|\bAD\b/g, "")
    .replace(/[–-]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

let nameIndexCache: NameEntry[] | null = null

/** id + name + safe hint for the client autocomplete. No dates/coords. */
export function nameIndex(): NameEntry[] {
  if (nameIndexCache) return nameIndexCache
  nameIndexCache = PEOPLE.map((p) => ({
    id: p.id,
    name: p.name,
    hint: sanitizeHint(p.description),
  }))
  return nameIndexCache
}
