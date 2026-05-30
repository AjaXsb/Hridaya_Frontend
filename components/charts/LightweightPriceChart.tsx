"use client"

// priceoverview price line + volume, rendered with TradingView lightweight-charts.
// Scoped to the price-over-time line only (NOT the depth ladder / curve / tape).
//
// Two distinct boundaries can appear on this chart — keep them separate:
//
//   1. history → live (data-source boundary). The price_history table lags the
//      live feed by an hour or two, so there's a real TIME GAP between the last
//      backbone point and the first live sample. Same currency, so it's NOT a
//      break — we bridge the gap with a DOTTED connector: solid history, dotted
//      gap, solid live. The current (live) price is pinned in view at all times
//      (price line + axis tag + endpoint pill), no hover required.
//
//   2. currency switch (connect-vs-break, decided upstream by segmentByCurrency).
//      The line BREAKS. Most recent segment is full-scale on the RIGHT axis;
//      each earlier segment is a faded dashed self-scaled tail on its OWN LEFT
//      axis, with a dashed divider at the boundary. The crosshair is scoped to
//      the segment under the pointer so one Y-pixel is never read against both
//      currencies' axes at once (the blended-scale lie the break prevents).

import {
  AreaSeries,
  type AreaData,
  createChart,
  HistogramSeries,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  type LineData,
  LineStyle,
  type UTCTimestamp,
} from "lightweight-charts"
import { useEffect, useRef } from "react"
import type { CurrencySegment } from "@/lib/currency-stitch"
import { RANGE_WINDOW_MS } from "@/lib/derive"
import { formatPriceInCurrency } from "@/lib/format"
import type { Currency, PriceTimelinePoint, RangeKey } from "@/lib/types"

function cssTriplet(root: CSSStyleDeclaration, name: string): string {
  // "34 197 94" → "34,197,94" (legacy rgba() syntax, safest for canvas).
  return root.getPropertyValue(name).trim().replace(/\s+/g, ",")
}

function toLineData(points: PriceTimelinePoint[]): (AreaData | LineData)[] {
  const out = points.map((p) => ({
    time: Math.floor(new Date(p.t).getTime() / 1000) as UTCTimestamp,
    value: p.price,
  }))
  out.sort((a, b) => (a.time as number) - (b.time as number))
  // lightweight-charts requires strictly ascending, unique timestamps.
  const deduped: (AreaData | LineData)[] = []
  for (const d of out) {
    if (deduped.length && deduped[deduped.length - 1].time === d.time) deduped[deduped.length - 1] = d
    else deduped.push(d)
  }
  return deduped
}

function toVolumeData(points: PriceTimelinePoint[], color: string): HistogramData[] {
  const out = points
    .filter((p) => p.volume !== null)
    .map((p) => ({
      time: Math.floor(new Date(p.t).getTime() / 1000) as UTCTimestamp,
      value: p.volume as number,
      color,
    }))
  out.sort((a, b) => (a.time as number) - (b.time as number))
  const deduped: HistogramData[] = []
  for (const d of out) {
    if (deduped.length && deduped[deduped.length - 1].time === d.time) deduped[deduped.length - 1] = d
    else deduped.push(d)
  }
  return deduped
}

