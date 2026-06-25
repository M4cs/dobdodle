import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Flame } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Toggles hardcore mode (no hints) via the `?hard=1` search param. The answer
 * and progress are unchanged — only hints are suppressed — so toggling
 * mid-game is safe.
 */
export function HardcoreToggle() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const on = params.get("hard") === "1"

  useEffect(() => {
    try {
      localStorage.setItem("dobdodle:hardcore", on ? "1" : "0")
    } catch {}
  }, [on])

  function toggle() {
    const next = new URLSearchParams(params)
    if (on) next.delete("hard")
    else next.set("hard", "1")
    const qs = next.toString()
    navigate(qs ? `?${qs}` : "?")
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={on}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        on
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
      title="Hardcore mode hides all hints"
    >
      <Flame className="size-3.5" />
      Hardcore
      <span className={cn("text-xs", on ? "opacity-80" : "opacity-60")}>
        {on ? "on" : "off"}
      </span>
    </button>
  )
}
