// Typed mock fixtures that satisfy the data contracts exactly.
//
// One fixture per stream so all three card bodies are visible. No fetch, no
// Steam calls, no backend assumptions. When FastAPI lands these get replaced by
// real responses behind the same TanStack Query hook.
//
// All randomness is deterministic (sin-seeded) and all timestamps are anchored
// to a fixed base so server and client render identically (no hydration drift).

import type {
  BookSnapshot,
  HistoryPoint,
  ItemSnapshot,
  PricePoint,
  RateLimitBudget,
  TradeEvent,
  TrackedItem,
} from "@/lib/types"

// Fixed anchor: pretend "now" is this instant. Keeps fixtures stable.
const NOW = new Date("2026-05-29T16:00:00.000Z").getTime()
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

// The engine has been running for 40 minutes this session — so 5m/1H short
// ranges are partly available and longer live windows must degrade gracefully.
const SESSION_RUNTIME_MIN = 40
const SESSION_START_T = new Date(NOW - SESSION_RUNTIME_MIN * MINUTE).toISOString()

// price_history is ingested on a slower cadence than the live priceoverview
// feed, so its freshest row lags "now" by an hour or two. The backbone's newest
// point sits here; the live tip extends from there, with the dotted connector
// bridging exactly this lag (NOT a day-wide gap).
const HISTORY_LAG_MIN = 110 // ~1h50m behind now, ahead of the 40m live window

// Deterministic pseudo-random in [0,1) from an integer seed.
function deterministicNoise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function isoMinutesAgo(min: number): string {
  return new Date(NOW - min * MINUTE).toISOString()
}

// --- Tracked items (one per stream, one per currency) ------------------------

const AK_REDLINE: TrackedItem = {
  marketHashName: "AK-47 | Redline (Field-Tested)",
  appid: 730,
  itemNameId: 1234567,
  currency: "USD",
  stream: "priceoverview",
  pollIntervalSec: 60,
}

const AWP_ASIIMOV: TrackedItem = {
  marketHashName: "AWP | Asiimov (Field-Tested)",
  appid: 730,
  itemNameId: 2345678,
  currency: "EUR",
  stream: "histogram",
  pollIntervalSec: 30,
}

const BFK_FADE: TrackedItem = {
  marketHashName: "★ Butterfly Knife | Fade (Factory New)",
  appid: 730,
  itemNameId: 3456789,
  currency: "GBP",
  stream: "activity",
  pollIntervalSec: 15,
}

// Edge-case test item: a priceoverview whose live tip flips USD → INR. Exercises
// the break path. Not the default-looking card.
const DEAGLE_BLAZE_FLIP: TrackedItem = {
  marketHashName: "Desert Eagle | Blaze (Factory New)",
  appid: 730,
  itemNameId: 4567890,
  currency: "USD",
  stream: "priceoverview",
  pollIntervalSec: 60,
}

// --- priceoverview live series -----------------------------------------------
// One point per minute for the session runtime — the thin live tip extending the
// recent end of the long USD price_history backbone. Some null gaps prove the UI
// tolerates missing samples.

// Default everyday case: USD-canonical throughout. Combined with the USD
// price_history backbone this renders as one seamless line — no break, no
// divider, no faded tail.
function buildPriceOverviewSeries(): PricePoint[] {
  const base = 43.7
  const points: PricePoint[] = []
  for (let i = SESSION_RUNTIME_MIN; i >= 0; i--) {
    const seed = i + 1
    const drift = Math.sin(i / 6) * 0.9 + (deterministicNoise(seed) - 0.5) * 0.4
    const median = base + drift
    const lowest = median - 0.05 - deterministicNoise(seed * 3) * 0.15
    // Sprinkle gaps: every ~9th sample the lowest/median didn't come back.
    const gap = i % 9 === 4
    points.push({
      t: isoMinutesAgo(i),
      currency: "USD",
      lowest: gap ? null : Number(lowest.toFixed(2)),
      median: gap ? null : Number(median.toFixed(2)),
      volume: gap ? null : Math.round(8 + deterministicNoise(seed * 7) * 40),
    })
  }
  return points
}

// Explicit edge-case TEST fixture (not the default look): the live tip switches
// USD → INR partway. Combined with the USD backbone this fires the break path —
// faded self-scaled USD tail + full-scale INR tip on its own axis. Magnitudes
// far apart so a naive connected line would read as a fake crash.
const CURRENCY_SWITCH_AT_MIN = 14 // tip points newer than this are INR

function buildPriceOverviewSeriesWithFlip(): PricePoint[] {
  const points: PricePoint[] = []
  for (let i = SESSION_RUNTIME_MIN; i >= 0; i--) {
    const seed = i + 1
    const isInr = i <= CURRENCY_SWITCH_AT_MIN
    const currency = isInr ? "INR" : "USD"
    const base = isInr ? 3600 : 43.7
    const scale = isInr ? 70 : 0.9
    const drift = Math.sin(i / 6) * scale + (deterministicNoise(seed) - 0.5) * scale * 0.4
    const median = base + drift
    const lowest = median - (isInr ? 6 : 0.05) - deterministicNoise(seed * 3) * (isInr ? 12 : 0.15)
    const gap = i % 9 === 4
    points.push({
      t: isoMinutesAgo(i),
      currency,
      lowest: gap ? null : Number(lowest.toFixed(2)),
      median: gap ? null : Number(median.toFixed(2)),
      volume: gap ? null : Math.round(8 + deterministicNoise(seed * 7) * 40),
    })
  }
  return points
}

