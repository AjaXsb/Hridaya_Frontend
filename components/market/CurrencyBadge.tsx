import type { Currency } from "@/lib/types"
import { cn } from "@/lib/utils"

// Native-currency badge. Steam regional prices aren't pure FX conversions, so
// the card's currency is shown, never normalized away.
export function CurrencyBadge({ currency, className }: { currency: Currency; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-border-subtle bg-bg-base px-1.5 py-0.5",
        "font-mono text-[10px] font-medium tracking-wider text-text-secondary",
        className,
      )}
      title={`Native currency: ${currency} (not FX-converted)`}
    >
      {currency}
    </span>
  )
}
