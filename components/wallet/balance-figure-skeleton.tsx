import { Skeleton } from '@/components/ui/skeleton'

interface BalanceFigureSkeletonProps {
  size?: 'lg' | 'sm'
}

export function BalanceFigureSkeleton({ size = 'lg' }: BalanceFigureSkeletonProps) {
  const amountHeight = size === 'lg' ? 'h-10' : 'h-7'
  const amountWidth = size === 'lg' ? 'w-48' : 'w-32'

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <Skeleton className={`${amountHeight} ${amountWidth}`} />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}
