import { render, screen, within } from '@testing-library/react'
import { act, useState } from 'react'
import { RevenueChart } from '@/components/wallet/revenue-chart'
import type { Payment } from '@/lib/api'
import * as revenueModule from '@/lib/revenue'

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: 'p1',
    merchant_id: 'm1',
    wallet_id: 'w1',
    wallet_address: 'GADDRESS',
    tx_hash: 'hash',
    amount_stroops: 10_000_000n,
    asset: 'XLM',
    network: 'testnet',
    status: 'confirmed',
    confirmations: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('RevenueChart', () => {
  it('shows an empty state and an accessible table with no data rows when there are no confirmed payments', () => {
    render(<RevenueChart payments={[]} />)
    expect(screen.getByText(/no confirmed payments/i)).toBeInTheDocument()

    const table = screen.getByRole('table', { hidden: true })
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(8) // header + 7 days
  })

  it('renders an accessible table with a column per asset and the day totals', () => {
    render(
      <RevenueChart
        payments={[
          payment({ asset: 'XLM', amount_stroops: 10_000_000n }),
          payment({ asset: 'cNGN', amount_stroops: 50_000_000n }),
          payment({ asset: 'XLM', status: 'detected' }), // unconfirmed — excluded
        ]}
      />
    )

    const table = screen.getByRole('table', { hidden: true })
    expect(within(table).getByText('XLM', { selector: 'th' })).toBeInTheDocument()
    expect(within(table).getByText('cNGN', { selector: 'th' })).toBeInTheDocument()
    expect(within(table).getByText('1.00')).toBeInTheDocument()
    expect(within(table).getByText('5.00')).toBeInTheDocument()
  })

  it('has a caption describing the table for screen readers', () => {
    render(<RevenueChart payments={[payment({})]} />)
    expect(
      screen.getByText('Total confirmed payments per day for the last 7 days')
    ).toBeInTheDocument()
  })

  it('memoizes expensive calculations and does not recalculate when unrelated state changes', () => {
    const buildDailyRevenueSpy = jest.spyOn(revenueModule, 'buildDailyRevenue')
    const assetsInSeriesSpy = jest.spyOn(revenueModule, 'assetsInSeries')

    const testPayments = [
      payment({ asset: 'XLM', amount_stroops: 10_000_000n }),
      payment({ asset: 'cNGN', amount_stroops: 50_000_000n }),
    ]

    // Test component that can trigger unrelated state changes
    function TestWrapper() {
      const [unrelatedState, setUnrelatedState] = useState(false)
      return (
        <div>
          <RevenueChart payments={testPayments} />
          <button onClick={() => setUnrelatedState(!unrelatedState)}>
            Toggle: {unrelatedState.toString()}
          </button>
        </div>
      )
    }

    const { getByRole } = render(<TestWrapper />)

    // Initial render should call the functions once
    expect(buildDailyRevenueSpy).toHaveBeenCalledTimes(1)
    expect(assetsInSeriesSpy).toHaveBeenCalledTimes(1)

    // Reset call counts
    buildDailyRevenueSpy.mockClear()
    assetsInSeriesSpy.mockClear()

    // Trigger unrelated state change
    act(() => {
      getByRole('button').click()
    })

    // Functions should not be called again since payments didn't change
    expect(buildDailyRevenueSpy).not.toHaveBeenCalled()
    expect(assetsInSeriesSpy).not.toHaveBeenCalled()

    // Cleanup
    buildDailyRevenueSpy.mockRestore()
    assetsInSeriesSpy.mockRestore()
  })
})
