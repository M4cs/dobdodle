import type { Route } from "./+types/unlimited"
import { UnlimitedScreen } from "../components/unlimited-screen"
import { loadGame } from "../lib/play.server"
import { originFromMatches, pageMeta } from "../lib/seo"

export function meta({ matches }: Route.MetaArgs) {
  return pageMeta({
    origin: originFromMatches(matches),
    path: "/unlimited",
    title: "Unlimited",
    description:
      "Unlimited dobdodle: guess five famous people from where and when they were born and died. Five guesses each, fresh sets anytime.",
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  return loadGame(request, "unlimited")
}

export default function Unlimited({ loaderData }: Route.ComponentProps) {
  return (
    <UnlimitedScreen
      key={`${loaderData.category}:${loaderData.seed}`}
      data={loaderData}
    />
  )
}
