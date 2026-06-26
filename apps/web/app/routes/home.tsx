import { Link } from "react-router"
import { CalendarDays, Infinity as InfinityIcon, Zap } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { Route } from "./+types/home"
import { SiteHeader } from "../components/site-header"
import { WorldMap } from "../components/world-map"
import { CATEGORIES } from "../lib/dataset.server"
import { originFromMatches, pageMeta, videoGameSchema } from "../lib/seo"

export function meta({ matches }: Route.MetaArgs) {
  const origin = originFromMatches(matches)
  return [
    ...pageMeta({
      origin,
      path: "/",
      description:
        "Play dobdodle — a daily browser game where you name a famous person from their birthplace, place of death, and the dates, with Wordle-style clues on a world map.",
    }),
    { "script:ld+json": videoGameSchema(origin) },
  ]
}

const CATEGORY_ICONS: Record<string, string> = {
  "Actors & Film": "🎬",
  Artists: "🎨",
  Athletes: "🏅",
  "Business & Tech": "💼",
  "Faith & Religion": "🕊️",
  "Historical Figures": "🏛️",
  "Leaders & Politicians": "🗳️",
  Musicians: "🎵",
  "Science & Invention": "🔬",
  Writers: "✍️",
}

export function loader() {
  return { categories: CATEGORIES }
}

const MODES = [
  {
    to: "/daily",
    icon: CalendarDays,
    title: "Daily challenge",
    desc: "One mystery person a day, five guesses. Same puzzle for everyone.",
  },
  {
    to: "/unlimited",
    icon: InfinityIcon,
    title: "Unlimited",
    desc: "Five people, five guesses each. Start a fresh set whenever you like.",
  },
  {
    to: "/rapid",
    icon: Zap,
    title: "Rapid fire",
    desc: "Sixty seconds, one guess per person. Name as many as you can.",
  },
]

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20">
        <section className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700">
          <div className="absolute inset-0 opacity-30">
            <WorldMap
              className="h-full w-full"
              interactive={false}
              points={[
                { kind: "born", key: "a", lat: 48.8566, lon: 2.3522, pulse: true, heading: "", lines: [] },
                { kind: "died", key: "b", lat: 40.7128, lon: -74.006, pulse: true, heading: "", lines: [] },
              ]}
              connect
            />
          </div>
          <div className="relative px-6 py-14 text-center sm:py-20">
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-5xl">
              Where in the world
              <br />
              were they from?
            </h1>
            <p className="mx-auto mt-4 max-w-md text-balance text-muted-foreground">
              A birthplace, a resting place, two dates. From the map alone, can you
              name the famous person?
            </p>
            <div className="mt-7 flex justify-center gap-2">
              <Button asChild size="lg">
                <Link to="/daily" viewTransition>
                  <CalendarDays /> Play today’s puzzle
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/rapid" viewTransition>
                  <Zap /> Rapid fire
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:delay-150 motion-safe:duration-700 sm:grid-cols-3">
          {MODES.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              viewTransition
              className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow-md"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <m.icon className="size-5" />
              </span>
              <h2 className="font-heading font-semibold">{m.title}</h2>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 motion-safe:animate-in motion-safe:fade-in motion-safe:delay-300 motion-safe:duration-700">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Or pick a category
          </h2>
          <div className="flex flex-wrap gap-2">
            {loaderData.categories.map((cat) => (
              <Link
                key={cat}
                to={`/daily?cat=${encodeURIComponent(cat)}`}
                viewTransition
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span>{CATEGORY_ICONS[cat] ?? "•"}</span>
                {cat}
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-col items-center gap-1.5 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>
            Created by{" "}
            <a
              href="https://x.com/maxbridgland"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-2"
            >
              @maxbridgland
            </a>
          </p>
          <p>
            Data from Wikipedia &amp; Wikidata, ranked by page views. Built with
            React Router.
          </p>
        </footer>
      </main>
    </div>
  )
}
