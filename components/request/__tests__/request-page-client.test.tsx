import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import { RequestPageClient } from '../request-page-client'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('RequestPageClient', () => {
  const expiredRequest = {
    id: 'req-123',
    amount: 100,
    currency: 'USD',
    asset: 'USDC',
    description: 'Payment for consulting services',
    requesterName: 'John Doe',
    requesterWallet: 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: new Date(Date.now() - 60000).toISOString(),
  }

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 500,
    })
    ;(useRouter as jest.Mock).mockReturnValue({
      back: jest.fn(),
    })
  })

  it('renders the expired state and disables copy and pay actions', () => {
    render(<RequestPageClient requestId="req-123" request={expiredRequest} />)

    expect(screen.getAllByText('Expired').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /pay with camera/i })).toBeDisabled()
  })
})
