import { useState } from "react"
import { Check, Share2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

/**
 * Copies the Wordle-style result to the clipboard (and uses the native share
 * sheet when available). Pass a builder so the text is composed at click time
 * with the real window.location.
 */
export function ShareButton({
  getText,
  label = "Share result",
  className,
}: {
  getText: () => string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function onClick() {
    const text = getText()
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // last resort: select-and-copy via a temporary textarea
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {}
      document.body.removeChild(ta)
    }
  }

  return (
    <Button onClick={onClick} size="lg" className={className}>
      {copied ? <Check /> : <Share2 />}
      {copied ? "Copied!" : label}
    </Button>
  )
}
