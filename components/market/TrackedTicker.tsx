"use client"

import { ArrowDownRight, ArrowUpRight, Radio } from "lucide-react"
import { useState } from "react"
import {
  computePercentChange,
  deriveChangeReference,
  deriveCurrentPrice,
  deriveDisplayCurrency,
} from "@/lib/derive"
import { formatPriceInCurrency, formatSignedPercent } from "@/lib/format"
import { MOCK_ITEM_SNAPSHOTS, MOCK_NOW } from "@/mocks"
import { cn } from "@/lib/utils"

// Repurposed hot-markets strip: now the tracked-item ticker. Native prices, no
// BTC/ETH filler, no hardcoded $.
export function TrackedTicker({ onItemClick }: { onItemClick?: (marketHashName: string) => void }) {
  const [isPaused, setIsPaused] = useState(false)

  const tickerItems = MOCK_ITEM_SNAPSHOTS.map((snap) => {
    const current = deriveCurrentPrice(snap.body)
    const { price: ref } = deriveChangeReference(snap, MOCK_NOW)
    const displayCurrency = deriveDisplayCurrency(snap.body, snap.item.currency)
    return {
      name: snap.item.marketHashName,
      price: formatPriceInCurrency(current, displayCurrency),
      percent: computePercentChange(current, ref),
    }
  })

  return (
    <div
      className="group relative flex h-12 shrink-0 select-none items-center overflow-hidden border-b border-border-default bg-bg-panel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-bg-panel to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-bg-panel to-transparent" />

      <div className="relative z-20 flex h-full shrink-0 items-center border-r border-border-subtle bg-bg-panel px-4">
        <Radio className="mr-2 h-4 w-4 animate-pulse text-ui-selected" />
        <span className="text-xs font-bold tracking-wide text-text-primary">TRACKED</span>
      </div>

      <div className="flex w-full overflow-hidden">
        <div
          className="animate-ticker flex items-center gap-8 whitespace-nowrap pl-8"
          style={{ animationPlayState: isPaused ? "paused" : "running" }}
        >
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, i) => {
            const hasChange = item.percent !== null
            const isPositive = (item.percent ?? 0) >= 0
            const changeColor = !hasChange ? "text-text-secondary" : isPositive ? "text-price-up" : "text-price-down"
            return (
              <button
                key={i}
                onClick={() => onItemClick?.(item.name)}
                className="flex cursor-pointer items-center gap-3 rounded px-2 py-1 transition-colors hover:bg-bg-base/50"
              >
                <span className="text-xs font-medium text-text-secondary">{item.name}</span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-text-primary">{item.price}</span>
                  <span className={cn("flex items-center", changeColor)}>
                    {hasChange &&
                      (isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                    {formatSignedPercent(item.percent)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }
        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
      `}</style>
    </div>
  )
}
