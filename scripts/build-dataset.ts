/**
 * Builds apps/web/app/data/people.json — the dataset that powers dobdodle.
 *
 * Pipeline:
 *  1. Aggregate the most-viewed English Wikipedia articles across many months
 *     (Wikimedia Pageviews API) to get a fame-ranked candidate list.
 *  2. Resolve candidates (in rank order) to Wikidata items, keeping only humans
 *     (P31=Q5) that have a date + place of birth with coordinates.
 *  3. Attach place coordinates (birth + death) and derive game categories from
 *     occupations (P106).
 *  4. Stop once TARGET people are collected, then write the JSON.
 *
 * Run:  bun run scripts/build-dataset.ts
 * Tune: TARGET, MONTHS below.
 */

import { scrubPlace } from "./scrub-places"

const UA = "dobdodle-build/0.2 (engineering@oglabs.dev)"
// Roster is global and spans all of history: famous figures the world over,
// from antiquity (Caesar, Cleopatra, Genghis Khan) through explorers (Columbus)
// to the modern day. Fame is still ranked by English-Wikipedia pageviews, which
// surfaces globally-recognised names. A deep pool feeds the Hard difficulty.
const TARGET = 700
const OUT = new URL("../apps/web/app/data/people.json", import.meta.url).pathname

// ---- months to aggregate pageviews over (YYYY/MM) ----------------------------
function monthRange(start: string, end: string): string[] {
  const [sy, sm] = start.split("-").map(Number)
  const [ey, em] = end.split("-").map(Number)
  const out: string[] = []
  let y = sy
  let m = sm
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}/${String(m).padStart(2, "0")}`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}
const MONTHS = monthRange("2024-01", "2026-05")
// The daily pool is ranked by "recent" views — who's currently in the public
// eye — using the most recent months, rather than all-time totals.
const RECENT_MONTHS = new Set(monthRange("2026-03", "2026-05"))

// ---- tiny resilient JSON fetch ----------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJSON<T = any>(url: string, tries = 4): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } })
      if (res.status === 429 || res.status >= 500) {
        await sleep(800 * (i + 1))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return (await res.json()) as T
    } catch (e) {
      if (i === tries - 1) throw e
      await sleep(800 * (i + 1))
    }
  }
  throw new Error("unreachable")
}

// ============================================================================
// 1. Fame-ranked candidate titles
// ============================================================================
const EXCLUDE_PREFIX = [
  "Main_Page",
  "Special:",
  "Wikipedia:",
  "Portal:",
  "Help:",
  "Template:",
  "Category:",
  "File:",
  "Talk:",
  "User:",
]

interface Candidate {
  title: string
  views: number // all-time (fame)
  recent: number // recent months only (current relevance)
}

async function gatherCandidates(): Promise<Candidate[]> {
  const views = new Map<string, number>()
  const recent = new Map<string, number>()
  for (const month of MONTHS) {
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${month}/all-days`
    const isRecent = RECENT_MONTHS.has(month)
    try {
      const data = await getJSON<any>(url)
      const articles = data?.items?.[0]?.articles ?? []
      for (const a of articles) {
        const t: string = a.article
        if (EXCLUDE_PREFIX.some((p) => t.startsWith(p))) continue
        if (t.includes(":")) continue
        views.set(t, (views.get(t) ?? 0) + a.views)
        if (isRecent) recent.set(t, (recent.get(t) ?? 0) + a.views)
      }
      process.stdout.write(isRecent ? "+" : ".")
    } catch {
      process.stdout.write("x")
    }
    await sleep(120)
  }
  process.stdout.write("\n")
  return [...views.entries()]
    .map(([title, v]) => ({ title, views: v, recent: recent.get(title) ?? 0 }))
    .sort((a, b) => b.views - a.views)
}

