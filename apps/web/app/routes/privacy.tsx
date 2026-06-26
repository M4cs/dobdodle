import { Link } from "react-router"
import type { Route } from "./+types/privacy"
import { SiteHeader } from "../components/site-header"
import { originFromMatches, pageMeta } from "../lib/seo"

export function meta({ matches }: Route.MetaArgs) {
  return pageMeta({
    origin: originFromMatches(matches),
    path: "/privacy",
    title: "Privacy",
    description:
      "dobdodle stores no personal information. All gameplay data is anonymous and kept purely for analytics, with nothing that links back to any player.",
  })
}

export default function Privacy() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        <div className="py-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Privacy policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The short version: we don’t know who you are, and we don’t want to.
          </p>
        </div>

        <div className="flex flex-col gap-6 text-[0.95rem] leading-relaxed text-foreground">
          <section className="rounded-xl border border-success/40 bg-success/5 p-4">
            <p className="font-medium">
              dobdodle does not collect or store any private or personal
              information about players. All information is anonymous and is kept
              purely for analytical purposes, with no link back to any individual
              player.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">
              What we store
            </h2>
            <p className="mt-2 text-muted-foreground">
              When you finish the daily puzzle, we save an anonymous result so we
              can show you how you compare to other players. Each record contains
              only:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>the date of the puzzle,</li>
              <li>the category played,</li>
              <li>your score (how many guesses you took, and whether you solved it).</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              That’s it. These records cannot be traced back to you.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">
              What we do <em>not</em> store
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>No names, emails, or accounts — there is no sign-up.</li>
              <li>No IP addresses, device identifiers, or location.</li>
              <li>No advertising or third-party tracking.</li>
              <li>Nothing that identifies you or links results back to you.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Cookies</h2>
            <p className="mt-2 text-muted-foreground">
              We use a single functional cookie to remember your progress in a game
              and to stop the daily puzzle from being replayed. It contains only
              anonymous game state, is never shared, and identifies no one. Your
              browser’s local storage is also used to remember your completed
              daily — again, only game state, never anything personal.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Analytics</h2>
            <p className="mt-2 text-muted-foreground">
              The anonymous scores described above let us show daily percentiles
              (“you finished ahead of X% of players”) and understand how the game
              is played in aggregate. Because the data is anonymous, we can’t — and
              won’t — produce a history for any individual.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Questions? Reach out at{" "}
              <a
                href="mailto:engineering@oglabs.dev"
                className="font-medium text-foreground underline underline-offset-2"
              >
                engineering@oglabs.dev
              </a>
              .
            </p>
          </section>

          <p className="pt-2 text-sm text-muted-foreground">
            <Link to="/" viewTransition className="underline underline-offset-2">
              ← Back to the game
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
