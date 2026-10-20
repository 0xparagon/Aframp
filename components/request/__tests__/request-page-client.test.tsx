import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { RequestPageClient } from '../request-page-client'
import { api, type PaymentRequest } from '@/lib/api'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: { getPaymentRequest: jest.fn() },
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

jest.mock('react-qr-code', () => () => null)

const ADDRESS = 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH'
const SEP7_URI = `web+stellar:pay?destination=${ADDRESS}&amount=100`

function paymentRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: 'req-123',
    merchant_id: 'merchant-1',
    address: ADDRESS,
    network: 'testnet',
    amount_stroops: 1_000_000_000n,
    asset: 'USDC',
    memo: 'memo-123',
    status: 'pending',
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    sep7_uri: SEP7_URI,
    ...overrides,
  }
}

describe('RequestPageClient', () => {
  const writeText = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    ;(useRouter as jest.Mock).mockReturnValue({ back: jest.fn() })
    ;(api.getPaymentRequest as jest.Mock).mockResolvedValue(paymentRequest())
    window.history.replaceState({}, '', '/')
  })

  it('renders the expired state instead of the copy and pay actions', async () => {
    ;(api.getPaymentRequest as jest.Mock).mockResolvedValue(
      paymentRequest({
        status: 'expired',
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        sep7_uri: null,
      })
    )

    render(<RequestPageClient requestId="req-123" />)

    expect(await screen.findByText('Request expired')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay with camera/i })).not.toBeInTheDocument()
  })

  it('copies the wallet address and shows feedback only on that button', async () => {
    render(<RequestPageClient requestId="req-123" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS))
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy payment link' })).toBeInTheDocument()
  })

  it('copies the current page URL and shows feedback on the link button', async () => {
    window.history.replaceState({}, '', '/request/req-123?source=merchant')
    render(<RequestPageClient requestId="req-123" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Copy payment link' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href))
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy SEP-7 URI' })).toBeInTheDocument()
  })

  it('copies the QR SEP-7 URI and shows feedback on the URI button', async () => {
    render(<RequestPageClient requestId="req-123" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Copy SEP-7 URI' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SEP7_URI))
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy payment link' })).toBeInTheDocument()
  })
})
