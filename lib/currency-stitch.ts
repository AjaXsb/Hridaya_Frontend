// The single rule that decides connect-vs-break on any currency-tagged series.
//
// Same currency → connect. Different currency → break. The ONLY input is the
// adjacent points' currency field — never a parsed symbol, never an FX guess.
// A $44 point joined to a ₹3,600 point would render as a fake crash; instead
// the line breaks at the boundary and a fresh segment starts.

import type { Currency } from "@/lib/types"

export interface CurrencySegment<T> {
  currency: Currency
  points: T[]
}

// Split a series into contiguous same-currency runs. Each currency boundary
// starts a new segment. Order is preserved (oldest → newest, as given).
export function segmentByCurrency<T extends { currency: Currency }>(points: T[]): CurrencySegment<T>[] {
  const segments: CurrencySegment<T>[] = []
  for (const point of points) {
    const current = segments[segments.length - 1]
    if (current && current.currency === point.currency) {
      current.points.push(point)
    } else {
      segments.push({ currency: point.currency, points: [point] })
    }
  }
  return segments
}

// The most recent run — the one that gets full axis scale and its own currency.
export function mostRecentSegment<T extends { currency: Currency }>(
  segments: CurrencySegment<T>[],
): CurrencySegment<T> | undefined {
  return segments[segments.length - 1]
}

// True when the series mixes currencies (i.e. a break exists somewhere).
export function hasCurrencyBreak<T extends { currency: Currency }>(points: T[]): boolean {
  for (let i = 1; i < points.length; i++) {
    if (points[i].currency !== points[i - 1].currency) return true
  }
  return false
}
