// Currency-aware price line. The connect-vs-break rule is already applied
// upstream (the hook segments by currency); this component just renders the
// segments it's handed:
//
//  - The MOST RECENT currency segment gets full axis scale and its own currency
//    gridlines, drawn at full opacity with a gradient fill.
//  - Earlier different-currency segments render as a faded, dashed, self-scaled
//    "earlier — different currency" tail. Never fitted onto the recent axis.
//  - At every currency boundary the line stops (no diagonal across the gap) and
//    a dashed seam marks the switch. Never two price scales on one axis.
//
// Geometry lives in an SVG (viewBox 0..100, non-uniform scale); text lives in an
// HTML overlay so labels aren't distorted.

import { formatPriceInCurrency } from "@/lib/format"
import type { Currency } from "@/lib/types"

export interface ChartPoint {
  tMs: number
  price: number
  currency: Currency
}

export interface ChartSegment {
  currency: Currency
  points: ChartPoint[]
}

const PAD_T = 6
const PLOT_BOTTOM = 86
const PLOT_H = PLOT_BOTTOM - PAD_T

interface Scale {
  min: number
  max: number
}

function scaleOf(points: ChartPoint[]): Scale {
  const prices = points.map((p) => p.price)
  let min = Math.min(...prices)
  let max = Math.max(...prices)
  if (min === max) {
    const pad = Math.abs(min) * 0.005 || 1
    min -= pad
    max += pad
  }
  return { min, max }
}

