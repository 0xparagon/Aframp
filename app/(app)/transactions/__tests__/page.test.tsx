import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Balance, Payment, Refund } from '@/lib/api'
import TransactionsPage from '../page'

jest.mock('@/lib/api', () => ({
  api: {
    listTransactions: jest.fn(),
    getBalances: jest.fn(),
    listRefunds: jest.fn(),
    createRefund: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    status = 500
  },
}))

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token' }),
}))

import { api } from '@/lib/api'

const mockListTransactions = api.listTransactions as jest.Mock
const mockGetBalances = api.getBalances as jest.Mock
const mockListRefunds = api.listRefunds as jest.Mock

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    merchant_id: 'merchant-1',
    wallet_id: 'wallet-1',
    wallet_address: 'GABCDEF123456789',
    tx_hash: 'hash-cngn-123',
    amount_stroops: 1_000_000_000n,
    asset: 'cNGN',
    network: 'stellar',
    status: 'detected',
    confirmations: 0,
    created_at: '2025-06-15T12:00:00.000Z',
    updated_at: '2025-06-15T12:00:00.000Z',
    ...overrides,
  }
}

function balance(asset: string, available: bigint): Balance {
  return { merchant_id: 'merchant-1', asset, available, pending: 0n, updated_at: '' }
}

function refund(overrides: Partial<Refund> = {}): Refund {
  return {
    id: 'refund-1',
    payment_id: 'payment-2',
    merchant_id: 'merchant-1',
    amount_stroops: 2_000_000_000n,
    asset: 'cKES',
    status: 'completed',
    recipient: 'GABCDEF123456789',
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockListTransactions.mockResolvedValue([
    payment(),
    payment({
      id: 'payment-2',
      tx_hash: 'hash-ckes-456',
      asset: 'cKES',
      status: 'confirmed',
      amount_stroops: 2_000_000_000n,
      created_at: '2025-06-16T12:00:00.000Z',
    }),
  ])
  mockGetBalances.mockResolvedValue([] as Balance[])
  mockListRefunds.mockResolvedValue([] as Refund[])
  ;(api.createRefund as jest.Mock).mockResolvedValue(refund())
})

describe('TransactionsPage filters', () => {
  it('filters transactions by status and inclusive date range', async () => {
    render(<TransactionsPage />)
    expect(await screen.findByText('100 cNGN')).toBeInTheDocument()
    expect(screen.getByText('200 cKES')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'detected' } })
    expect(screen.getByText('100 cNGN')).toBeInTheDocument()
    expect(screen.queryByText('200 cKES')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'all' } })
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2025-06-16' } })
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2025-06-16' } })

    expect(screen.getByText('200 cKES')).toBeInTheDocument()
    expect(screen.queryByText('100 cNGN')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } })
    expect(screen.getByRole('status')).toHaveTextContent('No payments match these filters.')
  })

  it('debounces search before filtering the transaction list', async () => {
    render(<TransactionsPage />)
    expect(await screen.findByText('100 cNGN')).toBeInTheDocument()
    expect(screen.getByText('200 cKES')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'hash-ckes' },
    })

    expect(screen.getByText('100 cNGN')).toBeInTheDocument()
    expect(screen.getByText('200 cKES')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('100 cNGN')).not.toBeInTheDocument()
    })
    expect(screen.getByText('200 cKES')).toBeInTheDocument()
  })

  it('shows balances and adds a confirmed refund to the list', async () => {
    mockGetBalances.mockResolvedValue([balance('cNGN', 5_000_000_000n)])
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true)

    render(<TransactionsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Refund' }))

    await waitFor(() => {
      expect(api.createRefund).toHaveBeenCalledWith(
        'test-token',
        'payment-2',
        2_000_000_000n,
        'GABCDEF123456789',
        'merchant refund'
      )
    })
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByText('cNGN available')).toBeInTheDocument()
    expect(screen.getAllByText('200 cKES')).toHaveLength(2)
    expect(screen.getByText('completed')).toBeInTheDocument()
  })
})
