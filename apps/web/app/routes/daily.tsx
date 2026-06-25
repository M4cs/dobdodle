import type { Route } from "./+types/daily"
import { DailyScreen } from "../components/daily-screen"
import { loadGame } from "../lib/play.server"

export async function loader({ request }: Route.LoaderArgs) {
  return loadGame(request, "daily")
}

export default function Daily({ loaderData }: Route.ComponentProps) {
  return <DailyScreen key={loaderData.category} data={loaderData} />
}
