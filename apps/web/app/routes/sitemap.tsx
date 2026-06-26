import type { Route } from "./+types/sitemap"
import { siteOrigin } from "../lib/seo"

const PAGES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/daily", priority: "0.9", changefreq: "daily" },
  { path: "/unlimited", priority: "0.8", changefreq: "weekly" },
  { path: "/rapid", priority: "0.8", changefreq: "weekly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
]

export function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request)
  const urls = PAGES.map(
    (p) =>
      `  <url><loc>${origin}${p.path}</loc>` +
      `<changefreq>${p.changefreq}</changefreq>` +
      `<priority>${p.priority}</priority></url>`
  ).join("\n")
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n</urlset>\n`
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
