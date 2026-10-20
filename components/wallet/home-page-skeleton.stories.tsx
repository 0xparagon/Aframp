import type { Meta, StoryObj } from '@storybook/react'
import { HomePageSkeleton } from './home-page-skeleton'
import { BalanceFigureSkeleton } from './balance-figure-skeleton'
import { ActivityHighlightsSkeleton } from './activity-highlights-skeleton'

const meta = {
  title: 'Wallet/Loading States',
  component: HomePageSkeleton,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HomePageSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const FullPageSkeleton: Story = {
  render: () => (
    <div className="p-6">
      <HomePageSkeleton />
    </div>
  ),
}

export const BalanceFigureLarge: Story = {
  render: () => (
    <div className="p-6 bg-panel rounded-2xl max-w-md">
      <p className="text-dim text-xs mb-2">Available to cash out</p>
      <BalanceFigureSkeleton size="lg" />
    </div>
  ),
}

export const BalanceFigureSmall: Story = {
  render: () => (
    <div className="p-6 bg-panel rounded-2xl max-w-md">
      <p className="text-dim text-xs mb-2">Card Balance</p>
      <BalanceFigureSkeleton size="sm" />
    </div>
  ),
}

export const ActivityHighlights: Story = {
  render: () => (
    <div className="p-6 max-w-md">
      <ActivityHighlightsSkeleton />
    </div>
  ),
}

export const BalanceListSkeleton: Story = {
  render: () => (
    <div className="p-6 bg-panel rounded-2xl max-w-md">
      <p className="text-dim text-xs">Available to cash out</p>
      <ul className="mt-1 space-y-3">
        {[1, 2, 3].map((i) => (
          <li key={i}>
            <BalanceFigureSkeleton />
          </li>
        ))}
      </ul>
    </div>
  ),
}