export function PriceLineChart({ segments }: { segments: ChartSegment[] }) {
  const nonEmpty = segments.filter((s) => s.points.length > 0)
  if (nonEmpty.length === 0) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-text-tertiary">
        No price points
      </div>
    )
  }

  const allPoints = nonEmpty.flatMap((s) => s.points)
  const tMin = allPoints[0].tMs
  const tMax = allPoints[allPoints.length - 1].tMs
  const tSpan = tMax - tMin || 1
  const xOf = (tMs: number) => ((tMs - tMin) / tSpan) * 100

  const recent = nonEmpty[nonEmpty.length - 1]
  const earlier = nonEmpty.slice(0, -1)
  const recentScale = scaleOf(recent.points)
  const recentRange = recentScale.max - recentScale.min

  // Recent segment: bullish vs bearish over its own first→last (same currency).
  const recentBullish = recent.points[recent.points.length - 1].price >= recent.points[0].price
  const recentColor = recentBullish ? "var(--price-up)" : "var(--price-down)"

  const yRecent = (price: number) => PAD_T + (1 - (price - recentScale.min) / recentRange) * PLOT_H

  // Seam x-positions: midpoint between the last point of a segment and the first
  // of the next (i.e. the currency boundary).
  const seams = nonEmpty.slice(1).map((seg, i) => {
    const prev = nonEmpty[i].points
    const lastPrev = prev[prev.length - 1].tMs
    const firstNext = seg.points[0].tMs
    return { x: xOf((lastPrev + firstNext) / 2), fromCurrency: nonEmpty[i].currency }
  })

  const recentLine = buildLinePath(recent.points.map((p) => ({ x: xOf(p.tMs), y: yRecent(p.price) })))
  const recentArea = `${recentLine} L ${xOf(recent.points[recent.points.length - 1].tMs).toFixed(2)} ${PLOT_BOTTOM} L ${xOf(recent.points[0].tMs).toFixed(2)} ${PLOT_BOTTOM} Z`

  // The recent axis sits ONLY against its own segment (right side), so its
  // gridlines/labels never span across the faded earlier tail.
  const recentStartX = xOf(recent.points[0].tMs)

  // y-axis ticks for the recent currency.
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const price = recentScale.max - f * recentRange
    return { price, top: PAD_T + f * PLOT_H }
  })

  // Each earlier (different-currency) segment gets its OWN faint scale ticks,
  // confined to its own x-range — making the two-scales fact unmistakable, not
  // just labeled. Self-scaled exactly like the tail line.
  const tailScales = earlier.map((seg) => {
    const s = scaleOf(seg.points)
    const range = s.max - s.min
    return {
      currency: seg.currency,
      xStart: xOf(seg.points[0].tMs),
      xEnd: xOf(seg.points[seg.points.length - 1].tMs),
      ticks: [0, 0.5, 1].map((f) => ({ price: s.max - f * range, top: PAD_T + f * PLOT_H })),
    }
  })

  const lastRecent = recent.points[recent.points.length - 1]

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`rgb(${recentColor})`} stopOpacity={0.25} />
            <stop offset="100%" stopColor={`rgb(${recentColor})`} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* recent-currency grid — confined to the recent segment's x-range */}
        {yTicks.map((t, i) => (
          <line
            key={`h${i}`}
            x1={recentStartX}
            x2={100}
            y1={t.top}
            y2={t.top}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={0.5}
            strokeDasharray="1 2"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* faded tail's OWN faint ticks — confined to each earlier segment */}
        {tailScales.map((ts, i) =>
          ts.ticks.map((t, j) => (
            <line
              key={`tt${i}-${j}`}
              x1={ts.xStart}
              x2={ts.xEnd}
              y1={t.top}
              y2={t.top}
              stroke="rgb(var(--text-tertiary))"
              strokeOpacity={0.18}
              strokeWidth={0.5}
              strokeDasharray="1 3"
              vectorEffect="non-scaling-stroke"
            />
          )),
        )}

        {/* earlier segments: faded, dashed, self-scaled (NOT on the recent axis) */}
        {earlier.map((seg, i) => {
          const s = scaleOf(seg.points)
          const range = s.max - s.min
          const y = (price: number) => PAD_T + (1 - (price - s.min) / range) * PLOT_H
          const path = buildLinePath(seg.points.map((p) => ({ x: xOf(p.tMs), y: y(p.price) })))
          return (
            <path
              key={`e${i}`}
              d={path}
              fill="none"
              stroke="rgb(var(--text-tertiary))"
              strokeOpacity={0.4}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        {/* currency seams — line stops here, no diagonal across the gap */}
        {seams.map((seam, i) => (
          <line
            key={`s${i}`}
            x1={seam.x}
            x2={seam.x}
            y1={PAD_T}
            y2={PLOT_BOTTOM}
            stroke="rgb(var(--spread))"
            strokeOpacity={0.6}
            strokeWidth={1}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* recent segment: full scale, fill + line */}
        <path d={recentArea} fill="url(#price-fill)" stroke="none" />
        <path
          d={recentLine}
          fill="none"
          stroke={`rgb(${recentColor})`}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* --- HTML overlay: undistorted text + markers --- */}
      <div className="pointer-events-none absolute inset-0">
        {/* recent-currency y-axis labels — right side, against the INR segment */}
        {yTicks.map((t, i) => (
          <span
            key={`yl${i}`}
            className="absolute right-1 -translate-y-1/2 font-mono text-[9px] text-text-secondary"
            style={{ top: `${t.top}%` }}
          >
            {formatPriceInCurrency(t.price, recent.currency)}
          </span>
        ))}

        {/* faded tail's own faint scale labels — left, against its segment */}
        {tailScales.map((ts, i) =>
          ts.ticks.map((t, j) => (
            <span
              key={`tl${i}-${j}`}
              className="absolute left-1 -translate-y-1/2 font-mono text-[8px] text-text-tertiary/60"
              style={{ top: `${t.top}%` }}
            >
              {formatPriceInCurrency(t.price, ts.currency)}
            </span>
          )),
        )}

        {/* recent currency / scale badge (bottom of the right-side axis) */}
        <span className="absolute bottom-1 right-1 rounded border border-border-subtle bg-bg-base/80 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-text-secondary">
          {recent.currency} scale
        </span>

        {/* earlier "different currency" tags */}
        {earlier.map((seg, i) => {
          const midMs = (seg.points[0].tMs + seg.points[seg.points.length - 1].tMs) / 2
          return (
            <span
              key={`et${i}`}
              className="absolute top-1 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] italic text-text-tertiary"
              style={{ left: `${xOf(midMs)}%` }}
            >
              earlier · {seg.currency}
            </span>
          )
        })}

        {/* pulse dot on the latest recent point */}
        <span
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${xOf(lastRecent.tMs)}%`, top: `${yRecent(lastRecent.price)}%`, backgroundColor: `rgb(${recentColor})` }}
        >
          <span
            className="absolute inset-0 animate-ping rounded-full"
            style={{ backgroundColor: `rgb(${recentColor})`, opacity: 0.4 }}
          />
        </span>
      </div>
    </div>
  )
}

function buildLinePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")
}
