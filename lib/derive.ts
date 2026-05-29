// Pure derivations off the data contracts. No fetching, no formatting.
//
// Guardrails enforced here:
//  - Don't invent intraday candles: short ranges only cover the engine's
//    runtime; windows longer than the data are marked partial / degraded.
//  - % change always carries a stated reference AND shares the current point's
//    currency (never compared across a currency switch).
//  - Range/RSI never blend across a currency boundary: they use only the most
//    recent currency run. Cross-currency math is a fake crash, not a signal.
//  - RSI only computes when there are honestly enough points.

import { type CurrencySegment, segmentByCurrency } from "@/lib/currency-stitch"
import {
  type CardBody,
  type ChangeReference,
  type Currency,
  type ItemSnapshot,
  type RangeKey,
  type RangeSource,
  RANGE_SOURCE,
} from "@/lib/types"

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

const RANGE_WINDOW_MS: Record<RangeKey, number> = {
  "5m": 5 * MINUTE,
  "1H": 60 * MINUTE,
  "1D": DAY,
  "1W": 7 * DAY,
  All: Number.POSITIVE_INFINITY,
}

interface TimedPrice {
  t: string
  price: number
  currency: Currency
}

// Native-currency current price for the card chrome, per stream. A single value,
// so there's nothing to blend.
export function deriveCurrentPrice(body: CardBody): number | null {
  switch (body.kind) {
    case "priceoverview": {
      for (let i = body.series.length - 1; i >= 0; i--) {
        const m = body.series[i].median ?? body.series[i].lowest
        if (m !== null) return m
      }
      return null
    }
    case "histogram": {
      const { highestBuy, lowestSell } = body.snapshot
      if (highestBuy !== null && lowestSell !== null) return (highestBuy + lowestSell) / 2
      return lowestSell ?? highestBuy
    }
    case "activity": {
      for (const e of body.events) if (e.price !== null) return e.price
      return null
    }
  }
}

// The currency the chrome should display the current price in: the most recent
// point's currency for priceoverview (it can switch mid-session), else the
// item's configured currency.
export function deriveDisplayCurrency(body: CardBody, fallback: Currency): Currency {
  if (body.kind === "priceoverview") {
    for (let i = body.series.length - 1; i >= 0; i--) {
      if ((body.series[i].median ?? body.series[i].lowest) !== null) return body.series[i].currency
    }
  }
  return fallback
}

// Reference price for % change. Must share the current currency: if the series
// switched currency mid-session, the reference resets to the start of the most
// recent currency run (label "currency-start"). Otherwise session start.
export function deriveChangeReference(
  snapshot: ItemSnapshot,
  refMs: number,
): { reference: ChangeReference; price: number | null; currency: Currency } {
  const timeline = buildNativeTimeline(snapshot.body, snapshot.item.currency)
  if (timeline.length === 0) {
    return { reference: "session-start", price: null, currency: snapshot.item.currency }
  }

  const segments = segmentByCurrency(timeline)
  const recent = segments[segments.length - 1]
  const switched = segments.length > 1
  const has24h = refMs - new Date(snapshot.sessionStartT).getTime() >= DAY

  const reference: ChangeReference = switched ? "currency-start" : has24h ? "24h" : "session-start"
  return { reference, price: recent.points[0].price, currency: recent.currency }
}

export function computePercentChange(current: number | null, reference: number | null): number | null {
  if (current === null || reference === null || reference === 0) return null
  return ((current - reference) / reference) * 100
}

// A native-currency price timeline from whatever the stream collects, oldest →
// newest, each point tagged with its currency. Histogram is a single
// point-in-time snapshot, so it yields no timeline.
function buildNativeTimeline(body: CardBody, fallbackCurrency: Currency): TimedPrice[] {
  switch (body.kind) {
    case "priceoverview":
      return body.series
        .filter((p) => (p.median ?? p.lowest) !== null)
        .map((p) => ({ t: p.t, price: (p.median ?? p.lowest) as number, currency: p.currency }))
    case "activity":
      // TradeEvents carry no per-point currency; they're all the item's currency.
      return body.events
        .filter((e) => e.price !== null)
        .map((e) => ({ t: e.t, price: e.price as number, currency: fallbackCurrency }))
        .reverse() // events are newest-first; chronological for the timeline
    case "histogram":
      return []
  }
}

