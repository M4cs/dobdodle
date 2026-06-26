import type { Route } from "./+types/llms"
import { SITE, siteOrigin } from "../lib/seo"

export function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request)
  const body = `# dobdodle

> ${SITE.description}

dobdodle is a free, daily browser guessing game in the style of Wordle and
Worldle. You are shown a famous (deceased) person's place of birth, place of
death, and the dates — plotted on an interactive world map — and you have to
name the person.

## How to play
- Search for a person and submit a guess.
- Each guess returns Wordle-style tiles comparing it to the hidden answer:
  birth place, birth year, death place, death year, age at death, and a
  popularity score. Green = exact match; numeric tiles show an up/down arrow
  toward the answer's value.
- The target's category (e.g. Musicians, Athletes, Leaders & Politicians) is
  shown from the start as a hint.

## Game modes
- Daily (${origin}/daily): one mystery person per day, five guesses, the same
  for everyone. Weighted toward controversial, newsworthy figures.
- Unlimited (${origin}/unlimited): five people, five guesses each, fresh sets
  on demand.
- Rapid fire (${origin}/rapid): 60 seconds, one guess per person, score as many
  as you can.

## About the data
People and facts come from Wikipedia and Wikidata: the most-viewed Western-world
figures born in 1800 or later. Each puzzle has both a birth and a death location.

## Links
- Play: ${origin}/
- Source code: ${SITE.repo}
- Author: ${SITE.authorName} (${SITE.authorUrl})
`
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
