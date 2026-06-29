import { data } from "react-router"
import type { Route } from "./+types/api.reveal"
import { revealPuzzle } from "../lib/play.server"

export async function action({ request }: Route.ActionArgs) {
  const { result, headers } = await revealPuzzle(request)
  return data(result, headers ? { headers } : undefined)
}
