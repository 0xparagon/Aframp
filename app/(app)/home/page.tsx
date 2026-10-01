'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { ActivityHighlights } from '@/components/wallet/activity-highlights'
import { BalanceFigure } from '@/components/wallet/balance-figure'
import { QuickActions } from '@/components/wallet/quick-actions'
import { QuickConvert } from '@/components/wallet/quick-convert'
import { RevenueChart } from '@/components/wallet/revenue-chart'
import { TopAssets } from '@/components/wallet/top-assets'
import { ErrorState } from '@/components/ui/error-state'
import { HomePageSkeleton } from '@/components/wallet/home-page-skeleton'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { api, type Payment, type PaymentRequest } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useDataLoader } from '@/hooks/use-data-loader'
import { useMemo } from 'react'

interface DashboardData {
  balances: Awaited<ReturnType<typeof api.getBalances>>
  payments: Payment[]
  requests: PaymentRequest[]
}

export default function HomePage() {
  const { token } = useAuthenticatedSession()

  const { data, error, loading, reload } = useDataLoader<DashboardData>(
    async (signal) => {
      const [balances, payments, requests] = await Promise.all([
        api.getBalances(token, signal),
        api.listTransactions(token, 50, signal),
        api.listPaymentRequests(token, 20, signal),
      ])
      return { balances, payments, requests }
    },
    [token]
  )

  const openRequests = useMemo(
    () => data?.requests.filter((request) => request.status === 'pending') ?? [],
    [data?.requests]
  )

  if (error) return <ErrorState message={error} onRetry={reload} />
  if (loading || !data) return <HomePageSkeleton />

  const { balances, payments } = data

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Home</h1>
          <p className="text-dim mt-1 text-sm">Track balances and payment activity in one place.</p>
        </div>
        <Link
          href="/charge"
          className="from-cta-from to-cta-to flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          New charge <ArrowRight className="size-4" strokeWidth={2.5} />
        </Link>
      </header>

      <div className="mt-6">
        <OnboardingChecklist />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section
          className="bg-panel border-hairline rounded-2xl border p-5"
          aria-live="polite"
          aria-atomic="true"
          aria-label="Available balance"
        >
          <p className="text-dim text-xs">Available to cash out</p>
          {balances.length === 0 ? (
            <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
              0.00 <span className="text-dim text-base font-medium">XLM</span>
            </p>
          ) : (
            <ul className="mt-1 space-y-3">
              {balances.map((balance) => (
                <li key={balance.asset}>
                  <BalanceFigure
                    asset={balance.asset}
                    available={balance.available}
                    pending={balance.pending}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <QuickActions />
          </div>

          <div className="mt-6">
            <TopAssets balances={balances} />
          </div>
        </section>

        <div className="space-y-5">
          <QuickConvert openRequests={openRequests} />
          <ActivityHighlights payments={payments} openRequestCount={openRequests.length} />
        </div>
      </div>

      <div className="mt-5">
        <RevenueChart payments={payments} />
      </div>
    </div>
  )
}
