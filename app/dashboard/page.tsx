"use client"

import { TerminalHeader } from "@/components/layout/TerminalHeader"
import { ItemCard } from "@/components/market/ItemCard"
import { TrackedTicker } from "@/components/market/TrackedTicker"
import { TerminalLoader } from "@/components/ui/loader"
import { useTrackedItems } from "@/hooks/use-tracked-items"

// Overview screen: terminal chrome + tracked-item ticker + a stack of ItemCards,
// one per tracked item, each rendering its stream's body from mock data.
export default function DashboardPage() {
  const { data: items, isPending } = useTrackedItems()

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-bg-deepest font-sans text-text-primary selection:bg-ui-selected/30">
      <TerminalHeader />
      <TrackedTicker />

      <main className="flex-1 overflow-y-auto p-2">
        {isPending || !items ? (
          <div className="h-[400px]">
            <TerminalLoader text="LOADING TRACKED ITEMS" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.marketHashName}
                className="relative flex h-[520px] flex-col overflow-hidden rounded-lg border border-border-default bg-bg-panel transition-colors hover:border-border-subtle"
              >
                <ItemCard item={item} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
