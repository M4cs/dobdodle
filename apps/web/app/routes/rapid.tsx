import type { Route } from "./+types/rapid"
import { RapidScreen } from "../components/rapid-screen"
import { loadGame } from "../lib/play.server"

export async function loader({ request }: Route.LoaderArgs) {
  return loadGame(request, "rapid")
}

export default function Rapid({ loaderData }: Route.ComponentProps) {
  return (
    <RapidScreen key={`${loaderData.category}:${loaderData.seed}`} data={loaderData} />
  )
}
