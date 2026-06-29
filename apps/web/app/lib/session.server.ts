import { createCookieSessionStorage } from "react-router"

const SECRET = process.env.DOBDODLE_SECRET ?? "dobdodle-dev-secret-change-me"

// Signed (HMAC) session cookie. Holds per-game progress so guess limits are
// enforced server-side and can't be reset by the client. Answers are never
// stored here — only the ids the player has guessed.
export const { getSession, commitSession } = createCookieSessionStorage({
  cookie: {
    name: "_dobdodle",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secrets: [SECRET],
    maxAge: 60 * 60 * 24 * 30,
  },
})

// session shape: { games: { [gameId]: { [slot: number]: string[] /* guessed ids */ } } }
type Games = Record<string, Record<string, string[]>>
// Slots the player gave up on (revealed the answer instead of guessing it out).
type Forfeits = Record<string, Record<string, boolean>>

const MAX_TRACKED_GAMES = 40

export function readGuesses(
  session: Awaited<ReturnType<typeof getSession>>,
  gameId: string,
  slot: number
): string[] {
  const games = (session.get("games") ?? {}) as Games
  return games[gameId]?.[String(slot)] ?? []
}

export function writeGuesses(
  session: Awaited<ReturnType<typeof getSession>>,
  gameId: string,
  slot: number,
  guesses: string[]
): void {
  const games = { ...((session.get("games") ?? {}) as Games) }
  const game = { ...(games[gameId] ?? {}) }
  game[String(slot)] = guesses
  games[gameId] = game
  // Bound cookie growth: keep the most recently touched games only.
  const keys = Object.keys(games)
  if (keys.length > MAX_TRACKED_GAMES) {
    for (const k of keys.slice(0, keys.length - MAX_TRACKED_GAMES)) delete games[k]
  }
  session.set("games", games)
}

export function readForfeit(
  session: Awaited<ReturnType<typeof getSession>>,
  gameId: string,
  slot: number
): boolean {
  const f = (session.get("forfeits") ?? {}) as Forfeits
  return Boolean(f[gameId]?.[String(slot)])
}

export function writeForfeit(
  session: Awaited<ReturnType<typeof getSession>>,
  gameId: string,
  slot: number
): void {
  const f = { ...((session.get("forfeits") ?? {}) as Forfeits) }
  const game = { ...(f[gameId] ?? {}) }
  game[String(slot)] = true
  f[gameId] = game
  const keys = Object.keys(f)
  if (keys.length > MAX_TRACKED_GAMES) {
    for (const k of keys.slice(0, keys.length - MAX_TRACKED_GAMES)) delete f[k]
  }
  session.set("forfeits", f)
}
