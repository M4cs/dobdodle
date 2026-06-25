import { useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import type { NameEntry } from "../lib/types"

interface GuessSearchProps {
  names: NameEntry[]
  onGuess: (id: string) => void
  disabled?: boolean
  excludeIds?: Set<string>
  placeholder?: string
  autoFocus?: boolean
}

const MAX_RESULTS = 7

export function GuessSearch({
  names,
  onGuess,
  disabled,
  excludeIds,
  placeholder = "Guess who…",
  autoFocus,
}: GuessSearchProps) {
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 1) return []
    const starts: NameEntry[] = []
    const contains: NameEntry[] = []
    for (const n of names) {
      if (excludeIds?.has(n.id)) continue
      const lower = n.name.toLowerCase()
      if (lower.startsWith(q)) starts.push(n)
      else if (lower.includes(q)) contains.push(n)
      if (starts.length >= MAX_RESULTS) break
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS)
  }, [query, names, excludeIds])

  function choose(entry: NameEntry) {
    onGuess(entry.id)
    setQuery("")
    setOpen(false)
    setActive(0)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const pick = results[active] ?? results[0]
      if (pick) choose(pick)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          className="h-11 pl-9 text-base"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-baseline justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(r)
                }}
              >
                <span className="truncate text-sm font-medium">{r.name}</span>
                {r.hint && (
                  <span className="shrink-0 truncate text-xs text-muted-foreground">
                    {r.hint}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
