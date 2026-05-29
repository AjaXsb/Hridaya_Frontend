// Presentation helpers. Currency stays per-card — these never FX-convert.

import type { Currency } from "@/lib/types"

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
}

export function currencySymbolFor(currency: Currency): string {
  return CURRENCY_SYMBOL[currency]
}

// Native-currency price. No conversion, ever.
export function formatPriceInCurrency(value: number | null, currency: Currency): string {
  if (value === null || Number.isNaN(value)) return "—"
  const symbol = CURRENCY_SYMBOL[currency]
  const digits = Math.abs(value) >= 1000 ? 0 : 2
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

// Bare USD formatting for the history overlay (always USD by contract).
export function formatUsd(value: number | null): string {
  return formatPriceInCurrency(value, "USD")
}

export function formatSignedPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

// Short relative time ("just now", "3m ago", "2h ago", "5d ago"). refMs lets
// callers pass a stable reference instead of the live clock.
export function formatRelativeTime(iso: string, refMs: number): string {
  const deltaSec = Math.max(0, Math.round((refMs - new Date(iso).getTime()) / 1000))
  if (deltaSec < 5) return "just now"
  if (deltaSec < 60) return `${deltaSec}s ago`
  const min = Math.floor(deltaSec / 60)
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Clock time "HH:MM:SS" for the trade tape.
export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false })
}
