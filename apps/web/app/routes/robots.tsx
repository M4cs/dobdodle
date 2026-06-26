import type { Route } from "./+types/robots"
import { siteOrigin } from "../lib/seo"

export function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request)
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n")
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