export function LightweightPriceChart({
  segments,
  rangeKey,
  refMs,
}: {
  segments: CurrencySegment<PriceTimelinePoint>[]
  rangeKey: RangeKey
  refMs: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const pricePillRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  const nonEmpty = segments.filter((s) => s.points.length > 0)
  const recent = nonEmpty[nonEmpty.length - 1]
  const earlier = nonEmpty.slice(0, -1)
  const isBreak = nonEmpty.length > 1

  useEffect(() => {
    const container = containerRef.current
    if (!container || !recent) return

    const root = getComputedStyle(document.documentElement)
    const rgb = (name: string, alpha = 1) => `rgba(${cssTriplet(root, name)},${alpha})`

    const recentBullish = recent.points[recent.points.length - 1].price >= recent.points[0].price
    const accent = recentBullish ? "--price-up" : "--price-down"

    const chart: IChartApi = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: rgb("--text-tertiary"),
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: { borderColor: rgb("--border-subtle") },
      timeScale: { borderColor: rgb("--border-subtle"), timeVisible: true, secondsVisible: false },
      crosshair: {
        // Break case: kill the horizontal line. It is what projects one segment's
        // Y level onto BOTH price axes at once — the blended-scale lie. A custom,
        // single-segment tooltip replaces it. Seamless case keeps the native
        // horizontal readout (one axis, no lie).
        horzLine: { visible: !isBreak, labelVisible: !isBreak, labelBackgroundColor: rgb("--bg-base") },
        vertLine: { labelBackgroundColor: rgb("--bg-base") },
      },
    })
    chartRef.current = chart

    // The recent currency segment splits by data source: a solid history backbone
    // and a solid live tip, with a dotted connector bridging the ingestion-lag gap.
    const histPart = recent.points.filter((p) => p.source === "history")
    const livePart = recent.points.filter((p) => p.source === "live")

    const addArea = (pts: PriceTimelinePoint[]): ISeriesApi<"Area"> => {
      const s = chart.addSeries(AreaSeries, {
        priceScaleId: "right",
        lineColor: rgb(accent),
        topColor: rgb(accent, 0.25),
        bottomColor: rgb(accent, 0),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      s.setData(toLineData(pts))
      return s
    }

    const historyArea = histPart.length ? addArea(histPart) : null
    const liveArea = livePart.length ? addArea(livePart) : null
    // The series that owns the freshest sample — gets the always-on price readout.
    const tipSeries = liveArea ?? historyArea ?? addArea(recent.points)

    // Dotted connector across the history→live gap (same currency, just lag).
    if (historyArea && liveArea) {
      const gap = chart.addSeries(LineSeries, {
        priceScaleId: "right",
        color: rgb(accent, 0.7),
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      gap.setData(toLineData([histPart[histPart.length - 1], livePart[0]]))
    }

    // Pin the live price in view: dashed price line + highlighted axis tag.
    tipSeries.applyOptions({
      priceLineVisible: true,
      priceLineColor: rgb(accent, 0.3),
      priceLineStyle: LineStyle.Dashed,
      priceLineWidth: 1,
      lastValueVisible: true,
    })

    // Volume (active-currency points) as a thin overlay histogram.
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: "vol",
      color: rgb("--volume", 0.5),
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      lastValueVisible: false,
    })
    volume.setData(toVolumeData(recent.points, rgb("--volume", 0.5)))
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

    // Price series indexed by the currency they're scaled in. Used to scope the
    // crosshair readout to whichever segment the pointer is actually over.
    const priceSeries: { s: ISeriesApi<"Area" | "Line">; currency: Currency }[] = []
    if (historyArea) priceSeries.push({ s: historyArea, currency: recent.currency })
    if (liveArea) priceSeries.push({ s: liveArea, currency: recent.currency })
    if (!historyArea && !liveArea) priceSeries.push({ s: tipSeries, currency: recent.currency })

    // Earlier different-currency segments: faded, dashed, self-scaled tail on
    // their OWN LEFT axis — never fitted onto the recent scale.
    if (isBreak) {
      chart.applyOptions({ leftPriceScale: { visible: true, borderColor: rgb("--border-subtle") } })
      for (const seg of earlier) {
        const tail = chart.addSeries(LineSeries, {
          priceScaleId: "left",
          color: rgb("--text-tertiary", 0.55),
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })
        tail.setData(toLineData(seg.points))
        priceSeries.push({ s: tail, currency: seg.currency })
      }
    }

    chart.timeScale().fitContent()

    // --- Overlay positioning -------------------------------------------------
    const boundaryTime = isBreak ? (toLineData(recent.points)[0]?.time as UTCTimestamp | undefined) : undefined
    const lastPoint = recent.points[recent.points.length - 1]
    const lastTime = Math.floor(new Date(lastPoint.t).getTime() / 1000) as UTCTimestamp

    const place = (el: HTMLDivElement | null, x: number | null) => {
      if (!el) return
      if (x === null) {
        el.style.display = "none"
      } else {
        el.style.display = "block"
        el.style.left = `${x}px`
      }
    }

    const updateOverlays = () => {
      const ts = chart.timeScale()
      place(dividerRef.current, boundaryTime === undefined ? null : ts.timeToCoordinate(boundaryTime))

      // Always-on current-price pill, anchored at the freshest sample.
      const pill = pricePillRef.current
      if (pill) {
        const x = ts.timeToCoordinate(lastTime)
        const y = tipSeries.priceToCoordinate(lastPoint.price)
        if (x === null || y === null) {
          pill.style.display = "none"
        } else {
          pill.style.display = "flex"
          pill.style.left = `${x}px`
          pill.style.top = `${y}px`
        }
      }
    }
    chart.timeScale().subscribeVisibleTimeRangeChange(updateOverlays)
    requestAnimationFrame(updateOverlays)

    // --- Scoped crosshair tooltip (break case only) --------------------------
    // No horizontal line, so nothing projects across axes. Instead show a single
    // readout for the one series with data under the pointer — its own currency,
    // its own scale. The other currency's axis is never touched.
    const onCrosshair = (param: Parameters<Parameters<typeof chart.subscribeCrosshairMove>[0]>[0]) => {
      const tip = tooltipRef.current
      if (!tip) return
      if (!param.point || param.time === undefined) {
        tip.style.display = "none"
        return
      }
      const hit = priceSeries.find((ps) => param.seriesData.has(ps.s))
      const datum = hit ? (param.seriesData.get(hit.s) as { value?: number } | undefined) : undefined
      if (!hit || datum?.value === undefined) {
        tip.style.display = "none"
        return
      }
      tip.style.display = "block"
      tip.style.left = `${param.point.x}px`
      tip.style.top = `${param.point.y}px`
      tip.textContent = `${formatPriceInCurrency(datum.value, hit.currency)} · ${hit.currency}`
    }
    if (isBreak) chart.subscribeCrosshairMove(onCrosshair)

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(updateOverlays)
      if (isBreak) chart.unsubscribeCrosshairMove(onCrosshair)
      chart.remove()
      chartRef.current = null
    }
  }, [segments, recent, earlier, isBreak])

  // Zoom the chart to the selected range window. The right price scale autoScales
  // (default) to whatever's visible, so a tight window also rescales the price
  // axis to its own min/max — a zoomed view fills the height instead of looking
  // flat under the full-history scale. "All" returns to the whole timeline.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const ts = chart.timeScale()
    const windowMs = RANGE_WINDOW_MS[rangeKey]
    if (!Number.isFinite(windowMs)) {
      ts.fitContent()
      return
    }
    try {
      ts.setVisibleRange({
        from: Math.floor((refMs - windowMs) / 1000) as UTCTimestamp,
        to: Math.floor(refMs / 1000) as UTCTimestamp,
      })
    } catch {
      // Window outside the data's bounds — fall back to fitting everything.
      ts.fitContent()
    }
  }, [rangeKey, refMs, segments])

  if (!recent) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-text-tertiary">
        No price points
      </div>
    )
  }

  const lastPrice = recent.points[recent.points.length - 1].price
  const bullish = lastPrice >= recent.points[0].price

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* always-on current-price pill, pinned at the freshest sample (no hover) */}
      <div
        ref={pricePillRef}
        className={`pointer-events-none absolute z-10 hidden -translate-x-[calc(100%+8px)] -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${
          bullish
            ? "border-price-up/40 bg-price-up/10 text-price-up"
            : "border-price-down/40 bg-price-down/10 text-price-down"
        }`}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-live" />
        {formatPriceInCurrency(lastPrice, recent.currency)}
      </div>

      {/* currency-break divider (dashed) + scoped crosshair tooltip — break only */}
      {isBreak && (
        <>
          <div
            ref={dividerRef}
            className="pointer-events-none absolute bottom-0 top-0 hidden w-px border-l border-dashed border-spread/70"
          />
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute z-10 hidden -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded border border-border-subtle bg-bg-base/95 px-1.5 py-0.5 font-mono text-[9px] text-text-primary shadow"
          />
          <div className="pointer-events-none absolute inset-0">
            <span className="absolute left-1 top-1 rounded border border-border-subtle bg-bg-base/80 px-1.5 py-0.5 font-mono text-[9px] italic tracking-wider text-text-tertiary">
              earlier · {earlier.map((s) => s.currency).join(" · ")}
            </span>
            <span className="absolute bottom-6 right-1 rounded border border-border-subtle bg-bg-base/80 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-text-secondary">
              {recent.currency} scale
            </span>
          </div>
        </>
      )}
    </div>
  )
}
