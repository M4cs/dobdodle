// Geography helpers shared by client and server. No secrets.

const R = 6371 // km

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/** Great-circle distance in km. */
export function haversine(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial bearing from A to B, degrees 0..360 (0 = north). */
export function bearing(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

const ARROWS = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"]

/** 8-point direction arrow for a bearing. */
export function directionArrow(deg: number): string {
  return ARROWS[Math.round(deg / 45) % 8]
}

/** Antipodal distance is ~20015 km; map distance to a 0..100 closeness score. */
export function proximityScore(km: number): number {
  const MAX = 20015
  return Math.max(0, Math.round((1 - km / MAX) * 100))
}

export function formatDistance(km: number): string {
  if (km < 1) return "0 km"
  if (km < 100) return `${Math.round(km)} km`
  return `${Math.round(km).toLocaleString()} km`
}

/** Equirectangular projection to a unit square (0..1), lon/lat -> x/y. */
export function project(lon: number, lat: number): { x: number; y: number } {
  return { x: (lon + 180) / 360, y: (90 - lat) / 180 }
}
