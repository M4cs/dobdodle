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
