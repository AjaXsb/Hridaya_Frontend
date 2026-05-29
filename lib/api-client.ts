interface PriceHistoryOptions {
  limit?: number
  fromDate?: string
  toDate?: string
}

interface PriceDataPoint {
  price: number
  timestamp: string
  volume: number
}

export async function getPriceHistory(itemName: string, options: PriceHistoryOptions = {}): Promise<PriceDataPoint[]> {
  const params = new URLSearchParams()

  if (options.limit) {
    params.append("limit", options.limit.toString())
  } else if (options.fromDate && options.toDate) {
    params.append("from_date", options.fromDate)
    params.append("to_date", options.toDate)
  }

  const response = await fetch(`/api/items/history/${encodeURIComponent(itemName)}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch price history: ${response.statusText}`)
  }

  return response.json()
}

// Helper function to calculate date range for timeframes
export function getTimeframeRange(timeframe: string): { fromDate: string; toDate: string } {
  const now = new Date()
  const toDate = now.toISOString()

  const timeframes: Record<string, number> = {
    "1m": 1 * 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1H": 60 * 60 * 1000,
    "4H": 4 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
  }

  const milliseconds = timeframes[timeframe] || timeframes["1H"]
  const fromDate = new Date(now.getTime() - milliseconds).toISOString()

  return { fromDate, toDate }
}
