import type { NamedPoint, Place } from "./types"

type AnyPlace = Pick<Place, "name" | "region" | "country"> &
  Partial<Pick<NamedPoint, "name">>

/** "City, Region, Country" (skips parts that are missing). */
export function placeLabel(p: AnyPlace): string {
  return [p.name, p.region, p.country].filter(Boolean).join(", ")
}

/** "Region, Country" — the geographic context without the city. */
export function placeContext(p: AnyPlace): string {
  return [p.region, p.country].filter(Boolean).join(", ")
}

// ---- abbreviations + flags --------------------------------------------------
const US_STATES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC", "New York City": "NYC",
}

// First substring match wins; GB variants precede Ireland on purpose.
const COUNTRY_ISO: Array<[string, string]> = [
  ["United States", "US"], ["Confederate States", "US"],
  ["United Kingdom", "GB"], ["Great Britain", "GB"], ["Northern Ireland", "GB"],
  ["England", "GB"], ["Scotland", "GB"], ["Wales", "GB"],
  ["Ireland", "IE"],
  ["Canada", "CA"], ["Australia", "AU"], ["New Zealand", "NZ"],
  ["France", "FR"], ["French", "FR"],
  ["Germany", "DE"], ["Prussia", "DE"], ["Bavaria", "DE"], ["Saxony", "DE"],
  ["German", "DE"], ["Italy", "IT"], ["Italian", "IT"],
  ["Spain", "ES"], ["Portugal", "PT"], ["Netherlands", "NL"], ["Holland", "NL"],
  ["Belgium", "BE"], ["Luxembourg", "LU"], ["Austria", "AT"], ["Switzerland", "CH"],
  ["Sweden", "SE"], ["Norway", "NO"], ["Denmark", "DK"], ["Finland", "FI"],
  ["Iceland", "IS"], ["Greece", "GR"], ["Poland", "PL"], ["Bohemia", "CZ"],
  ["Czech", "CZ"], ["Hungary", "HU"],
]

function flagFromIso(iso: string): string {
  return String.fromCodePoint(
    ...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

export function countryFlag(country?: string): string {
  if (!country) return ""
  const hit = COUNTRY_ISO.find(([m]) => country.includes(m))
  return hit ? flagFromIso(hit[1]) : ""
}

/** Compact place for a stat card: "City, ST" plus a country flag. */
export function placeShort(p: AnyPlace): { text: string; flag: string } {
  const region = p.region ? (US_STATES[p.region] ?? p.region) : undefined
  return {
    text: [p.name, region].filter(Boolean).join(", "),
    flag: countryFlag(p.country),
  }
}
