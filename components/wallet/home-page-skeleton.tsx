import { Skeleton } from '@/components/ui/skeleton'
import { BalanceFigureSkeleton } from './balance-figure-skeleton'
import { ActivityHighlightsSkeleton } from './activity-highlights-skeleton'

export function HomePageSkeleton() {
  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Home</h1>
          <p className="text-dim mt-1 text-sm">Track balances and payment activity in one place.</p>
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </header>

      <div className="mt-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="bg-panel border-hairline rounded-2xl border p-5">
          <p className="text-dim text-xs">Available to cash out</p>
          <div className="mt-1 space-y-3">
            {[1, 2].map((i) => (
              <div key={i}>
                <BalanceFigureSkeleton />
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>

          <div className="mt-6">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </section>

        <div className="space-y-5">
          <section className="bg-panel border-hairline rounded-2xl border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dim text-xs">Pending</p>
                <h2 className="text-lg font-bold tracking-tight text-white">Waiting to be paid</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="mt-5 h-12 w-full rounded-full" />
          </section>

          <ActivityHighlightsSkeleton />
        </div>
      </div>

      <div className="mt-5">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}
