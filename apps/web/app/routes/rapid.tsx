import type { Route } from "./+types/rapid"
import { RapidScreen } from "../components/rapid-screen"
import { loadGame } from "../lib/play.server"
import { originFromMatches, pageMeta } from "../lib/seo"

export function meta({ matches }: Route.MetaArgs) {
  return pageMeta({
    origin: originFromMatches(matches),
    path: "/rapid",
    title: "Rapid fire",
    description:
      "Rapid-fire dobdodle: 60 seconds, one guess per person — name as many famous figures as you can from their birth and death facts.",
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  return loadGame(request, "rapid")
}

export default function Rapid({ loaderData }: Route.ComponentProps) {
  return (
    <RapidScreen key={`${loaderData.category}:${loaderData.seed}`} data={loaderData} />
  )
}
