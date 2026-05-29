"use client"

import { useTerminalMeta } from "@/hooks/use-tracked-items"
import { formatRelativeTime } from "@/lib/format"
import { MOCK_NOW } from "@/mocks"
import { cn } from "@/lib/utils"

// Top chrome: >_ CS2 TERMINAL identity plus the engine-level stats — rate-limit
// budget, tracked-item count, last ingest time.
export function TerminalHeader() {
  const { data: meta } = useTerminalMeta()

  const rate = meta?.rateLimit
  const nearLimit = rate ? rate.used / rate.limit >= 0.8 : false

  return (
    <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b border-border-default bg-bg-base px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center font-medium text-ui-selected">
          <span className="font-mono tracking-tight">{">_"}</span>
          <span className="ml-2 tracking-tight">CS2 TERMINAL</span>
        </div>
        <div className="mx-2 h-4 w-px bg-border-subtle" />
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-live" />
          <span>MARKET LIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-4 font-mono text-[11px] text-text-tertiary">
        {/* rate-limit budget */}
        <span className={cn("flex items-center gap-1.5", nearLimit && "text-spread")}>
          <span className="uppercase tracking-wider">REQ</span>
          <span className={cn("font-medium", nearLimit ? "text-spread" : "text-text-secondary")}>
            {rate ? `${rate.used}/${rate.limit}` : "—"}
          </span>
          <span>· {rate ? `${rate.windowSec}s` : "—"}</span>
        </span>

        <span className="h-3 w-px bg-border-subtle" />

        {/* tracked-item count */}
        <span className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider">TRACKED</span>
          <span className="font-medium text-text-secondary">{meta?.trackedCount ?? "—"}</span>
        </span>

        <span className="h-3 w-px bg-border-subtle" />

        {/* last ingest */}
        <span className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider">INGEST</span>
          <span className="font-medium text-text-secondary">
            {meta ? formatRelativeTime(meta.lastIngestT, MOCK_NOW) : "—"}
          </span>
        </span>
      </div>
    </header>
  )
}
