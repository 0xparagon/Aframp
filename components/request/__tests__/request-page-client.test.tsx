import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import { RequestPageClient } from '../request-page-client'
import { api } from '@/lib/api'

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

describe('RequestPageClient', () => {
  const expiredRequest = {
    id: 'req-123',
    merchant_id: 'merchant-1',
    address: 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH',
    network: 'testnet',
    amount_stroops: 1000000000n,
    asset: 'USDC',
    memo: 'memo-123',
    status: 'expired',
    expires_at: new Date(Date.now() - 60000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    sep7_uri: null,
  }

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      back: jest.fn(),
    })
  })

  it('renders the expired state instead of the copy and pay actions', async () => {
    ;(api.getPaymentRequest as jest.Mock).mockResolvedValue(expiredRequest)

    render(<RequestPageClient requestId="req-123" />)

    expect(await screen.findByText('Request expired')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay with camera/i })).not.toBeInTheDocument()
  })
})
