"use client"

import { type ChartSegment, PriceLineChart } from "@/components/charts/PriceLineChart"
import type { CurrencySegment } from "@/lib/currency-stitch"
import type { PricePoint } from "@/lib/types"

// priceoverview body: currency-aware line + gradient fill + volume bars.
// `segments` arrives already broken on currency boundaries by the hook guard —
// this body never re-stitches or blends across a switch.
export function PriceOverviewBody({ segments }: { segments: CurrencySegment<PricePoint>[] }) {
  // Map each currency segment to drawable chart points, dropping null samples
  // (gaps) but keeping the segment's currency intact.
  const chartSegments: ChartSegment[] = segments
    .map((seg) => ({
      currency: seg.currency,
      points: seg.points
        .filter((p) => (p.median ?? p.lowest) !== null)
        .map((p) => ({
          tMs: new Date(p.t).getTime(),
          price: (p.median ?? p.lowest) as number,
          currency: p.currency,
        })),
    }))
    .filter((seg) => seg.points.length > 0)

  const allPoints = segments.flatMap((s) => s.points).filter((p) => p.volume !== null)
  const totalDrawable = chartSegments.reduce((n, s) => n + s.points.length, 0)

  if (totalDrawable < 2) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-text-tertiary">
        Not enough samples yet
      </div>
    )
  }

  const recentVolume = allPoints.slice(-50)
  const maxVolume = Math.max(...recentVolume.map((p) => p.volume ?? 0), 1)

  return (
    <div className="flex h-full flex-col">
      {/* currency-aware line + gradient fill */}
      <div className="min-h-0 flex-1 px-1">
        <PriceLineChart segments={chartSegments} />
      </div>

      {/* volume bars */}
      <div className="mask-linear-fade flex h-10 items-end justify-between gap-[1px] px-2 opacity-30">
        {recentVolume.map((p, i) => (
          <div
            key={i}
            className="flex-1 bg-volume transition-opacity hover:opacity-100"
            style={{ height: `${Math.max(4, ((p.volume ?? 0) / maxVolume) * 100)}%` }}
            title={`vol ${p.volume ?? 0}`}
          />
        ))}
      </div>
    </div>
  )
}
