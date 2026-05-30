"use client"

import { LightweightPriceChart } from "@/components/charts/LightweightPriceChart"
import type { CurrencySegment } from "@/lib/currency-stitch"
import type { PriceTimelinePoint, RangeKey } from "@/lib/types"

// priceoverview body: the long price_history backbone + thin live tip as one
// currency-aware line (with volume), rendered by lightweight-charts.
//
// `segments` arrives already broken on currency boundaries by the hook guard.
// Same currency throughout → one segment → one seamless line. This body never
// re-stitches or blends across a switch; it just hands the segments to the chart.
export function PriceOverviewBody({
  segments,
  rangeKey,
  refMs,
}: {
  segments: CurrencySegment<PriceTimelinePoint>[]
  rangeKey: RangeKey
  refMs: number
}) {
  const totalPoints = segments.reduce((n, s) => n + s.points.length, 0)

  if (totalPoints < 2) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-text-tertiary">
        Not enough samples yet
      </div>
    )
  }

  return (
    <div className="h-full w-full px-1 py-1">
      <LightweightPriceChart segments={segments} rangeKey={rangeKey} refMs={refMs} />
    </div>
  )
}