// ============================================================================
// 2/3. Resolve to Wikidata humans
// ============================================================================
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// title -> QID (handles redirects + normalization)
async function titlesToQids(titles: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const group of chunk(titles, 50)) {
    const url =
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=` +
      encodeURIComponent(group.join("|"))
    const data = await getJSON<any>(url)
    const q = data.query ?? {}
    const norm = new Map<string, string>() // normalized/redirect -> original
    for (const n of q.normalized ?? []) norm.set(n.to, n.from)
    for (const r of q.redirects ?? []) norm.set(r.to, norm.get(r.from) ?? r.from)
    for (const p of Object.values<any>(q.pages ?? {})) {
      const qid = p.pageprops?.wikibase_item
      if (!qid) continue
      const original = norm.get(p.title) ?? p.title
      map.set(original.replace(/ /g, "_"), qid)
    }
    await sleep(120)
  }
  return map
}

type Claims = Record<string, any[]>
const mainValues = (claims: Claims, p: string) =>
  (claims[p] ?? [])
    .filter((s) => s.mainsnak?.datavalue)
    .map((s) => s.mainsnak.datavalue.value)

interface RawPerson {
  qid: string
  title: string
  views: number
  recent: number
  name: string
  description: string
  dob: any
  dod: any | null
  birthQid: string | null
  deathQid: string | null
  occQids: string[]
  mannerQids: string[] // P1196 manner of death
  causeQids: string[] // P509 cause of death
  imageFile: string | null
}

async function fetchEntities(qids: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>()
  for (const group of chunk(qids, 50)) {
    const url =
      `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels|descriptions&languages=en&ids=` +
      group.join("|")
    const data = await getJSON<any>(url)
    for (const [qid, e] of Object.entries<any>(data.entities ?? {})) {
      if (!(e as any).missing) out.set(qid, e)
    }
    await sleep(120)
  }
  return out
}

const Q_HUMAN = "Q5"

function entityToPerson(
  qid: string,
  title: string,
  views: number,
  recent: number,
  e: any
): RawPerson | null {
  const claims: Claims = e.claims ?? {}
  const isHuman = mainValues(claims, "P31").some((v) => v?.id === Q_HUMAN)
  if (!isHuman) return null
  const dob = mainValues(claims, "P569")[0]
  const birth = mainValues(claims, "P19")[0]
  const dod = mainValues(claims, "P570")[0]
  const death = mainValues(claims, "P20")[0]
  // Dead only: require date + place for BOTH birth and death.
  if (!dob || !birth?.id || !dod || !death?.id) return null
  const image = mainValues(claims, "P18")[0] ?? null
  return {
    qid,
    title,
    views,
    recent,
    name: e.labels?.en?.value ?? title.replace(/_/g, " "),
    description: e.descriptions?.en?.value ?? "",
    dob,
    dod,
    birthQid: birth.id,
    deathQid: death?.id ?? null,
    occQids: mainValues(claims, "P106")
      .map((v: any) => v?.id)
      .filter(Boolean),
    mannerQids: mainValues(claims, "P1196")
      .map((v: any) => v?.id)
      .filter(Boolean),
    causeQids: mainValues(claims, "P509")
      .map((v: any) => v?.id)
      .filter(Boolean),
    imageFile: image,
  }
}

// ============================================================================
// Places + categories
// ============================================================================
interface Place {
  name: string
  lat: number
  lon: number
  region?: string // admin area (state/province/county), P131
  country?: string // P17
}

// Original-case English labels for a set of QIDs.
async function fetchLabelMap(qids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const ents = await fetchEntities(qids)
  for (const [qid, e] of ents) {
    const l = e.labels?.en?.value
    if (l) out.set(qid, l)
  }
  return out
}

// US (and similar) cities resolve P131 to a county; promote those to the state.
const COUNTY_SUFFIX = /\b(County|Parish|Census Area|Borough)$/

// instance-of (P31) values that mean "a building/structure", not a settlement.
// A birth/death place that is one of these is demoted to its containing
// town/area (P131) so labels never read "Jimmy Carter House" or "Führerbunker".
const STRUCTURE_CLASSES = new Set<string>([
  "Q41176", // building
  "Q3947", // house
  "Q5773747", // historic house
  "Q879050", // manor house
  "Q11303", // skyscraper
  "Q16917", // hospital
  "Q16560", // palace
  "Q23413", // castle
  "Q751876", // château
  "Q1785071", // fortress
  "Q57821", // fortification
  "Q91122", // bunker
  "Q389959", // air-raid shelter
  "Q40357", // prison
  "Q44613", // monastery
  "Q16970", // church building
  "Q160742", // abbey
  "Q108325", // chapel
  "Q44539", // temple
  "Q1370598", // place of worship
  "Q24398318", // religious building
  "Q4989906", // monument
  "Q5003624", // memorial
  "Q39614", // cemetery
  "Q27686", // hotel
  "Q33506", // museum
])

async function fetchPlaces(qids: string[]): Promise<Map<string, Place>> {
  const ents = await fetchEntities(qids)
  const staged = new Map<
    string,
    { place: Place; countryQid?: string; regionQid?: string; structure: boolean }
  >()
  const regionQids = new Set<string>()
  const countryQids = new Set<string>()
  for (const [qid, e] of ents) {
    const coord = mainValues(e.claims ?? {}, "P625")[0]
    if (!coord || coord.globe !== "http://www.wikidata.org/entity/Q2") continue
    const countryQid = mainValues(e.claims ?? {}, "P17")[0]?.id
    const regionQid = mainValues(e.claims ?? {}, "P131")[0]?.id
    const structure = mainValues(e.claims ?? {}, "P31").some(
      (v: any) => v?.id && STRUCTURE_CLASSES.has(v.id)
    )
    if (countryQid) countryQids.add(countryQid)
    if (regionQid) regionQids.add(regionQid)
    staged.set(qid, {
      place: {
        name: e.labels?.en?.value ?? qid,
        lat: round(coord.latitude),
        lon: round(coord.longitude),
      },
      countryQid,
      regionQid,
      structure,
    })
  }

  // Resolve region entities to get their label + parent admin (for promotion).
  const regionEnts = await fetchEntities([...regionQids])
  const parentQids = new Set<string>()
  const region = new Map<string, { label?: string; parentQid?: string }>()
  for (const [qid, e] of regionEnts) {
    const parentQid = mainValues(e.claims ?? {}, "P131")[0]?.id
    region.set(qid, { label: e.labels?.en?.value, parentQid })
    if (parentQid) parentQids.add(parentQid)
  }
  const labels = await fetchLabelMap([...countryQids, ...parentQids])

  const out = new Map<string, Place>()
  for (const [qid, { place, countryQid, regionQid, structure }] of staged) {
    const country = countryQid ? labels.get(countryQid) : undefined
    let regionLabel = regionQid ? region.get(regionQid)?.label : undefined
    // Promote a US-style county to its state (parent admin).
    if (
      regionLabel &&
      country === "United States" &&
      COUNTY_SUFFIX.test(regionLabel)
    ) {
      const parentQid = region.get(regionQid!)?.parentQid
      const state = parentQid ? labels.get(parentQid) : undefined
      if (state) regionLabel = state
    }
    // A building/structure: drop it in favour of the town/area it sits in. The
    // coordinates stay (still inside that town), only the label changes.
    if (structure && regionLabel) {
      out.set(qid, { ...place, name: regionLabel, region: undefined, country })
      continue
    }
    if (regionLabel && (regionLabel === place.name || regionLabel === country)) {
      regionLabel = undefined
    }
    out.set(qid, { ...place, region: regionLabel, country })
  }
  return out
}

const round = (n: number) => Math.round(n * 1e4) / 1e4

// occupation keyword -> category
const CATEGORY_RULES: Record<string, string[]> = {
  Musicians: [
    "singer", "musician", "composer", "songwriter", "rapper", "guitarist",
    "pianist", "drummer", "bassist", "dj", "conductor", "violinist", "cellist",
    "record producer", "lyricist", "vocalist",
  ],
  Artists: [
    "painter", "sculptor", "artist", "illustrator", "photographer",
    "designer", "architect", "printmaker", "draughtsperson", "ceramist",
  ],
  "Actors & Film": [
    "actor", "actress", "film director", "filmmaker", "screenwriter",
    "film producer", "comedian", "voice actor",
  ],
  "Business & Tech": [
    "businessperson", "businesswoman", "entrepreneur", "business executive",
    "chief executive officer", "investor", "internet personality", "youtuber",
    "programmer", "content creator", "businessman",
  ],
  Writers: [
    "writer", "author", "poet", "novelist", "playwright", "journalist",
    "philosopher", "essayist", "historian", "biographer",
  ],
  "Leaders & Politicians": [
    "politician", "statesperson", "head of state", "monarch", "king", "queen",
    "emperor", "empress", "president", "prime minister", "diplomat",
    "revolutionary", "military officer", "general", "aristocrat", "sovereign",
    "nobleman", "noblewoman", "chancellor",
  ],
  "Science & Invention": [
    "physicist", "chemist", "biologist", "mathematician", "scientist",
    "inventor", "engineer", "astronomer", "economist", "psychologist",
    "computer scientist", "naturalist", "physician", "geologist", "researcher",
  ],
  Athletes: [
    "footballer", "basketball player", "tennis player", "athlete", "boxer",
    "cricketer", "racing driver", "swimmer", "sportsperson", "baseball player",
    "golfer", "wrestler", "cyclist", "ice hockey player", "gymnast",
    "association football player", "american football player",
  ],
  "Explorers & Pioneers": [
    "explorer", "navigator", "seafarer", "conquistador", "colonizer",
    "mountaineer", "aviator", "astronaut", "cosmonaut", "adventurer",
    "pioneer", "cartographer", "circumnavigator",
  ],
  "Faith & Religion": [
    "theologian", "religious figure", "saint", "pope", "prophet", "priest",
    "rabbi", "imam", "monk", "bishop", "missionary",
  ],
}

async function fetchOccupationLabels(qids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const ents = await fetchEntities(qids)
  for (const [qid, e] of ents) out.set(qid, (e.labels?.en?.value ?? "").toLowerCase())
  return out
}

// Match a single-word keyword on word boundaries (so "writer" doesn't match
// "songwriter"); multi-word keywords match as a contiguous phrase.
function occMatches(label: string, key: string): boolean {
  if (key.includes(" ")) return label.includes(key)
  return label.split(/[^a-z]+/).includes(key)
}
function categoriesFor(occLabels: string[], birthYear: number | null): string[] {
  const cats = new Set<string>()
  for (const [cat, keys] of Object.entries(CATEGORY_RULES)) {
    if (occLabels.some((l) => keys.some((k) => occMatches(l, k)))) cats.add(cat)
  }
  if (birthYear !== null && birthYear < 1900) cats.add("Historical Figures")
  return [...cats]
}

// ---- daily "shock factor" weight -------------------------------------------
// Bias the daily toward controversial / newsworthy deaths. 1 = natural/quiet,
// up to 6 = assassination, murder, execution, crash, overdose, etc.
const MANNER_WEIGHT: Record<string, number> = {
  Q149086: 6, // homicide
  Q132821: 6, // murder
  Q8454: 6, // capital punishment (execution)
  Q10737: 5, // suicide
  Q171558: 4, // accident
  Q855091: 4, // death in battle
  Q3739104: 1, // natural causes
}
const CAUSE_KEYWORDS: Array<[string, number]> = [
  ["assassination", 6], ["murder", 6], ["homicide", 6], ["lynching", 6],
  ["execution", 6], ["capital punishment", 6], ["hanging", 6], ["guillotine", 6],
  ["firing squad", 6], ["lethal injection", 6], ["electric chair", 6], ["beheading", 6],
  ["aviation accident", 6], ["plane crash", 6], ["aircraft", 6], ["helicopter", 6],
  ["overdose", 5], ["poisoning", 5], ["gunshot", 5], ["ballistic trauma", 5],
  ["shooting", 5], ["stabbing", 5], ["explosion", 5], ["bombing", 5],
  ["drowning", 4], ["drowned", 4], ["traffic collision", 4], ["motor vehicle", 4],
  ["motorcycle", 4], ["asphyxiation", 4], ["electrocution", 4], ["fire", 4],
  ["fall", 3],
]
function shockWeight(mannerQids: string[], causeLabels: string[]): number {
  let w = 1
  for (const q of mannerQids) w = Math.max(w, MANNER_WEIGHT[q] ?? 2)
  for (const l of causeLabels) {
    for (const [k, wt] of CAUSE_KEYWORDS) if (occMatches(l, k)) w = Math.max(w, wt)
  }
  return w
}

// ---- date parsing ------------------------------------------------------------
interface GameDate {
  iso: string // signed ISO-ish, e.g. "1879-03-14" or "-0044-03-15"
  year: number
  precision: number // 11=day, 10=month, 9=year, lower=coarser
}
function parseTime(v: any): GameDate | null {
  if (!v?.time) return null
  const m = /^([+-])(\d+)-(\d\d)-(\d\d)/.exec(v.time)
  if (!m) return null
  const sign = m[1] === "-" ? -1 : 1
  const year = sign * parseInt(m[2], 10)
  return {
    iso: `${sign < 0 ? "-" : ""}${m[2]}-${m[3]}-${m[4]}`,
    year,
    precision: v.precision ?? 11,
  }
}

// ============================================================================
// main
// ============================================================================
async function main() {
  console.log(`Aggregating pageviews across ${MONTHS.length} months...`)
  const candidates = await gatherCandidates()
  console.log(`  ${candidates.length} unique candidate articles`)

  const people: any[] = []
  const placeQids = new Set<string>()
  const occQids = new Set<string>()
  const causeQids = new Set<string>()
  const seenQid = new Set<string>()

  // Dead, well-known people are rare among top views, so resolve the whole
  // candidate list (in fame order) rather than stopping early.
  const BATCH = 200
  for (let i = 0; i < candidates.length; i += BATCH) {
    const slice = candidates.slice(i, i + BATCH)
    const titleViews = new Map(slice.map((c) => [c.title, c]))
    const qmap = await titlesToQids(slice.map((c) => c.title))
    const wanted = [...new Set([...qmap.values()])].filter((q) => !seenQid.has(q))
    wanted.forEach((q) => seenQid.add(q))
    const ents = await fetchEntities(wanted)
    // title->qid is keyed by title; invert qid->title(+views) keeping best views
    const qidViews = new Map<
      string,
      { title: string; views: number; recent: number }
    >()
    for (const [title, qid] of qmap) {
      const c = titleViews.get(title)
      const v = c?.views ?? 0
      const cur = qidViews.get(qid)
      if (!cur || v > cur.views) {
        qidViews.set(qid, { title, views: v, recent: c?.recent ?? 0 })
      }
    }
    for (const [qid, { title, views, recent }] of qidViews) {
      const e = ents.get(qid)
      if (!e) continue
      const p = entityToPerson(qid, title, views, recent, e)
      if (!p) continue
      people.push(p)
      placeQids.add(p.birthQid!)
      if (p.deathQid) placeQids.add(p.deathQid)
      p.occQids.forEach((q) => occQids.add(q))
      p.causeQids.forEach((q) => causeQids.add(q))
    }
    console.log(
      `  resolved ${Math.min(i + BATCH, candidates.length)}/${candidates.length} candidates -> ${people.length} people`
    )
  }

  people.sort((a, b) => b.views - a.views)

  console.log(`Fetching ${placeQids.size} places + ${occQids.size} occupations...`)
  const places = await fetchPlaces([...placeQids])
  const occLabels = await fetchOccupationLabels([...occQids])
  const causeLabels = await fetchOccupationLabels([...causeQids]) // lowercased

  // Require usable coordinates for BOTH birth and death (dead only). No era or
  // geography filter — the roster is global and spans all of history.
  const final: any[] = []
  for (const p of people) {
    if (final.length >= TARGET) break
    const birth = places.get(p.birthQid)
    const death = p.deathQid ? places.get(p.deathQid) : null
    if (!birth || !death) continue
    const dob = parseTime(p.dob)
    const dod = p.dod ? parseTime(p.dod) : null
    if (!dob || !dod) continue
    const occ = p.occQids.map((q: string) => occLabels.get(q) ?? "").filter(Boolean)
    const causes = p.causeQids
      .map((q: string) => causeLabels.get(q) ?? "")
      .filter(Boolean)
    final.push({
      id: p.qid,
      name: p.name,
      description: p.description,
      image: p.imageFile,
      dob,
      dod,
      // Strip building/house names that would give the person away.
      birth: scrubPlace(birth, p.name),
      death: scrubPlace(death, p.name),
      alive: false,
      categories: categoriesFor(occ, dob.year),
      weight: shockWeight(p.mannerQids, causes),
      recent: p.recent,
    })
  }

  // Overall fame order (all-time views) sets `rank` and the general pools.
  final.forEach((p, i) => (p.rank = i + 1))

  // The daily pool is the top people by RECENT views — currently in the public
  // eye (recent deaths, anniversaries, films, news) — so they're top of mind.
  const DAILY_POOL = 300
  const dailyIds = new Set(
    [...final]
      .sort((a, b) => b.recent - a.recent)
      .slice(0, DAILY_POOL)
      .map((p) => p.id)
  )
  final.forEach((p) => {
    p.daily = dailyIds.has(p.id)
    delete p.recent // internal ranking signal only
  })

  const categories = [...new Set(final.flatMap((p) => p.categories))].sort()
  const payload = {
    generatedAt: new Date().toISOString(),
    count: final.length,
    dailyPool: Math.min(DAILY_POOL, final.length),
    categories,
    people: final,
  }
  await Bun.write(OUT, JSON.stringify(payload))
  console.log(`\nWrote ${final.length} people -> ${OUT}`)
  console.log(`Daily-eligible pool: ${Math.min(DAILY_POOL, final.length)}`)
  console.log(`Categories: ${categories.join(", ")}`)
  for (const c of categories) {
    console.log(`  ${c}: ${final.filter((p) => p.categories.includes(c)).length}`)
  }
  const dramatic = final.filter((p) => p.weight >= 4)
  console.log(
    `\nShock-weighted (weight >= 4): ${dramatic.length}/${final.length} people`
  )
  console.log(
    `  e.g. ${dramatic.slice(0, 10).map((p) => `${p.name}(${p.weight})`).join(", ")}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
