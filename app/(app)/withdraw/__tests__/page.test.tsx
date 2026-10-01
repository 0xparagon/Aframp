import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api, ApiError } from '@/lib/api'
import WithdrawPage from '../page'

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    api: {
      getBalances: jest.fn(),
      listWithdrawals: jest.fn(),
      createWithdrawal: jest.fn(),
    },
    ApiError,
  }
})

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token' }),
}))

// Replace Radix Select with a plain <select> so value changes can be driven
// through ordinary DOM events in jsdom.
jest.mock('@/components/ui/select', () => {
  const React = jest.requireActual('react')
  return {
    Select: ({ value, onValueChange, disabled, children }: any) =>
      React.createElement(
        'select',
        {
          value,
          disabled,
          onChange: (event: any) => onValueChange(event.target.value),
        },
        children
      ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => children,
    SelectItem: ({ value, children }: any) => React.createElement('option', { value }, children),
  }
})

const mockGetBalances = api.getBalances as jest.Mock
const mockListWithdrawals = api.listWithdrawals as jest.Mock
const mockCreateWithdrawal = api.createWithdrawal as jest.Mock

function balance(asset: string, available: bigint) {
  return { merchant_id: 'm', asset, available, pending: 0n, updated_at: '' }
}

function withdrawal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    merchant_id: 'm',
    amount_stroops: 500_000_000n,
    asset: 'cNGN',
    status: 'completed',
    provider: null,
    provider_reference: null,
    bank_code: '044',
    account_number: '0123456789',
    failure_reason: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetBalances.mockResolvedValue([])
  mockListWithdrawals.mockResolvedValue([])
  mockCreateWithdrawal.mockResolvedValue({})
})

describe('WithdrawPage', () => {
  it('shows a spinner while balances are loading', () => {
    mockGetBalances.mockReturnValue(new Promise(() => {}))
    mockListWithdrawals.mockReturnValue(new Promise(() => {}))
    render(<WithdrawPage />)
    expect(screen.queryByRole('heading', { name: 'Cash out' })).not.toBeInTheDocument()
  })

  it('shows a no-balance message when nothing can be cashed out', async () => {
    render(<WithdrawPage />)
    expect(await screen.findByText(/no balance to cash out/i)).toBeInTheDocument()
  })

  it('keeps the selected asset configured when withdrawable balances become empty', async () => {
    const user = userEvent.setup()
    mockGetBalances
      .mockResolvedValueOnce([balance('cNGN', 10_000_000_000n)])
      .mockResolvedValueOnce([])

    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })

    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '044' } })
    await user.type(screen.getByLabelText('Account number'), '0123456789')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))

    expect(await screen.findByText(/no balance to cash out/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Amount (cNGN)')).toBeDisabled()
    expect(screen.getByText('0 cNGN available')).toBeInTheDocument()
  })

  it('shows the load error when the backend fails', async () => {
    mockGetBalances.mockRejectedValue(new ApiError('boom', 500))
    render(<WithdrawPage />)
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('renders recent cash-outs', async () => {
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    mockListWithdrawals.mockResolvedValue([withdrawal()])
    render(<WithdrawPage />)
    expect(await screen.findByText('50 cNGN')).toBeInTheDocument()
    expect(screen.getByText('Paid out')).toBeInTheDocument()
  })

  it('shows an asset selector when multiple assets have balances', async () => {
    mockGetBalances.mockResolvedValue([
      balance('cNGN', 10_000_000_000n),
      balance('cKES', 5_000_000_000n),
    ])
    render(<WithdrawPage />)
    expect(await screen.findByText('Asset')).toBeInTheDocument()
  })

  it('rejects an amount with more than two decimals', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '0.001')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(
      await screen.findByText('Amount must have at most 2 decimal places.')
    ).toBeInTheDocument()
  })

  it('rejects an amount below the minimum', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '0.01')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(await screen.findByText('The smallest cash-out is 50 cNGN.')).toBeInTheDocument()
  })

  it('rejects an amount above the available balance', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 100_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '1000')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(await screen.findByText('That is more than your available balance.')).toBeInTheDocument()
  })

  it('requires a bank before submitting', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(await screen.findByText('Choose your bank.')).toBeInTheDocument()
  })

  it('requires a full account number', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)
    await screen.findByRole('heading', { name: 'Cash out' })
    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '044' } })
    await user.type(screen.getByLabelText('Account number'), '123')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))
    expect(await screen.findByText('Account numbers are 10 digits.')).toBeInTheDocument()
  })

  it('submits a valid cash-out', async () => {
    const user = userEvent.setup()
    mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
    render(<WithdrawPage />)

    await screen.findByRole('heading', { name: 'Cash out' })

    await user.type(screen.getByLabelText('Amount (cNGN)'), '50')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '044' } })
    await user.type(screen.getByLabelText('Account number'), '0123456789')
    await user.click(screen.getByRole('button', { name: 'Cash out' }))

    await waitFor(() =>
      expect(mockCreateWithdrawal).toHaveBeenCalledWith(
        'test-token',
        500_000_000n,
        '044',
        '0123456789',
        'cNGN'
      )
    )
  })

  it('falls back to hardcoded BANKS when /api/banks fetch fails', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    try {
      mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
      render(<WithdrawPage />)
      await screen.findByRole('heading', { name: 'Cash out' })
      expect(await screen.findByText('Access Bank')).toBeInTheDocument()
      expect(screen.getByText('Kuda Bank')).toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })

  it('updates bank options when /api/banks fetch succeeds', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          data: [{ code: '999', name: 'Custom Live Bank' }],
        }),
        { status: 200 }
      )
    )
    try {
      mockGetBalances.mockResolvedValue([balance('cNGN', 10_000_000_000n)])
      render(<WithdrawPage />)
      await screen.findByRole('heading', { name: 'Cash out' })
      expect(await screen.findByText('Custom Live Bank')).toBeInTheDocument()
    } finally {
      global.fetch = originalFetch
    }
  })
})

