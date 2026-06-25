import { data } from "react-router"
import type { Route } from "./+types/api.guess"
import { submitGuess } from "../lib/play.server"

export async function action({ request }: Route.ActionArgs) {
  const { result, headers } = await submitGuess(request)
  return data(result, headers ? { headers } : undefined)
}
