import { Link } from "react-router"
import { Globe2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { ThemeToggle } from "./theme-toggle"

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  )
}

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <Link to="/" viewTransition className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Globe2 className="size-4" />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">
            dobdodle
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {right}
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="View source on GitHub"
            title="View source on GitHub"
          >
            <a
              href="https://github.com/M4cs/dobdodle"
              target="_blank"
              rel="noreferrer"
            >
              <GitHubMark />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
