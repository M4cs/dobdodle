export const CATEGORY_EMOJI: Record<string, string> = {
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

export const categoryEmoji = (c: string): string => CATEGORY_EMOJI[c] ?? "•"
