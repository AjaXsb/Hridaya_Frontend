"use client"

import { useState, useEffect } from "react"
import { getPriceHistory, getTimeframeRange } from "@/lib/api-client"

interface UsePriceHistoryOptions {
  limit?: number
  fromDate?: string
  toDate?: string
  timeframe?: string
}

interface PriceDataPoint {
  price: number
  timestamp: string
  volume: number
}

export function usePriceHistory(itemName: string | undefined, options: UsePriceHistoryOptions = {}) {
  const [data, setData] = useState<PriceDataPoint[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { limit, fromDate, toDate, timeframe } = options

  useEffect(() => {
    if (!itemName) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        let fetchOptions: UsePriceHistoryOptions = { limit, fromDate, toDate }

        // If timeframe is provided, calculate date range
        if (timeframe) {
          const range = getTimeframeRange(timeframe)
          fetchOptions = { ...fetchOptions, fromDate: range.fromDate, toDate: range.toDate }
        }

        const result = await getPriceHistory(itemName, fetchOptions)
        setData(result)
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [itemName, limit, fromDate, toDate, timeframe]) // Use destructured values in dependency array

  return { data, isLoading, error }
}
