import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import TransactionsPage from '../page'
import { api } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  api: {
    listTransactions: jest.fn(),
    getBalances: jest.fn(),
    listRefunds: jest.fn(),
    createRefund: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token' }),
}))

const mockListTransactions = api.listTransactions as jest.Mock
const mockGetBalances = api.getBalances as jest.Mock
const mockListRefunds = api.listRefunds as jest.Mock
const mockCreateRefund = api.createRefund as jest.Mock

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    merchant_id: 'merchant-1',
    wallet_id: 'wallet-1',
    wallet_address: 'GABCDEF1234567890',
    tx_hash: 'tx-hash',
    amount_stroops: 10_000_000n,
    asset: 'XLM',
    network: 'stellar',
    status: 'confirmed',
    confirmations: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockListTransactions.mockResolvedValue([payment()])
  mockGetBalances.mockResolvedValue([])
  mockListRefunds.mockResolvedValue([])
  mockCreateRefund.mockResolvedValue({
    id: 'refund-1',
    payment_id: 'payment-1',
    merchant_id: 'merchant-1',
    amount_stroops: 5_000_000n,
    asset: 'XLM',
    status: 'pending',
    recipient: 'GRECIPIENT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
})

describe('TransactionsPage', () => {
  it('opens the refund dialog and calls createRefund with the expected arguments', async () => {
    const user = userEvent.setup()
    render(<TransactionsPage />)

    await screen.findByText('Refund')
    await user.click(screen.getByRole('button', { name: 'Refund' }))

    expect(screen.getByRole('heading', { name: 'Refund payment' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Refund amount'))
    await user.type(screen.getByLabelText('Refund amount'), '0.5')
    await user.clear(screen.getByLabelText('Recipient address'))
    await user.type(screen.getByLabelText('Recipient address'), 'GRECIPIENT')
    await user.type(screen.getByLabelText('Reason (optional)'), 'Customer request')
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }))

    await waitFor(() =>
      expect(mockCreateRefund).toHaveBeenCalledWith(
        'test-token',
        'payment-1',
        5_000_000n,
        'GRECIPIENT',
        'Customer request'
      )
    )
  })

  it('shows the refund success and error feedback when the API fails', async () => {
    const user = userEvent.setup()
    mockCreateRefund.mockRejectedValueOnce(new Error('Refund not allowed'))
    render(<TransactionsPage />)

    await screen.findByText('Refund')
    await user.click(screen.getByRole('button', { name: 'Refund' }))
    await user.clear(screen.getByLabelText('Refund amount'))
    await user.type(screen.getByLabelText('Refund amount'), '0.5')
    await user.clear(screen.getByLabelText('Recipient address'))
    await user.type(screen.getByLabelText('Recipient address'), 'GRECIPIENT')
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }))

    expect(await screen.findByText('Refund not allowed')).toBeInTheDocument()

    mockCreateRefund.mockResolvedValueOnce({
      id: 'refund-2',
      payment_id: 'payment-1',
      merchant_id: 'merchant-1',
      amount_stroops: 5_000_000n,
      asset: 'XLM',
      status: 'pending',
      recipient: 'GRECIPIENT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await user.clear(screen.getByLabelText('Refund amount'))
    await user.type(screen.getByLabelText('Refund amount'), '0.5')
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }))

    await waitFor(() =>
      expect(screen.getByText(/Refund requested successfully/i)).toBeInTheDocument()
    )
  })
})
