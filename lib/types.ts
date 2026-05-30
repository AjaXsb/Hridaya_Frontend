// Data contracts for the CS2 market terminal.
//
// These mirror what the Hridaya ingestion engine collects and what the future
// FastAPI layer will serve. The UI renders entirely off these types; when the
// API lands it becomes a drop-in swap behind the TanStack Query hook.

// The backend tags every point with a real currency. The UI consumes the tag
// as-is and never parses a price symbol. Canonical default is USD.
export type Currency = "USD" | "GBP" | "EUR" | "INR"

// Each tracked item is ingested on exactly one Steam stream. The stream decides
// which card body renders.
export type Stream = "priceoverview" | "histogram" | "activity"

export interface TrackedItem {
  marketHashName: string
  appid: number // 730
  itemNameId?: number // for icon + histogram/activity
  currency: Currency
  stream: Stream
  pollIntervalSec: number
}

// --- Per-stream payloads -----------------------------------------------------

export interface PricePoint {
  t: string
  currency: Currency // per-point; canonical default USD. Drives connect-vs-break.
  lowest: number | null
  median: number | null
  volume: number | null
}

export interface OrderLevel {
  price: number
  quantity: number
}

export interface BookSnapshot {
  t: string
  buyOrders: OrderLevel[]
  sellOrders: OrderLevel[]
  highestBuy: number | null
  lowestSell: number | null
}

export interface TradeEvent {
  t: string
  price: number | null
  action: string | null
}

// price_history is NOT a fourth body. It is a cross-cutting overlay available to
// any card via the range bar, collected separately for all items. Canonical
// default currency is USD, but each point carries its own tag — same
// connect-vs-break rule applies if the backend ever switches it.
export interface HistoryPoint {
  t: string
  currency: Currency
  price: number
  volume: number
}

// The priceoverview chart is a long price_history backbone with the recent
// priceoverview snapshots extending its tip — unified into one currency-tagged
// timeline so segmentByCurrency can decide connect-vs-break across the whole
// thing. Same currency throughout (the everyday USD case) → one segment → one
// seamless line. A genuine currency difference → a break.
export interface PriceTimelinePoint {
  t: string
  currency: Currency
  price: number
  volume: number | null
  // Which feed the point came from. The long backbone is "history"; the recent
  // tip is "live". Same currency stays one continuous line — this only marks
  // where live begins (a data-source boundary, NOT a currency break).
  source: "history" | "live"
}

// Discriminated union keyed off the item's stream. The ItemCard shell renders
// one of these as its body.
export type CardBody =
  | { kind: "priceoverview"; series: PricePoint[] }
  | { kind: "histogram"; snapshot: BookSnapshot }
  | { kind: "activity"; events: TradeEvent[] }

// --- UI-facing derived/composite types --------------------------------------

// The range bar offers fixed windows. Short windows read from live snapshots
// (only as long as the engine has been running); long windows read from
// price_history. A subtle marker tells the user which source backs the view.
export type RangeKey = "5m" | "1H" | "1D" | "1W" | "All"
export type RangeSource = "live" | "history"

export const RANGE_KEYS: RangeKey[] = ["5m", "1H", "1D", "1W", "All"]

// Short ranges come from live snapshots, long ranges from USD history.
export const RANGE_SOURCE: Record<RangeKey, RangeSource> = {
  "5m": "live",
  "1H": "live",
  "1D": "history",
  "1W": "history",
  All: "history",
}

// % change always needs a stated reference, and the reference must share the
// current point's currency (never compare across a currency switch). Default is
// session start until 24h exists; "currency-start" is used when the series
// switched currency mid-session and the comparison resets at that boundary.
export type ChangeReference = "session-start" | "24h" | "currency-start"

export interface RateLimitBudget {
  used: number
  limit: number
  windowSec: number
}

// Everything the engine knows about a single tracked item right now: the item
// definition, its live body, its USD history, and the timestamps needed to
// label % change honestly.
export interface ItemSnapshot {
  item: TrackedItem
  body: CardBody
  history: HistoryPoint[]
  sessionStartT: string
  lastUpdateT: string
}

// Header-level stats shown in the terminal chrome.
export interface TerminalMeta {
  rateLimit: RateLimitBudget
  trackedCount: number
  lastIngestT: string
}
