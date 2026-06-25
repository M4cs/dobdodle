import { useEffect, useRef, useState } from "react"
import { Maximize2, Minus, Plus } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import world from "../data/world.json"

export interface MapPoint {
  key: string
  lat: number
  lon: number
  kind: "born" | "died" | "both" | "guess" | "guess-correct"
  pulse?: boolean
  heading: string
  lines: string[]
}

interface WorldMapProps {
  points: MapPoint[]
  /** Draw a dashed line between the first born + died points. */
  connect?: boolean
  /** Decorative maps skip interactivity and auto-fit. */
  interactive?: boolean
  className?: string
}

// Equirectangular projection (lon/lat -> projected units).
const px = (lon: number) => lon + 180
const py = (lat: number) => 90 - lat
const WORLD = { x: 0, y: 6, w: 360, h: 140 }
const ASPECT = WORLD.w / WORLD.h
const MIN_W = 4 // most zoomed-in
const MAX_W = 360 // most zoomed-out
const FIT_MIN_SPAN = 10 // smallest auto-fit longitude span (degrees)

type View = { x: number; y: number; w: number; h: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function clampView(v: View): View {
  const w = clamp(v.w, MIN_W, MAX_W)
  const h = w / ASPECT
  return {
    w,
    h,
    x: clamp(v.x, -30, 360 + 30 - w),
    y: clamp(v.y, -20, 180 + 20 - h),
  }
}

function fitView(points: MapPoint[]): View {
  const fit = points.filter((p) => p.kind !== "guess" && p.kind !== "guess-correct")
  if (fit.length === 0) return { ...WORLD }
  const xs = fit.map((p) => px(p.lon))
  const ys = fit.map((p) => py(p.lat))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  let w = Math.max((maxX - minX) * 1.8, FIT_MIN_SPAN)
  let h = Math.max((maxY - minY) * 1.8, FIT_MIN_SPAN / ASPECT)
  if (w / h < ASPECT) w = h * ASPECT
  else h = w / ASPECT
  return clampView({ x: cx - w / 2, y: cy - h / 2, w, h })
}

type Geom = { type: "Polygon" | "MultiPolygon"; coordinates: any }

let LAND_PATH: string | null = null
function landPath(): string {
  if (LAND_PATH) return LAND_PATH
  const parts: string[] = []
  const ring = (r: number[][]) => {
    if (r.length < 2) return
    parts.push(`M${px(r[0][0]).toFixed(1)} ${py(r[0][1]).toFixed(1)}`)
    for (let i = 1; i < r.length; i++) {
      parts.push(`L${px(r[i][0]).toFixed(1)} ${py(r[i][1]).toFixed(1)}`)
    }
    parts.push("Z")
  }
  for (const g of (world as any).geometries as Geom[]) {
    if (g.type === "Polygon") g.coordinates.forEach(ring)
    else g.coordinates.forEach((poly: number[][][]) => poly.forEach(ring))
  }
  LAND_PATH = parts.join("")
  return LAND_PATH
}

const DOT: Record<MapPoint["kind"], string> = {
  born: "bg-born",
  died: "bg-died",
  both: "",
  guess: "bg-guess",
  "guess-correct": "bg-success",
}

export function WorldMap({
  points,
  connect,
  interactive = true,
  className,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>(() =>
    interactive ? fitView(points) : { ...WORLD }
  )
  const [hover, setHover] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const active = pinned ?? hover

  // Re-fit when the answer's places change (new puzzle), not on every guess.
  const fitKey = points
    .filter((p) => p.kind !== "guess" && p.kind !== "guess-correct")
    .map((p) => `${p.lat},${p.lon}`)
    .join("|")
  useEffect(() => {
    if (interactive) setView(fitView(points))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, interactive])

  // Pan / pinch state
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const panLast = useRef<{ x: number; y: number } | null>(null)
  const pinchPrev = useRef<number | null>(null)
  const moved = useRef(0)

  function toView(
    clientX: number,
    clientY: number
  ): { fx: number; fy: number; rect: DOMRect } | null {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      fx: (clientX - rect.left) / rect.width,
      fy: (clientY - rect.top) / rect.height,
      rect,
    }
  }

  function zoomAround(fx: number, fy: number, factor: number) {
    setView((v) => {
      const w = clamp(v.w * factor, MIN_W, MAX_W)
      const h = w / ASPECT
      const worldX = v.x + fx * v.w
      const worldY = v.y + fy * v.h
      return clampView({ x: worldX - fx * w, y: worldY - fy * h, w, h })
    })
  }

  // Native non-passive wheel handler so we can prevent page scroll.
  useEffect(() => {
    if (!interactive) return
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const m = toView(e.clientX, e.clientY)
      if (!m) return
      zoomAround(m.fx, m.fy, e.deltaY > 0 ? 1.12 : 0.89)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive])

  function onPointerDown(e: React.PointerEvent) {
    if (!interactive) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = 0
    if (pointers.current.size === 1) panLast.current = { x: e.clientX, y: e.clientY }
    else panLast.current = null
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!interactive || !pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]

    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const midX = (pts[0].x + pts[1].x) / 2
      const midY = (pts[0].y + pts[1].y) / 2
      if (pinchPrev.current != null) {
        const m = toView(midX, midY)
        if (m) zoomAround(m.fx, m.fy, pinchPrev.current / dist)
      }
      pinchPrev.current = dist
      return
    }

    if (panLast.current) {
      const dx = e.clientX - panLast.current.x
      const dy = e.clientY - panLast.current.y
      moved.current += Math.abs(dx) + Math.abs(dy)
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setView((v) =>
          clampView({
            ...v,
            x: v.x - (dx / rect.width) * v.w,
            y: v.y - (dy / rect.height) * v.h,
          })
        )
      }
      panLast.current = { x: e.clientX, y: e.clientY }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchPrev.current = null
    if (pointers.current.size === 0) panLast.current = null
  }

  const leftPct = (lon: number) => ((px(lon) - view.x) / view.w) * 100
  const topPct = (lat: number) => ((py(lat) - view.y) / view.h) * 100

  const born = points.find((m) => m.kind === "born" || m.kind === "both")
  const died = points.find((m) => m.kind === "died")

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden bg-[var(--color-map-ocean)]",
        interactive && "touch-none select-none cursor-grab active:cursor-grabbing",
        className
      )}
      style={{ aspectRatio: `${WORLD.w} / ${WORLD.h}` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => moved.current < 6 && setPinned(null)}
    >
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={landPath()}
          fill="var(--color-map-land)"
          stroke="var(--color-map-stroke)"
          strokeWidth={0.18}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {connect && born && died && born !== died && (
          <line
            x1={px(born.lon)}
            y1={py(born.lat)}
            x2={px(died.lon)}
            y2={py(died.lat)}
            stroke="var(--color-muted-foreground)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.55}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {points.map((p) => {
        const l = leftPct(p.lon)
        const t = topPct(p.lat)
        if (l < -8 || l > 108 || t < -8 || t > 108) return null
        const isActive = active === p.key
        const isGuess = p.kind === "guess" || p.kind === "guess-correct"
        return (
          <div key={p.key} className="absolute" style={{ left: `${l}%`, top: `${t}%` }}>
            <button
              type="button"
              data-marker
              aria-label={`${p.heading}: ${p.lines.join(", ")}`}
              disabled={!interactive}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerEnter={() => interactive && setHover(p.key)}
              onPointerLeave={() =>
                interactive && setHover((h) => (h === p.key ? null : h))
              }
              onClick={(e) => {
                if (!interactive) return
                e.stopPropagation()
                setPinned((prev) => (prev === p.key ? null : p.key))
              }}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
                interactive ? "size-9 cursor-pointer" : "pointer-events-none size-5"
              )}
            >
              {p.pulse && (
                <span
                  className={cn(
                    "absolute inline-flex rounded-full opacity-40 motion-safe:animate-ping",
                    isGuess ? "size-3" : "size-4",
                    p.kind === "both" ? "bg-born" : DOT[p.kind]
                  )}
                />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full ring-2 ring-[var(--color-background)] transition-transform",
                  isGuess ? "size-3" : "size-4",
                  DOT[p.kind],
                  isActive && "scale-125"
                )}
                style={
                  p.kind === "both"
                    ? {
                        background:
                          "linear-gradient(135deg, var(--color-born) 0 50%, var(--color-died) 50% 100%)",
                      }
                    : undefined
                }
              />
            </button>
            {isActive && <MapTooltip leftPct={l} topPct={t} point={p} />}
          </div>
        )
      })}

      {interactive && (
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <ZoomButton label="Zoom in" onClick={() => zoomAround(0.5, 0.5, 0.7)}>
            <Plus className="size-4" />
          </ZoomButton>
          <ZoomButton label="Zoom out" onClick={() => zoomAround(0.5, 0.5, 1.42)}>
            <Minus className="size-4" />
          </ZoomButton>
          <ZoomButton label="Fit places" onClick={() => setView(fitView(points))}>
            <Maximize2 className="size-3.5" />
          </ZoomButton>
        </div>
      )}
    </div>
  )
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="flex size-8 items-center justify-center rounded-lg border border-border bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted"
    >
      {children}
    </button>
  )
}

function MapTooltip({
  leftPct,
  topPct,
  point,
}: {
  leftPct: number
  topPct: number
  point: MapPoint
}) {
  const below = topPct < 30
  const align = leftPct < 22 ? "left" : leftPct > 78 ? "right" : "center"
  const x = align === "left" ? "0" : align === "right" ? "-100%" : "-50%"
  return (
    <div
      className="pointer-events-none absolute z-20 w-max max-w-[14rem]"
      style={{
        transform: `translate(${x}, ${below ? "0.85rem" : "-100%"})`,
        marginTop: below ? 0 : "-0.85rem",
      }}
    >
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {point.heading}
        </p>
        {point.lines.map((line, i) => (
          <p
            key={i}
            className={cn(
              i === 0 ? "text-sm font-medium" : "text-sm text-muted-foreground"
            )}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
