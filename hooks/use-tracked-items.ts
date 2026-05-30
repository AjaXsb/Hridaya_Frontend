"use client"

import { useQuery } from "@tanstack/react-query"
import {
  findMockSnapshot,
  MOCK_LAST_INGEST_T,
  MOCK_RATE_LIMIT,
  MOCK_TRACKED_ITEMS,
} from "@/mocks"
import { type CurrencySegment, segmentByCurrency } from "@/lib/currency-stitch"
import type { ItemSnapshot, PriceTimelinePoint, TerminalMeta, TrackedItem } from "@/lib/types"

// Snapshot plus the currency-broken price segments. priceSegments is the
// boundary guard's output: the full backbone+tip timeline split so no consumer
// ever blends two currencies into one line. Null for non-priceoverview streams.
export interface ItemSnapshotView extends ItemSnapshot {
  priceSegments: CurrencySegment<PriceTimelinePoint>[] | null
}

// Build the priceoverview chart timeline: the long price_history backbone with
// the recent priceoverview snapshots extending its tip. History older than the
// first live sample forms the backbone; the live series is the continuation.
// (This is the emphasis: a long line with a thin live tip, not the reverse.)
function buildPriceTimeline(snapshot: ItemSnapshot): PriceTimelinePoint[] {
  if (snapshot.body.kind !== "priceoverview") return []

  const live: PriceTimelinePoint[] = snapshot.body.series
    .filter((p) => (p.median ?? p.lowest) !== null)
    .map((p) => ({ t: p.t, currency: p.currency, price: (p.median ?? p.lowest) as number, volume: p.volume, source: "live" }))

  const history: PriceTimelinePoint[] = snapshot.history.map((h) => ({
    t: h.t,
    currency: h.currency,
    price: h.price,
    volume: h.volume,
    source: "history",
  }))

  if (live.length === 0) return history
  // Keep only backbone strictly older than the live tip, then append the tip —
  // avoids duplicate/overlapping timestamps at the recent end.
  const firstLiveMs = new Date(live[0].t).getTime()
  const backbone = history.filter((h) => new Date(h.t).getTime() < firstLiveMs)
  return [...backbone, ...live]
}

// detect currency boundary → break, don't blend. Keyed off each point's
// currency field; the only thing deciding connect-vs-break.
function breakSeriesOnCurrencyBoundary(snapshot: ItemSnapshot): ItemSnapshotView {
  const priceSegments =
    snapshot.body.kind === "priceoverview" ? segmentByCurrency(buildPriceTimeline(snapshot)) : null
  return { ...snapshot, priceSegments }
}

// --- Mock query functions ----------------------------------------------------
// These are the single seam to the backend. When FastAPI exists, replace the
// bodies with fetch() calls — keys, shapes, and poll intervals stay identical.

async function fetchTrackedItems(): Promise<TrackedItem[]> {
  return MOCK_TRACKED_ITEMS
}

async function fetchItemSnapshot(marketHashName: string): Promise<ItemSnapshot> {
  const snapshot = findMockSnapshot(marketHashName)
  if (!snapshot) throw new Error(`No snapshot for ${marketHashName}`)
  return snapshot
}

async function fetchTerminalMeta(): Promise<TerminalMeta> {
  return {
    rateLimit: MOCK_RATE_LIMIT,
    trackedCount: MOCK_TRACKED_ITEMS.length,
    lastIngestT: MOCK_LAST_INGEST_T,
  }
}

// --- Hooks -------------------------------------------------------------------

// The set of items the engine is tracking (config; rarely changes).
export function useTrackedItems() {
  return useQuery({
    queryKey: ["tracked-items"],
    queryFn: fetchTrackedItems,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

// One item's live snapshot. Poll cadence is the item's own pollIntervalSec, so
// activity tapes refresh faster than slow priceoverview series.
export function useItemSnapshot(item: TrackedItem) {
  return useQuery({
    queryKey: ["item-snapshot", item.marketHashName],
    queryFn: () => fetchItemSnapshot(item.marketHashName),
    refetchInterval: item.pollIntervalSec * 1000,
    // Apply the currency-boundary guard before the data reaches any component.
    select: breakSeriesOnCurrencyBoundary,
  })
}

// Header stats: rate-limit budget, tracked count, last ingest.
export function useTerminalMeta() {
  return useQuery({
    queryKey: ["terminal-meta"],
    queryFn: fetchTerminalMeta,
    refetchInterval: 15_000,
  })
}
