"use client"

import { formatClockTime, formatPriceInCurrency } from "@/lib/format"
import type { Currency, TradeEvent } from "@/lib/types"
import { cn } from "@/lib/utils"

// activity body: scrolling trade tape of fills, newest first. Null price/action
// fields render as a muted placeholder rather than breaking the row.
export function ActivityBody({ events, currency }: { events: TradeEvent[]; currency: Currency }) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-text-tertiary">
        No fills yet
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col font-mono text-[11px]">
      <div className="flex justify-between px-3 py-1 text-[9px] uppercase tracking-wider text-text-tertiary">
        <span>Time</span>
        <span>Action</span>
        <span>Price · {currency}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.map((e, i) => {
          const isSale = e.action?.toLowerCase() === "sold"
          return (
            <div
              key={`${e.t}-${i}`}
              className={cn(
                "flex items-center justify-between px-3 py-[3px] hover:bg-bg-hover",
                i === 0 && "bg-bg-base/40",
              )}
            >
              <span className="w-20 text-text-tertiary">{formatClockTime(e.t)}</span>
              <span
                className={cn(
                  "w-16 text-center uppercase tracking-wide",
                  e.action === null ? "text-text-tertiary" : isSale ? "text-price-up" : "text-text-secondary",
                )}
              >
                {e.action ?? "—"}
              </span>
              <span className={cn("text-right font-medium", isSale ? "text-price-up" : "text-text-primary")}>
                {formatPriceInCurrency(e.price, currency)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
