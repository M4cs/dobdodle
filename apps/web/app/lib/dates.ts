import type { GameDate } from "./types"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** Human-readable date honoring Wikidata precision and BCE years. */
export function formatGameDate(d: GameDate): string {
  const absYear = Math.abs(d.year)
  const era = d.year < 0 ? " BC" : ""
  const yearStr = `${absYear}${era}`
  if (d.precision <= 9) return yearStr // year or coarser
  const [, mm, dd] = d.iso.replace(/^-/, "").split("-")
  const month = MONTHS[parseInt(mm, 10) - 1] ?? ""
  if (d.precision === 10) return `${month} ${yearStr}` // month precision
  return `${parseInt(dd, 10)} ${month} ${yearStr}` // day precision
}

/** Compact year label, e.g. "1879" or "44 BC". */
export function yearLabel(d: GameDate): string {
  return d.year < 0 ? `${Math.abs(d.year)} BC` : `${d.year}`
}
