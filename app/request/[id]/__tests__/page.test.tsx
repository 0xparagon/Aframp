import { Suspense } from 'react'
import { act, render, screen } from '@testing-library/react'
import PaymentRequestPage from '../page'
import { api, ApiError, type PaymentRequest } from '@/lib/api'

const POLL_INTERVAL_MS = 3000

jest.mock('@/lib/api', () => ({
  api: {
    getPaymentRequest: jest.fn(),
  },
  ApiError: class extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}))

const mockGetPaymentRequest = api.getPaymentRequest as jest.Mock

function pendingRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: 'req_123',
    merchant_id: 'merchant-1',
    address: 'GTEST123',
    network: 'stellar',
    amount_stroops: 25000000n,
    asset: 'XLM',
    memo: 'memo',
    status: 'pending',
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    created_at: new Date().toISOString(),
    sep7_uri: 'web+stellar:pay?destination=GTEST123&amount=2.5',
    ...overrides,
  }
}

const networkError = () => new ApiError('offline', 0)

/** The page unwraps `params` with React's use(), which suspends on first render. */
async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <PaymentRequestPage params={Promise.resolve({ id: 'req_123' })} />
      </Suspense>
    )
    await Promise.resolve()
  })
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms)
    await Promise.resolve()
  })
}

describe('PaymentRequestPage polling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockGetPaymentRequest.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('stops polling after 3 consecutive network errors and shows a retry button', async () => {
    mockGetPaymentRequest.mockRejectedValue(networkError())

    await renderPage()
    await advance(POLL_INTERVAL_MS)
    await advance(POLL_INTERVAL_MS)

    expect(mockGetPaymentRequest).toHaveBeenCalledTimes(3)

    // Polling has stopped: no further calls even after more intervals.
    await advance(POLL_INTERVAL_MS * 5)
    expect(mockGetPaymentRequest).toHaveBeenCalledTimes(3)

    expect(screen.getByRole('button', { name: /try again|retry/i })).toBeInTheDocument()
  })

  it('resets the error counter after a successful load', async () => {
    mockGetPaymentRequest
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(pendingRequest())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue(pendingRequest())

    await renderPage()
    for (let i = 0; i < 5; i++) await advance(POLL_INTERVAL_MS)

    // Two failures, a success, two more failures, then success: never three in a row,
    // so polling is still running.
    expect(mockGetPaymentRequest).toHaveBeenCalledTimes(6)
    await advance(POLL_INTERVAL_MS)
    expect(mockGetPaymentRequest).toHaveBeenCalledTimes(7)
  })

  it('stops polling once the request is paid', async () => {
    mockGetPaymentRequest
      .mockResolvedValueOnce(pendingRequest())
      .mockResolvedValue(pendingRequest({ status: 'paid' }))

    await renderPage()
    await advance(POLL_INTERVAL_MS)
    expect(mockGetPaymentRequest).toHaveBeenCalledTimes(2)

    await advance(POLL_INTERVAL_MS * 5)
    expect(mockGetPaymentRequest).toHaveBeenCalledTimes(2)
  })
})
