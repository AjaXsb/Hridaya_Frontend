"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-bg-base text-text-primary gap-6">
      <div className="flex flex-col items-center gap-2">
        <AlertTriangle className="w-12 h-12 text-price-down mb-2" />
        <h2 className="text-xl font-mono font-bold text-price-down">SYSTEM_FAILURE</h2>
        <p className="text-text-secondary font-mono text-sm max-w-md text-center">
          The terminal encountered a critical error while processing market data.
        </p>
      </div>

      <div className="p-4 bg-bg-panel border border-border-default rounded-md font-mono text-xs text-text-tertiary">
        Error Code: {error.digest || "UNKNOWN_ERR"}
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-2 px-6 py-2 bg-bg-panel border border-border-default hover:bg-bg-hover hover:border-ui-focus text-text-primary rounded-md transition-all font-mono text-sm"
      >
        <RefreshCcw className="w-4 h-4" />
        REBOOT_SYSTEM
      </button>
    </div>
  )
}
