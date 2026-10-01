import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SendPageClient, buildAssets } from '../send-page-client'
import { type Balance } from '@/lib/api'
import { useRouter } from 'next/navigation'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(() => ({ token: 'test-token', userId: 'user-1', merchantId: 'merchant-1' })),
}))

jest.mock('@/lib/api', () => ({
  api: {
    createRemittance: jest.fn().mockResolvedValue({}),
  },
  ApiError: class ApiError extends Error {},
}))

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
    localStorage.clear()
  })

  it('redirects to /home (a real route) when the success step is done', async () => {
    jest.useFakeTimers()
    render(<SendPageClient balances={mockBalances} />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: /review/i }))

    fireEvent.click(screen.getByRole('button', { name: /confirm send/i }))
    await jest.runAllTimersAsync()

    fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }))

    expect(mockPush).toHaveBeenCalledWith('/home')
    expect(mockPush).not.toHaveBeenCalledWith('/dashboard')

    jest.useRealTimers()
  })

  const goToAmountStep = () => {
    render(<SendPageClient balances={mockBalances} />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  }

  it('keeps the amount display above the keypad on short screens', () => {
    goToAmountStep()

    const amountDisplay = screen.getByText('0', { selector: 'span' }).parentElement?.parentElement
    const keypad = screen.getByRole('button', { name: '1' }).parentElement

    expect(amountDisplay).toHaveClass('flex-1')
    expect(amountDisplay).toHaveClass('shrink-0')
    expect(keypad).toHaveClass('mt-auto')
  })

  it('accepts keyboard digits while the amount step is active', () => {
    goToAmountStep()

    fireEvent.keyDown(window, { key: '7' })
    fireEvent.keyDown(window, { key: '2' })

    expect(screen.getByText('72', { selector: 'span' })).toBeInTheDocument()
  })

  it('supports keyboard backspace and decimal entry in the amount step', () => {
    goToAmountStep()

    fireEvent.keyDown(window, { key: '1' })
    fireEvent.keyDown(window, { key: '2' })
    fireEvent.keyDown(window, { key: '.' })
    fireEvent.keyDown(window, { key: '3' })
    fireEvent.keyDown(window, { key: 'Backspace' })

    expect(screen.getByText('12.', { selector: 'span' })).toBeInTheDocument()
  })

  it('ignores keyboard input when the amount step is not active', () => {
    render(<SendPageClient balances={mockBalances} />)

    fireEvent.keyDown(window, { key: '9' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    fireEvent.keyDown(window, { key: '.' })

    expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument()
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

  it('adds a contact to localStorage after a successful send', async () => {
    jest.useFakeTimers()

    render(<SendPageClient balances={mockBalances} />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: {
        value: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    fireEvent.click(screen.getByRole('button', { name: /review/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm send/i }))

    act(() => {
      jest.advanceTimersByTime(2200)
    })

    const stored = localStorage.getItem('aframp_contacts')
    expect(stored).not.toBeNull()
    const contacts = JSON.parse(stored!) as Array<{ address: string; name: string }>
    expect(contacts.length).toBeGreaterThanOrEqual(1)
    expect(
      contacts.some(
        (c) => c.address === 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      )
    ).toBe(true)

    jest.useRealTimers()
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
