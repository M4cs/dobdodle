import type { Route } from "./+types/unlimited"
import { UnlimitedScreen } from "../components/unlimited-screen"
import { loadGame } from "../lib/play.server"

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
