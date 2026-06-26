import type { MetaDescriptor } from "react-router"

export const SITE = {
  name: "dobdodle",
  title: "dobdodle — guess the famous person",
  description:
    "A daily browser game: from a birthplace, a resting place, and two dates on a world map, name the famous person. Three modes with Wordle-style clues.",
  twitter: "@maxbridgland",
  authorName: "Max Bridgland",
  authorUrl: "https://x.com/maxbridgland",
  repo: "https://github.com/M4cs/dobdodle",
  image: "/embed.webp",
  locale: "en_US",
} as const

/** Canonical origin for absolute URLs. Honors PUBLIC_SITE_URL, then proxy
 *  headers, then the request URL — so it's correct on any deployment. */
export function siteOrigin(request: Request): string {
  const env = process.env.PUBLIC_SITE_URL
  if (env) return env.replace(/\/+$/, "")
  const url = new URL(request.url)
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")
  const host = request.headers.get("x-forwarded-host") ?? url.host
  return `${proto}://${host}`
}

/** Read the origin that the root loader resolved, from route matches. */
export function originFromMatches(
  matches: Array<{ id?: string; data?: unknown } | undefined>
): string {
  const root = matches.find((m) => m?.id === "root")
  const data = root?.data as { origin?: string } | undefined
  return data?.origin ?? ""
}

function websiteSchema(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: "dobdodle — date & place of birth/death guessing game",
    url: origin || undefined,
    description: SITE.description,
    inLanguage: "en",
    author: { "@type": "Person", name: SITE.authorName, url: SITE.authorUrl },
  }
}

export function videoGameSchema(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: SITE.name,
    url: origin || undefined,
    description: SITE.description,
    genre: ["Puzzle", "Trivia", "Geography"],
    gamePlatform: "Web Browser",
    applicationCategory: "GameApplication",
    operatingSystem: "Any (web browser)",
    inLanguage: "en",
    author: { "@type": "Person", name: SITE.authorName, url: SITE.authorUrl },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }
}

interface PageMetaOpts {
  origin: string
  path: string // clean pathname for canonical (no query)
  title?: string // page title (composed with the site name)
  description?: string
  image?: string
}

/** Full meta tag set for a page: title, description, canonical, Open Graph,
 *  Twitter card and a WebSite JSON-LD block. */
export function pageMeta({
  origin,
  path,
  title,
  description,
  image,
}: PageMetaOpts): MetaDescriptor[] {
  const fullTitle = title ? `${title} · ${SITE.name}` : SITE.title
  const desc = description ?? SITE.description
  const url = `${origin}${path}`
  const img = `${origin}${image ?? SITE.image}`
  return [
    { title: fullTitle },
    { name: "description", content: desc },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE.name },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: desc },
    { property: "og:url", content: url },
    { property: "og:locale", content: SITE.locale },
    { property: "og:image", content: img },
    { property: "og:image:type", content: "image/webp" },
    { property: "og:image:alt", content: SITE.title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: desc },
    { name: "twitter:image", content: img },
    { name: "twitter:creator", content: SITE.twitter },
    { name: "twitter:site", content: SITE.twitter },
    { "script:ld+json": websiteSchema(origin) },
  ]
}
