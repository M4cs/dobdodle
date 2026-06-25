import { useEffect, useRef } from "react"
import { Link, useSearchParams } from "react-router"
import { cn } from "@workspace/ui/lib/utils"

const ICONS: Record<string, string> = {
  All: "🌍",
  "Actors & Film": "🎬",
  Artists: "🎨",
  Athletes: "🏅",
  "Business & Tech": "💼",
  "Faith & Religion": "🕊️",
  "Historical Figures": "🏛️",
  "Leaders & Politicians": "🏛️",
  Musicians: "🎵",
  "Science & Invention": "🔬",
  Writers: "✍️",
}

export function CategoryBar({
  categories,
  active,
}: {
  categories: string[]
  active: string
}) {
  const [params] = useSearchParams()
  const scroller = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: 0 })

  function hrefFor(cat: string): string {
    const next = new URLSearchParams(params)
    if (cat === "All") next.delete("cat")
    else next.set("cat", cat)
    next.delete("seed") // changing category starts a fresh game in seeded modes
    const qs = next.toString()
    return qs ? `?${qs}` : "?"
  }

  // Map vertical wheel to horizontal scroll (so a mouse wheel works on desktop).
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      if (el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    const el = scroller.current
    if (!el) return
    drag.current = {
      active: true,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      moved: 0,
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const el = scroller.current
    if (!el || !drag.current.active) return
    const dx = e.clientX - drag.current.startX
    drag.current.moved += Math.abs(dx)
    el.scrollLeft = drag.current.startLeft - dx
  }
  function endDrag() {
    drag.current.active = false
  }

  return (
    <div className="relative -mx-4 sm:-mx-6">
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 sm:scroll-px-6 sm:px-6 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((cat) => (
          <Link
            key={cat}
            to={hrefFor(cat)}
            draggable={false}
            onClick={(e) => {
              // suppress navigation if this was a drag, not a tap
              if (drag.current.moved > 6) e.preventDefault()
            }}
            className={cn(
              "flex h-10 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-[0.95rem] font-medium whitespace-nowrap transition-colors",
              cat === active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground active:bg-muted"
            )}
          >
            <span className="text-base leading-none">{ICONS[cat] ?? "•"}</span>
            {cat}
          </Link>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-background to-transparent sm:w-6" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-background to-transparent sm:w-6" />
    </div>
  )
}
