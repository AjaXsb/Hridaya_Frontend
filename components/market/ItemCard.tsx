"use client"

import { TrendingDown, TrendingUp } from "lucide-react"
import { CurrencyBadge } from "@/components/market/CurrencyBadge"
import { RangeBar } from "@/components/market/RangeBar"
import { ActivityBody } from "@/components/market/bodies/ActivityBody"
import { HistogramBody } from "@/components/market/bodies/HistogramBody"
import { PriceOverviewBody } from "@/components/market/bodies/PriceOverviewBody"
import { TerminalLoader } from "@/components/ui/loader"
import { useItemSnapshot } from "@/hooks/use-tracked-items"
import {
  computePercentChange,
  computeRsi,
  deriveChangeReference,
  deriveCurrentPrice,
  deriveDisplayCurrency,
} from "@/lib/derive"
import { formatPriceInCurrency, formatRelativeTime, formatSignedPercent } from "@/lib/format"
import type { ItemSnapshotView } from "@/hooks/use-tracked-items"
import { MOCK_NOW } from "@/mocks"
import type { ChangeReference, TrackedItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const STREAM_LABEL: Record<TrackedItem["stream"], string> = {
  priceoverview: "PRICE",
  histogram: "DEPTH",
  activity: "TAPE",
}

const CHANGE_REFERENCE_LABEL: Record<ChangeReference, string> = {
  "session-start": "since session start",
  "24h": "since 24h ago",
  "currency-start": "since currency switch",
}

// The single card shell. Constant chrome around a body chosen by the item's
// stream — the one architectural rule everything hangs off.
export function ItemCard({ item }: { item: TrackedItem }) {
  const { data: snapshot, isPending } = useItemSnapshot(item)

  if (isPending || !snapshot) {
    return <TerminalLoader text="LOADING SNAPSHOT" />
  }

  const currentPrice = deriveCurrentPrice(snapshot.body)
  const displayCurrency = deriveDisplayCurrency(snapshot.body, item.currency)
  const { reference, price: referencePrice } = deriveChangeReference(snapshot, MOCK_NOW)
  const percentChange = computePercentChange(currentPrice, referencePrice)
  const rsi = computeRsi(snapshot.body, item.currency)
  const hasChange = percentChange !== null
  const isBullish = (percentChange ?? 0) >= 0
  const changeColor = !hasChange ? "text-text-secondary" : isBullish ? "text-price-up" : "text-price-down"

  return (
    <div className="flex h-full flex-col">
      {/* --- chrome: header --- */}
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium tracking-wide text-text-primary" title={item.marketHashName}>
              {item.marketHashName}
            </h3>
            <CurrencyBadge currency={displayCurrency} />
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span
              className={cn(
                "font-mono text-3xl font-bold tracking-tight",
                hasChange ? changeColor : "text-text-primary",
              )}
            >
              {formatPriceInCurrency(currentPrice, displayCurrency)}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 rounded bg-bg-base/50 px-1.5 py-0.5 font-mono text-sm font-medium",
                changeColor,
              )}
            >
              {/* drop the arrow entirely when there's no change value */}
              {hasChange && (isBullish ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />)}
              {formatSignedPercent(percentChange)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-text-tertiary">{CHANGE_REFERENCE_LABEL[reference]}</span>
        </div>
        <span className="shrink-0 rounded border border-border-subtle bg-bg-base px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-text-tertiary">
          {STREAM_LABEL[item.stream]}
        </span>
      </div>

      {/* --- body: discriminated union --- */}
      <div className="mt-2 min-h-0 flex-1 border-t border-border-subtle">
        <CardBodyRenderer snapshot={snapshot} item={item} />
      </div>

      {/* --- chrome: range bar overlay --- */}
      <RangeBar snapshot={snapshot} refMs={MOCK_NOW} />

      {/* --- chrome: footer stats --- */}
      <CardFooter snapshot={snapshot} rsi={rsi} />
    </div>
  )
}

// Renders exactly one of three bodies based on the stream discriminant.
function CardBodyRenderer({ snapshot, item }: { snapshot: ItemSnapshotView; item: TrackedItem }) {
  const body = snapshot.body
  switch (body.kind) {
    case "priceoverview":
      // priceSegments is the hook's currency-broken view of body.series.
      return <PriceOverviewBody segments={snapshot.priceSegments ?? []} />
    case "histogram":
      return <HistogramBody snapshot={body.snapshot} currency={item.currency} />
    case "activity":
      return <ActivityBody events={body.events} currency={item.currency} />
  }
}

function CardFooter({ snapshot, rsi }: { snapshot: ItemSnapshotView; rsi: number | null }) {
  return (
    <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2 font-mono text-[10px] text-text-tertiary">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-live" />
        <span>POLL {snapshot.item.pollIntervalSec}s</span>
      </div>
      <div className="flex items-center gap-4">
        {/* RSI only when there are honestly enough points to compute it */}
        {rsi !== null && (
          <span>
            RSI <span className="text-text-secondary">{rsi.toFixed(0)}</span>
          </span>
        )}
        <span>updated {formatRelativeTime(snapshot.lastUpdateT, MOCK_NOW)}</span>
      </div>
    </div>
  )
}
