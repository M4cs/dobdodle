// Postgres access for anonymous daily-score analytics. Stores ONLY the day,
// category and score — no IP, no user agent, no identifier of any kind, and
// nothing that links a row back to a player. Every call degrades gracefully:
// if DATABASE_URL is unset or the database is unreachable, the game keeps
// working and percentile stats are simply omitted.
import postgres from "postgres"

type Sql = ReturnType<typeof postgres>

// Survive dev HMR without leaking connections.
const g = globalThis as unknown as { __dobdodleSql?: Sql | null }

function client(): Sql | null {
  if (g.__dobdodleSql !== undefined) return g.__dobdodleSql
  const url = process.env.DATABASE_URL
  if (!url) {
    g.__dobdodleSql = null
    return null
  }
  const internal =
    url.includes(".railway.internal") ||
    url.includes("localhost") ||
    url.includes("127.0.0.1")
  g.__dobdodleSql = postgres(url, {
    ssl: internal ? false : "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  })
  return g.__dobdodleSql
}

let schemaReady: Promise<void> | null = null
function ensureSchema(db: Sql): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`
        CREATE TABLE IF NOT EXISTS daily_scores (
          id BIGSERIAL PRIMARY KEY,
          day DATE NOT NULL,
          category TEXT NOT NULL,
          guesses SMALLINT NOT NULL,
          solved BOOLEAN NOT NULL,
          score SMALLINT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`
      await db`
        CREATE INDEX IF NOT EXISTS idx_daily_scores_day_cat
          ON daily_scores (day, category)`
    })().catch((e) => {
      schemaReady = null
      throw e
    })
  }
  return schemaReady
}

// Lower score = better. Solved players score their guess count (1..5);
// players who ran out of guesses score one worse than the max.
export function scoreFor(guesses: number, solved: boolean, maxGuesses = 5): number {
  return solved ? guesses : maxGuesses + 1
}

/** Record one anonymous daily result. Returns false (no-op) if no DB. */
export async function recordDailyScore(
  day: string,
  category: string,
  guesses: number,
  solved: boolean
): Promise<boolean> {
  const db = client()
  if (!db) return false
  try {
    await ensureSchema(db)
    const score = scoreFor(guesses, solved)
    await db`
      INSERT INTO daily_scores (day, category, guesses, solved, score)
      VALUES (${day}, ${category}, ${guesses}, ${solved}, ${score})`
    return true
  } catch (e) {
    console.error("[dobdodle/db] recordDailyScore failed:", (e as Error).message)
    return false
  }
}

export interface Percentile {
  beatPct: number // % of today's players you finished ahead of
  total: number // players who have finished this daily
}

/** Where the given score ranks among today's players for this category. */
export async function dailyPercentile(
  day: string,
  category: string,
  score: number
): Promise<Percentile | null> {
  const db = client()
  if (!db) return null
  try {
    await ensureSchema(db)
    const rows = await db<{ worse: number; total: number }[]>`
      SELECT
        count(*) FILTER (WHERE score > ${score})::int AS worse,
        count(*)::int AS total
      FROM daily_scores
      WHERE day = ${day} AND category = ${category}`
    const { worse, total } = rows[0]
    if (!total) return null
    return { beatPct: Math.round((worse / total) * 100), total }
  } catch (e) {
    console.error("[dobdodle/db] dailyPercentile failed:", (e as Error).message)
    return null
  }
}
