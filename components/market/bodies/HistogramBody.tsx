"use client"

import { formatPriceInCurrency } from "@/lib/format"
import type { BookSnapshot, Currency } from "@/lib/types"

// histogram body: bid/ask depth ladder + cumulative depth curve.
// Theme keeps the inverted order-book colors: bid (buyers) = red, ask = green.
export function HistogramBody({ snapshot, currency }: { snapshot: BookSnapshot; currency: Currency }) {
  const bids = [...snapshot.buyOrders].sort((a, b) => b.price - a.price) // highest first
  const asks = [...snapshot.sellOrders].sort((a, b) => a.price - b.price) // lowest first

  const maxQty = Math.max(...bids.map((o) => o.quantity), ...asks.map((o) => o.quantity), 1)
  const spread =
    snapshot.lowestSell !== null && snapshot.highestBuy !== null
      ? snapshot.lowestSell - snapshot.highestBuy
      : null

  return (
    <div className="flex h-full flex-col">
      <CumulativeDepthCurve bids={bids} asks={asks} />

      {/* depth ladder */}
      <div className="min-h-0 flex-1 overflow-hidden font-mono text-[11px]">
        <div className="flex justify-between px-3 py-1 text-[9px] uppercase tracking-wider text-text-tertiary">
          <span>Qty</span>
          <span>Price · {currency}</span>
        </div>

        {/* asks (sellers) — lowest sell nearest the spread */}
        <div className="flex flex-col-reverse">
          {asks.slice(0, 5).map((o) => (
            <LadderRow key={`a-${o.price}`} qty={o.quantity} price={o.price} maxQty={maxQty} side="ask" currency={currency} />
          ))}
        </div>

        {/* spread marker */}
        <div className="my-0.5 flex items-center justify-between border-y border-border-subtle bg-bg-base px-3 py-1">
          <span className="font-bold text-text-primary">
            {formatPriceInCurrency(snapshot.lowestSell ?? snapshot.highestBuy, currency)}
          </span>
          <span className="flex flex-col items-end leading-none">
            <span className="text-[9px] uppercase text-text-tertiary">Spread</span>
            <span className="text-spread">{formatPriceInCurrency(spread, currency)}</span>
          </span>
        </div>

        {/* bids (buyers) — highest buy nearest the spread */}
        <div>
          {bids.slice(0, 5).map((o) => (
            <LadderRow key={`b-${o.price}`} qty={o.quantity} price={o.price} maxQty={maxQty} side="bid" currency={currency} />
          ))}
        </div>
      </div>
    </div>
  )
}

function LadderRow({
  qty,
  price,
  maxQty,
  side,
  currency,
}: {
  qty: number
  price: number
  maxQty: number
  side: "bid" | "ask"
  currency: Currency
}) {
  const fillColor = side === "bid" ? "bg-bid/10" : "bg-ask/10"
  const textColor = side === "bid" ? "text-bid" : "text-ask"
  return (
    <div className="relative flex items-center justify-between px-3 py-[2px] hover:bg-bg-hover">
      <div className={`absolute inset-y-0 right-0 ${fillColor}`} style={{ width: `${(qty / maxQty) * 100}%` }} />
      <span className="relative z-10 w-12 text-text-secondary">{qty}</span>
      <span className={`relative z-10 font-medium ${textColor}`}>{formatPriceInCurrency(price, currency)}</span>
    </div>
  )
}

// Cumulative depth: bids step down-left from the mid, asks step up-right.
function CumulativeDepthCurve({
  bids,
  asks,
}: {
  bids: { price: number; quantity: number }[]
  asks: { price: number; quantity: number }[]
}) {
  const W = 100
  const H = 36
  const allPrices = [...bids, ...asks].map((o) => o.price)
  const minP = Math.min(...allPrices)
  const maxP = Math.max(...allPrices)
  const spanP = maxP - minP || 1

  let bidCum = 0
  const bidPts = bids.map((o) => {
    bidCum += o.quantity
    return { price: o.price, cum: bidCum }
  })
  let askCum = 0
  const askPts = asks.map((o) => {
    askCum += o.quantity
    return { price: o.price, cum: askCum }
  })
  const maxCum = Math.max(bidCum, askCum, 1)

  const xOf = (price: number) => ((price - minP) / spanP) * W
  const yOf = (cum: number) => H - (cum / maxCum) * H

  const bidPath = buildAreaPath(bidPts.map((p) => ({ x: xOf(p.price), y: yOf(p.cum) })), H)
  const askPath = buildAreaPath(askPts.map((p) => ({ x: xOf(p.price), y: yOf(p.cum) })), H)

  return (
    <div className="h-10 border-b border-border-subtle px-1 pt-1">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
        <path d={bidPath} fill="rgb(var(--bid))" fillOpacity={0.18} stroke="rgb(var(--bid))" strokeWidth={0.6} />
        <path d={askPath} fill="rgb(var(--ask))" fillOpacity={0.18} stroke="rgb(var(--ask))" strokeWidth={0.6} />
      </svg>
    </div>
  )
}

function buildAreaPath(points: { x: number; y: number }[], baseline: number): string {
  if (points.length === 0) return ""
  const sorted = [...points].sort((a, b) => a.x - b.x)
  const line = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return `${line} L ${last.x.toFixed(2)} ${baseline} L ${first.x.toFixed(2)} ${baseline} Z`
}
