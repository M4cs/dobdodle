# dobdodle

A Worldle-for-people guessing game. You're shown a birthplace, a resting place,
and the dates of birth and death on a flat world map — from that alone, name the
famous person. Built on React Router 7 (SSR), Tailwind v4 and a shadcn
`@workspace/ui` package.

## Game modes

- **Daily** — one mystery person per day, five guesses. The same puzzle for
  everyone (seeded by the UTC date, server-side).
- **Unlimited** — five people, five guesses each. Start a fresh, shareable set
  anytime (seed lives in the URL).
- **Rapid fire** — 60 seconds, one guess per person, name as many as you can.

Each mode can be filtered to a **category** (Musicians, Athletes, Leaders &
Politicians, Historical Figures, …) derived from Wikidata occupations.

Everyone in the dataset is **deceased** — each puzzle has both a birth and a
death marker. The daily is drawn from the ~300 most-viewed (most guessable)
people so it stays winnable within five tries.

## How guessing works

Pick a person from the autocomplete. A wrong guess tells you the distance and
compass direction from that person's birthplace to the answer's, plus a
closeness score — so you can triangulate, Worldle-style.

**Progressive hints** unlock as you spend guesses: 1st → first-name length,
2nd → last-name length, 3rd → first initial, 4th → surname initial. Flip on
**Hardcore** (the toggle on the daily/unlimited screens, or `?hard=1`) to play
with no hints at all.

The daily result is also saved to **localStorage**: a finished daily can't be
replayed (even if the session cookie is cleared), and in-progress play is
restored when you come back.

When a game ends, a **Share** button copies a spoiler-free, Wordle-style result
(a proximity grid of 🟩🟨⬜ squares + direction arrows, plus a link) — using the
native share sheet on mobile and the clipboard elsewhere.

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

`people.json` is committed, but you can regenerate it (top ~1000 most-viewed
English Wikipedia people, enriched from Wikidata):

```bash
bun run data
```

The pipeline (`scripts/build-dataset.ts`) aggregates Wikimedia pageviews, keeps
humans with a birth date + located birthplace, attaches birth/death
coordinates, and buckets occupations into categories.

## Develop

```bash
bun install
DOBDODLE_SECRET=dev-secret bun run dev   # http://localhost:5173
```
