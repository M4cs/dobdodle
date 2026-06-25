import { NavLink } from "react-router"
import { cn } from "@workspace/ui/lib/utils"

const MODES = [
  { to: "/daily", label: "Daily" },
  { to: "/unlimited", label: "Unlimited" },
  { to: "/rapid", label: "Rapid" },
]

export function ModeNav() {
  return (
    <nav className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {MODES.map((m) => (
        <NavLink
          key={m.to}
          to={m.to}
          className={({ isActive }) =>
            cn(
              "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          {m.label}
        </NavLink>
      ))}
    </nav>
  )
}