describe('session-provider authentication logic', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('useAuthenticatedSession throws when no token is in context', () => {
    jest.isolateModules(() => {
      const React = jest.requireActual('react')
      const { renderHook } = jest.requireActual('@testing-library/react')
      const { useAuthenticatedSession } = jest.requireActual(
        '@/components/session-provider'
      )

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children)

      expect(() => renderHook(() => useAuthenticatedSession(), { wrapper })).toThrow()
    })
  })

  it('registers setUnauthorizedHandler on mount and clears it on unmount', () => {
    jest.isolateModules(() => {
      const React = jest.requireActual('react')
      const { render } = jest.requireActual('@testing-library/react')
      const { SessionProvider } = jest.requireActual('@/components/session-provider')

      const setUnauthorizedHandler = jest.fn()
      const clearUnauthorizedHandler = jest.fn()

      const { unmount } = render(
        React.createElement(
          SessionProvider,
          {
            token: 'test-token',
            setUnauthorizedHandler,
            clearUnauthorizedHandler,
          } as any,
          React.createElement('div', null, 'child')
        )
      )

      expect(setUnauthorizedHandler).toHaveBeenCalledTimes(1)
      expect(typeof setUnauthorizedHandler.mock.calls[0][0]).toBe('function')

      unmount()

      expect(clearUnauthorizedHandler).toHaveBeenCalledTimes(1)
    })
  })

  it('a 401 response triggers logout and redirect to /login', async () => {
    jest.isolateModules(() => {
      const React = jest.requireActual('react')
      const { render, act } = jest.requireActual('@testing-library/react')
      const { SessionProvider } = jest.requireActual('@/components/session-provider')

      let handler: ((error: unknown) => void) | undefined
      const setUnauthorizedHandler = jest.fn((fn: (error: unknown) => void) => {
        handler = fn
      })
      const clearUnauthorizedHandler = jest.fn()
      const logout = jest.fn()

      render(
        React.createElement(
          SessionProvider,
          {
            token: 'test-token',
            logout,
            setUnauthorizedHandler,
            clearUnauthorizedHandler,
          } as any,
          React.createElement('div', null, 'child')
        )
      )

      expect(handler).toBeDefined()

      act(() => {
        handler!(new ApiError('unauthorized', 401))
      })

      expect(logout).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
