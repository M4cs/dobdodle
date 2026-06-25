import type { PublicPuzzle } from "./types"

// Wordle/Worldle-style shareable results. Spoiler-free: no names or places, so
// the link can be shared without giving the answer away.

const CAT_EMOJI: Record<string, string> = {
  All: "🌍",
  "Actors & Film": "🎬",
  Artists: "🎨",
  Athletes: "🏅",
  "Business & Tech": "💼",
  "Faith & Religion": "🕊️",
  "Historical Figures": "🏛️",
  "Leaders & Politicians": "🗳️",
  Musicians: "🎵",
  "Science & Invention": "🔬",
  Writers: "✍️",
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function shortDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

function origin(): string {
  return typeof window !== "undefined" ? window.location.origin : ""
}

function catLabel(category: string): string {
  const emoji = CAT_EMOJI[category] ?? "•"
  return category === "All" ? emoji : `${emoji} ${category}`
}

// Five squares encoding a guess's closeness (each = 20%), then a direction.
function guessRow(g: PublicPuzzle["guesses"][number]): string {
  if (g.correct) return "🟩🟩🟩🟩🟩 🎯"
  const full = Math.floor(g.proximity / 20)
  const rem = g.proximity % 20
  let s = ""
  for (let i = 0; i < 5; i++) {
    if (i < full) s += "🟩"
    else if (i === full && rem >= 10) s += "🟨"
    else s += "⬜"
  }
  return `${s} ${g.direction}`
}

export function shareDaily(
  puzzle: PublicPuzzle,
  category: string,
  dayKey: string
): string {
  const score = puzzle.solved ? `${puzzle.guesses.length}/${puzzle.maxGuesses}` : `X/${puzzle.maxGuesses}`
  const grid = puzzle.guesses.map(guessRow).join("\n")
  const link = `${origin()}/daily${category !== "All" ? `?cat=${encodeURIComponent(category)}` : ""}`
  return `dobdodle ${catLabel(category)} · Daily ${shortDate(dayKey)}\n${score}\n\n${grid}\n\n${link}`
}

export function shareUnlimited(
  puzzles: PublicPuzzle[],
  category: string,
  seed: string | null
): string {
  const solved = puzzles.filter((p) => p.solved).length
  const line = puzzles.map((p) => (p.solved ? "🟩" : "⬛")).join("")
  const params = new URLSearchParams()
  if (seed) params.set("seed", seed)
  if (category !== "All") params.set("cat", category)
  const link = `${origin()}/unlimited${params.toString() ? `?${params}` : ""}`
  return `dobdodle ${catLabel(category)} · Unlimited\n${line}  ${solved}/${puzzles.length}\n\n${link}`
}

export function shareRapid(
  solved: number,
  answered: number,
  category: string,
  seed: string | null
): string {
  const params = new URLSearchParams()
  if (seed) params.set("seed", seed)
  if (category !== "All") params.set("cat", category)
  const link = `${origin()}/rapid${params.toString() ? `?${params}` : ""}`
  return `dobdodle ${catLabel(category)} · Rapid ⚡\n🎯 ${solved} correct in 60s (${answered} guessed)\n\n${link}`
}
