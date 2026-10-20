import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'skeleton relative overflow-hidden rounded bg-muted/40 dark:bg-muted/30',
        className
      )}
    >
      <div className="skeleton-sweep absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  )
}
