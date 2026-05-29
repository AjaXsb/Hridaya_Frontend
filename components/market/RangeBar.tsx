"use client"

import { useState } from "react"
import { rangePositionFraction, selectRangeView } from "@/lib/derive"
import { formatPriceInCurrency } from "@/lib/format"
import { type ItemSnapshot, type RangeKey, RANGE_KEYS } from "@/lib/types"
import { cn } from "@/lib/utils"

// Cross-cutting overlay available to every card. Short windows (5m/1H) read live
// snapshots in native currency; long windows (1D/1W/All) read USD history. A
// subtle marker states which source — so the AWP's EUR-live / USD-history split
// is labeled, not hidden.
export function RangeBar({ snapshot, refMs }: { snapshot: ItemSnapshot; refMs: number }) {
  const [selected, setSelected] = useState<RangeKey>("1H")
  const view = selectRangeView(snapshot, selected, refMs)
  const fraction = rangePositionFraction(view)

  return (
    <div className="px-4 py-2 border-t border-border-subtle">
      <div className="flex items-center justify-between gap-3">
        {/* Range window selector */}
        <div className="flex items-center gap-0.5 rounded border border-border-subtle bg-bg-base p-0.5">
          {RANGE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={cn(
                "min-w-[30px] rounded px-1.5 py-0.5 font-mono text-[10px] font-medium transition-colors",
                selected === key
                  ? "bg-ui-selected text-white shadow-sm"
                  : "text-text-tertiary hover:bg-bg-panel hover:text-text-primary",
              )}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Source marker */}
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              view.source === "live" ? "bg-status-live animate-pulse" : "bg-volume",
            )}
          />
          <span className="text-text-tertiary">
            {view.source === "live" ? `LIVE · ${view.currency}` : `HISTORY · ${view.currency}`}
          </span>
          {view.partial && <span className="text-spread">PARTIAL</span>}
          {view.currencyBreak && (
            <span className="text-spread" title="Window crossed a currency switch; earlier different-currency points excluded, not blended">
              ↯ {view.currency} ONLY
            </span>
          )}
        </div>
      </div>

      {/* Low ——•—— High bar */}
      <div className="mt-2">
        {view.degraded ? (
          <div className="font-mono text-[10px] text-text-tertiary">{view.degraded}</div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-right font-mono text-[10px] text-text-tertiary">
              {formatPriceInCurrency(view.low, view.currency)}
            </span>
            <div className="relative h-1 flex-1 rounded-full bg-bg-base">
              <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-price-down/40 via-text-tertiary/20 to-price-up/40" />
              {fraction !== null && (
                <div
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bg-deepest bg-text-primary shadow"
                  style={{ left: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
                  title="Current within range"
                />
              )}
            </div>
            <span className="w-16 shrink-0 font-mono text-[10px] text-text-tertiary">
              {formatPriceInCurrency(view.high, view.currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
