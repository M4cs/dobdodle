/**
 * Scrub building / house / institution names out of birth & death places.
 *
 * Wikidata often resolves a place of birth/death to a specific structure — a
 * house, hospital, palace, prison, bunker — and the label frequently names the
 * person ("Jimmy Carter House", "Adolf Hitler's birth house"), giving the answer
 * away outright. We replace any such name with the safe containing town/region
 * we already stored (falling back to the country). Coordinates are untouched, so
 * the map marker stays put — only the visible label changes.
 *
 * Run standalone to fix the shipped dataset:  bun run scripts/scrub-places.ts
 * Or import { scrubPlace } from the build pipeline so fresh builds stay clean.
 */

interface Placeish {
  name: string
  lat?: number
  lon?: number
  region?: string
  country?: string
}

// Structure / institution words. A place whose label contains one of these is
// treated as a building rather than a settlement.
const BUILDING_RE =
  /\b(house|home|homestead|birthplace|bunker|hospital|infirmary|clinic|sanatorium|sanitarium|asylum|hospice|manor|mansion|palace|chateau|château|castle|schloss|fortress|citadel|residence|farm|farmhouse|plantation|ranch|cottage|lodge|hall|villa|estate|centre|center|cemetery|graveyard|mausoleum|memorial|church|chapel|cathedral|basilica|abbey|priory|monastery|convent|minster|temple|mosque|synagogue|tower|theatre|theater|hotel|tavern|institute|institution|nursing|prison|jail|gaol|penitentiary|fort|barracks|garrison|studio|studios|arena|stadium|courthouse|university|college|school|academy|library|museum|hospital|workhouse|orphanage)\b/i

// Tokens from the person's name worth matching (skip particles, numerals, honorifics).
const SKIP_TOKEN =
  /^(the|of|and|von|van|der|den|de|di|da|del|della|la|le|el|al|bin|ibn|ben|saint|st|sir|dame|lord|lady|dr|jr|sr|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i

function nameTokens(personName: string): string[] {
  return personName
    .replace(/[.,’'`]/g, "")
    .split(/[\s-]+/)
    .filter((t) => t.length >= 3 && !SKIP_TOKEN.test(t))
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Does this label leak the person's name? */
function leaksName(text: string, personName: string): boolean {
  return nameTokens(personName).some((t) =>
    new RegExp(`\\b${escapeRe(t)}\\b`, "i").test(text)
  )
}

/** A label is unsafe if it names a structure or includes the person's name. */
function isUnsafe(text: string | undefined, personName: string): boolean {
  if (!text) return false
  return BUILDING_RE.test(text) || leaksName(text, personName)
}

/**
 * Return a copy of `place` with a settlement-level name, or the original if it
 * is already safe. Falls back region -> country; drops the now-redundant region.
 */
export function scrubPlace<T extends Placeish | null | undefined>(
  place: T,
  personName: string
): T {
  if (!place) return place
  if (!isUnsafe(place.name, personName)) return place
  if (place.region && !isUnsafe(place.region, personName)) {
    return { ...place, name: place.region, region: undefined }
  }
  if (place.country) {
    return { ...place, name: place.country, region: undefined }
  }
  return place // nothing safer to fall back to — leave as-is
}

async function main() {
  const path = new URL("../apps/web/app/data/people.json", import.meta.url).pathname
  const data = JSON.parse(await Bun.file(path).text())
  let changed = 0
  const examples: string[] = []
  for (const p of data.people as Array<any>) {
    for (const key of ["birth", "death"] as const) {
      const before = p[key]?.name
      const scrubbed = scrubPlace(p[key], p.name)
      if (scrubbed && scrubbed.name !== before) {
        p[key] = scrubbed
        changed++
        if (examples.length < 30) examples.push(`  ${p.name} · ${key}: "${before}" -> "${scrubbed.name}"`)
      }
    }
  }
  await Bun.write(path, JSON.stringify(data))
  console.log(`Scrubbed ${changed} place name(s).`)
  console.log(examples.join("\n"))
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
