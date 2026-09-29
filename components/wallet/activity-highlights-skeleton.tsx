import { Skeleton } from '@/components/ui/skeleton'

export function ActivityHighlightsSkeleton() {
  return (
    <section className="bg-panel border-hairline rounded-2xl border p-5">
      <p className="text-dim text-xs">Today</p>
      <h2 className="text-lg font-bold tracking-tight text-white">Activity highlights</h2>

      <dl className="mt-4 space-y-3.5">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-baseline justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </dl>
    </section>
  )
}