// --- histogram snapshot (AWP Asiimov, EUR) -----------------------------------
// Bid/ask ladders. Native EUR — not FX-converted from USD.

function buildBookSnapshot(): BookSnapshot {
  const mid = 78.4 // EUR
  const buyOrders = Array.from({ length: 12 }, (_, i) => {
    const price = Number((mid - 0.5 - i * (0.4 + deterministicNoise(i + 1) * 0.2)).toFixed(2))
    const quantity = Math.round(3 + deterministicNoise(i * 5 + 2) * 60)
    return { price, quantity }
  })
  const sellOrders = Array.from({ length: 12 }, (_, i) => {
    const price = Number((mid + 0.5 + i * (0.4 + deterministicNoise(i + 31) * 0.2)).toFixed(2))
    const quantity = Math.round(3 + deterministicNoise(i * 5 + 17) * 55)
    return { price, quantity }
  })
  return {
    t: isoMinutesAgo(0),
    buyOrders,
    sellOrders,
    highestBuy: buyOrders[0].price,
    lowestSell: sellOrders[0].price,
  }
}

// --- activity tape (Butterfly Fade, GBP) -------------------------------------
// Most recent fills first. Native GBP. Some null prices/actions to test the UI.

function buildTradeEvents(): TradeEvent[] {
  const base = 1685 // GBP
  const actions = ["Sold", "Listed", "Sold", "Sold", "Listed"]
  return Array.from({ length: 26 }, (_, i) => {
    const seed = i + 1
    const price = base + Math.sin(i / 4) * 22 + (deterministicNoise(seed * 9) - 0.5) * 14
    const drop = i % 11 === 7 // occasional missing fields
    return {
      t: new Date(NOW - i * 23 * 1000).toISOString(), // ~23s apart
      price: drop ? null : Number(price.toFixed(2)),
      action: drop ? null : actions[i % actions.length],
    }
  })
}

// --- USD price history (cross-cutting, every item) ---------------------------
// 90 daily points. Feeds the 1D/1W/All range windows. Always USD, even for the
// EUR/GBP cards — the AWP's EUR-live / USD-history split is labeled, not hidden.

function buildUsdHistory(baseUsd: number, seedOffset: number): HistoryPoint[] {
  // Same expression for daily and the lagged tail point, so the backbone stays
  // continuous into the recent end. `d` is in (fractional) days back from now.
  const at = (d: number, seed: number): HistoryPoint => {
    const trend = Math.sin(d / 14) * baseUsd * 0.08
    const noise = (deterministicNoise(seed * 13) - 0.5) * baseUsd * 0.03
    return {
      t: new Date(NOW - d * DAY).toISOString(),
      currency: "USD", // history is canonical USD
      price: Number((baseUsd + trend + noise).toFixed(2)),
      volume: Math.round(80 + deterministicNoise(seed * 19) * 400),
    }
  }

  const points: HistoryPoint[] = []
  // Daily backbone, oldest → most recent full day.
  for (let d = 90; d >= 1; d--) points.push(at(d, d + seedOffset))
  // Freshest row lags ~1-2h, not a full day — this is what the live tip extends.
  points.push(at(HISTORY_LAG_MIN / (24 * 60), seedOffset))
  return points
}

// --- Assembled snapshots -----------------------------------------------------

// Stable "now" reference for relative-time formatting (avoids hydration drift
// from a live clock; swap to Date.now() once real data flows).
export const MOCK_NOW = NOW

export const MOCK_RATE_LIMIT: RateLimitBudget = {
  used: 11,
  limit: 15,
  windowSec: 60,
}

export const MOCK_LAST_INGEST_T = isoMinutesAgo(0)

export const MOCK_ITEM_SNAPSHOTS: ItemSnapshot[] = [
  {
    item: AK_REDLINE,
    body: { kind: "priceoverview", series: buildPriceOverviewSeries() },
    history: buildUsdHistory(43.7, 100),
    sessionStartT: SESSION_START_T,
    lastUpdateT: isoMinutesAgo(0),
  },
  {
    item: AWP_ASIIMOV,
    body: { kind: "histogram", snapshot: buildBookSnapshot() },
    history: buildUsdHistory(84.2, 200), // USD history; live book is EUR
    sessionStartT: SESSION_START_T,
    lastUpdateT: isoMinutesAgo(0),
  },
  {
    item: BFK_FADE,
    body: { kind: "activity", events: buildTradeEvents() },
    history: buildUsdHistory(2110, 300), // USD history; live tape is GBP
    sessionStartT: SESSION_START_T,
    lastUpdateT: isoMinutesAgo(0),
  },
  {
    // Break-path test card: USD backbone + USD→INR live tip.
    item: DEAGLE_BLAZE_FLIP,
    body: { kind: "priceoverview", series: buildPriceOverviewSeriesWithFlip() },
    history: buildUsdHistory(46.5, 400),
    sessionStartT: SESSION_START_T,
    lastUpdateT: isoMinutesAgo(0),
  },
]

// The tracked-item config (definitions only). Cards read poll cadence from here
// before querying each item's snapshot.
export const MOCK_TRACKED_ITEMS: TrackedItem[] = MOCK_ITEM_SNAPSHOTS.map((s) => s.item)

// Convenience lookup by name (the future API keys on marketHashName).
export function findMockSnapshot(marketHashName: string): ItemSnapshot | undefined {
  return MOCK_ITEM_SNAPSHOTS.find((s) => s.item.marketHashName === marketHashName)
}