export interface RangeView {
  key: RangeKey
  source: RangeSource
  currency: Currency // native for live windows, USD for history windows
  points: TimedPrice[]
  low: number | null
  high: number | null
  current: number | null
  // The selected window is longer than the data the engine actually has.
  partial: boolean
  // The window crossed a currency switch; older different-currency points were
  // excluded rather than blended.
  currencyBreak: boolean
  // Set when the window can't be honestly drawn (degrade message).
  degraded?: string
}

// Resolve a range window. Short windows read live snapshots in native currency;
// long windows read the USD history overlay. Either way, only the most recent
// currency run inside the window is used — never blended across a switch.
export function selectRangeView(snapshot: ItemSnapshot, key: RangeKey, refMs: number): RangeView {
  const source = RANGE_SOURCE[key]
  const windowMs = RANGE_WINDOW_MS[key]
  const cutoff = windowMs === Number.POSITIVE_INFINITY ? -Infinity : refMs - windowMs

  const timeline: TimedPrice[] =
    source === "live"
      ? buildNativeTimeline(snapshot.body, snapshot.item.currency)
      : snapshot.history.map((h) => ({ t: h.t, price: h.price, currency: h.currency }))

  const inWindow = timeline.filter((p) => new Date(p.t).getTime() >= cutoff)

  const base: RangeView = {
    key,
    source,
    currency: source === "live" ? snapshot.item.currency : "USD",
    points: [],
    low: null,
    high: null,
    current: null,
    partial: false,
    currencyBreak: false,
  }

  if (inWindow.length === 0) {
    return {
      ...base,
      degraded: source === "live" ? "No live snapshots in window yet" : "No history in window",
    }
  }

  // Use only the most recent same-currency run inside the window.
  const segments = segmentByCurrency(inWindow)
  const recent = segments[segments.length - 1]
  const usePoints = recent.points
  const currencyBreak = segments.length > 1

  const prices = usePoints.map((p) => p.price)
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  const current = usePoints[usePoints.length - 1].price

  // Partial when the oldest available point is newer than the window start.
  const oldestMs = new Date(timeline[0].t).getTime()
  const partial = cutoff !== -Infinity && oldestMs > cutoff

  return {
    ...base,
    currency: recent.currency,
    points: usePoints,
    low,
    high,
    current,
    partial,
    currencyBreak,
    degraded: usePoints.length < 2 ? "Need ≥2 snapshots to draw range" : undefined,
  }
}

// Position of current within [low, high] as 0..1, for the range bar marker.
export function rangePositionFraction(view: RangeView): number | null {
  if (view.low === null || view.high === null || view.current === null) return null
  if (view.high === view.low) return 0.5
  return (view.current - view.low) / (view.high - view.low)
}

// Wilder RSI over the most recent currency run only (never across a switch).
// Returns null unless that run has honestly enough points (period+1).
export function computeRsi(body: CardBody, fallbackCurrency: Currency, period = 14): number | null {
  const timeline = buildNativeTimeline(body, fallbackCurrency)
  if (timeline.length === 0) return null
  const segments = segmentByCurrency(timeline)
  const series = segments[segments.length - 1].points
  if (series.length < period + 1) return null

  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const diff = series[i].price - series[i - 1].price
    if (diff >= 0) gain += diff
    else loss -= diff
  }
  let avgGain = gain / period
  let avgLoss = loss / period

  for (let i = period + 1; i < series.length; i++) {
    const diff = series[i].price - series[i - 1].price
    const g = diff >= 0 ? diff : 0
    const l = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + g) / period
    avgLoss = (avgLoss * (period - 1) + l) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// Re-export the segment type for chart/hook consumers.
export type { CurrencySegment }
