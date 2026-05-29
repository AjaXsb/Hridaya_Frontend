"use client"

import { useQuery } from "@tanstack/react-query"
import {
  findMockSnapshot,
  MOCK_LAST_INGEST_T,
  MOCK_RATE_LIMIT,
  MOCK_TRACKED_ITEMS,
} from "@/mocks"
import { type CurrencySegment, segmentByCurrency } from "@/lib/currency-stitch"
import type { ItemSnapshot, PricePoint, TerminalMeta, TrackedItem } from "@/lib/types"

// Snapshot plus the currency-broken price segments. priceSegments is the
// boundary guard's output: the priceoverview series split so no consumer ever
// blends two currencies into one line. Null for non-priceoverview streams.
export interface ItemSnapshotView extends ItemSnapshot {
  priceSegments: CurrencySegment<PricePoint>[] | null
}

// detect currency boundary → break, don't blend. Keyed off each point's
// currency field; the only thing deciding connect-vs-break.
function breakSeriesOnCurrencyBoundary(snapshot: ItemSnapshot): ItemSnapshotView {
  const priceSegments =
    snapshot.body.kind === "priceoverview" ? segmentByCurrency(snapshot.body.series) : null
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
