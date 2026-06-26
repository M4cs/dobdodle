# dobdodle

A Worldle-for-people guessing game. You're shown a birthplace, a resting place,
and the dates of birth and death on a flat world map — from that alone, name the
famous person. Built on React Router 7 (SSR), Tailwind v4 and a shadcn
`@workspace/ui` package.

## Game modes

- **Daily** — one mystery person per day, five guesses. The same puzzle for
  everyone (seeded by the UTC date, server-side). Selection is **weighted toward
  controversial / newsworthy deaths** (assassinations, murders, overdoses,
  crashes, executions) via a per-person shock score derived from Wikidata
  manner/cause of death.
- **Unlimited** — five people, five guesses each. Start a fresh, shareable set
  anytime (seed lives in the URL).
- **Rapid fire** — 60 seconds, one guess per person, name as many as you can.

Each mode can be filtered to a **category** (Musicians, Athletes, Leaders &
Politicians, …) derived from Wikidata occupations.

The dataset is the **300 biggest, most-popular Western-world figures** (by
English-Wikipedia page views) who are **deceased** and **born in 1800 or later**
— so every answer is someone broadly recognisable, with both a birth and a death
marker.

## How guessing works

Pick a person from the autocomplete. Each guess returns a **Wordle-style row of
tiles** comparing it to the hidden answer:

- **Category, birth place, death place** — green if it matches, grey if not.
- **Birth year, death year** — green if the same year, otherwise grey with an
  ⬆️/⬇️ arrow showing whether the answer's is later/earlier.
- **Popularity** — a 0–100 fame score for your guess, with an arrow toward the
  answer's fame.

So you triangulate the person from the facts your guesses reveal.

The daily result is saved to **localStorage**: a finished daily can't be
replayed (even if the session cookie is cleared), and in-progress play is
restored when you come back.

When a game ends, a **Share** button copies a spoiler-free, Wordle-style result
(a grid of 🟩/⬜ squares — one per attribute match — plus a link) using the
native share sheet on mobile and the clipboard elsewhere.

When you finish the daily, you also see your **percentile** ("you finished ahead
of X% of today's players"). This is the only data we persist, and it is fully
anonymous — each row stores just the date, category and score, with nothing that
links back to a player (see `/privacy`). It needs a Postgres `DATABASE_URL`
(provided automatically on Railway); without one the game runs unchanged and the
percentile is hidden.

## Anti-cheat design

The answer is never sent to the browser.

- The dataset (`apps/web/app/data/people.json`) is imported only from
  `*.server.ts` modules, so it's stripped from the client bundle.
- Which person answers a given `(mode, key, category, slot)` is decided by an
  HMAC keyed with `DOBDODLE_SECRET`. The client has neither the dataset nor the
  secret, so it cannot reproduce the mapping.
- The client receives only map markers + date clues + an opaque token. Guesses
  are POSTed to `/api/guess`, validated on the server, and the reveal is
  returned only once the puzzle is finished.
- Guess limits are enforced in a signed session cookie, so they can't be reset
  from the client or brute-forced through the API.

Set `DOBDODLE_SECRET` in production (see `apps/web/.env.example`).

## Building the dataset

`people.json` is committed, but you can regenerate it:

```bash
bun run data
```

The pipeline (`scripts/build-dataset.ts`) aggregates Wikimedia page views, keeps
deceased humans with located birth + death places, then filters to the **top
300** most-viewed who are **born ≥ 1800** and from the **Western world**. It
attaches birth/death coordinates, resolves region/country (promoting US counties
to their state), and buckets occupations into categories. Tunables live at the
top of the script (`TARGET`, `MIN_BIRTH_YEAR`, `WESTERN`, `RECENT_MONTHS`).

## Develop

```bash
bun install
DOBDODLE_SECRET=dev-secret bun run dev   # http://localhost:5173
```
