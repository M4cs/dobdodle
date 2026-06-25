import { cn } from "@workspace/ui/lib/utils"
import { CategoryBar } from "./category-bar"
import { ModeNav } from "./mode-nav"
import { SiteHeader } from "./site-header"
import type { GameData } from "../lib/play.server"

export function GameShell({
  data,
  title,
  subtitle,
  action,
  hideCategories = false,
  children,
}: {
  data: GameData
  title: string
  subtitle: React.ReactNode
  action?: React.ReactNode
  hideCategories?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh">
      <SiteHeader right={<ModeNav />} />
      <main className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="text-[0.95rem] text-muted-foreground">{subtitle}</p>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {!hideCategories && (
          <CategoryBar categories={data.categories} active={data.category} />
        )}
        <div
          className={cn(
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
            hideCategories ? "" : "mt-6"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
