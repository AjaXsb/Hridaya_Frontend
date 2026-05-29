import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-screen w-full bg-bg-base p-4 gap-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between h-12 border-b border-border-subtle pb-4">
        <div className="flex gap-4">
          <Skeleton className="h-8 w-32 bg-bg-panel" />
          <Skeleton className="h-8 w-24 bg-bg-panel" />
        </div>
        <Skeleton className="h-8 w-48 bg-bg-panel" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        <Skeleton className="h-full w-full bg-bg-panel rounded-lg" />
        <Skeleton className="h-full w-full bg-bg-panel rounded-lg" />
        <Skeleton className="h-full w-full bg-bg-panel rounded-lg" />
      </div>
    </div>
  )
}
