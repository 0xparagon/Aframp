import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SendPageClient, buildAssets } from '../send-page-client'
import { type Balance } from '@/lib/api'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockBalances: Balance[] = [
  {
    merchant_id: 'merchant-1',
    asset: 'XLM',
    available: 12450000000n, // 1,245 XLM in stroops
    pending: 0n,
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    merchant_id: 'merchant-1',
    asset: 'USDC',
    available: 5000000000n, // 500 USDC in stroops
    pending: 0n,
    updated_at: '2024-01-01T00:00:00Z',
  },
]

describe('SendPageClient', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
  })

  it('keeps the amount display above the keypad on short screens', () => {
    render(<SendPageClient balances={mockBalances} />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    const amountDisplay = screen.getByText('0', { selector: 'span' }).parentElement?.parentElement
    const keypad = screen.getByRole('button', { name: '1' }).parentElement

    expect(amountDisplay).toHaveClass('flex-1')
    expect(amountDisplay).toHaveClass('shrink-0')
    expect(keypad).toHaveClass('mt-auto')
  })

  it('displays the balance from the API for the selected asset', () => {
    render(<SendPageClient balances={mockBalances} />)

    // Navigate to the amount step
    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // The default asset is XLM — 12450000000 stroops = 1,245 XLM
    expect(screen.getByText(/Balance: 1,245 XLM/)).toBeInTheDocument()
  })

  it('shows zero balance for assets not present in the API response', () => {
    render(<SendPageClient balances={[]} />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByText(/Balance: 0 XLM/)).toBeInTheDocument()
  })

  it('updates displayed balance when a different asset is selected', () => {
    render(<SendPageClient balances={mockBalances} />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // Switch from XLM to USDC
    fireEvent.click(screen.getByRole('button', { name: 'USDC' }))

    // 5000000000 stroops = 500 USDC
    expect(screen.getByText(/Balance: 500 USDC/)).toBeInTheDocument()
  })
})

describe('buildAssets', () => {
  it('maps API balance stroops through formatStroops for display', () => {
    const assets = buildAssets(mockBalances)
    const xlm = assets.find((a) => a.symbol === 'XLM')
    expect(xlm?.balance).toBe('1,245')
  })

  it('defaults to "0" for assets not in the API response', () => {
    const assets = buildAssets([])
    assets.forEach((asset) => {
      expect(asset.balance).toBe('0')
    })
  })

  it('uses the available stroops, not pending', () => {
    const balances: Balance[] = [
      {
        merchant_id: 'merchant-1',
        asset: 'XLM',
        available: 100000000n, // 10 XLM
        pending: 999999999n, // large pending should not affect display
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]
    const assets = buildAssets(balances)
    const xlm = assets.find((a) => a.symbol === 'XLM')
    expect(xlm?.balance).toBe('10')
  })
})
