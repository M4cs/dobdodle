import type { Route } from "./+types/daily"
import { DailyScreen } from "../components/daily-screen"
import { loadGame } from "../lib/play.server"
import { originFromMatches, pageMeta } from "../lib/seo"

export function meta({ matches }: Route.MetaArgs) {
  return pageMeta({
    origin: originFromMatches(matches),
    path: "/daily",
    title: "Daily challenge",
    description:
      "Today's dobdodle: identify the mystery famous person from their birthplace, place of death and dates. Five guesses, a new puzzle every day.",
  })
}

export async function loader({ request }: Route.LoaderArgs) {
  return loadGame(request, "daily")
}

export default function Daily({ loaderData }: Route.ComponentProps) {
  return <DailyScreen key={loaderData.category} data={loaderData} />
}
