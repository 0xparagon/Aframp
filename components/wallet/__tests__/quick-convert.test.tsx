import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QuickConvert } from '../quick-convert'
import type { PaymentRequest } from '@/lib/api'

function mockRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: 'req1',
    merchant_id: 'm1',
    amount_stroops: 1000000000n,
    asset: 'XLM',
    status: 'pending',
    memo: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    paid_at: null,
    ...overrides,
  }
}

describe('QuickConvert', () => {
  it('renders no open requests state when openRequests is empty', () => {
    render(<QuickConvert openRequests={[]} />)
    
    expect(screen.getByText('Waiting to be paid')).toBeInTheDocument()
    expect(screen.getByText('No open charges right now.')).toBeInTheDocument()
  })

  it('renders the correct count badge when requests exist', () => {
    const requests = [
      mockRequest({ id: 'req1', amount_stroops: 500000000n }),
      mockRequest({ id: 'req2', amount_stroops: 750000000n }),
      mockRequest({ id: 'req3', amount_stroops: 1000000000n }),
    ]

    render(<QuickConvert openRequests={requests} />)
    
    expect(screen.queryByText('No open charges right now.')).not.toBeInTheDocument()
    expect(screen.getByText('5 XLM')).toBeInTheDocument()
    expect(screen.getByText('7.5 XLM')).toBeInTheDocument()
    expect(screen.getByText('10 XLM')).toBeInTheDocument()
  })

  it('limits display to first 5 requests', () => {
    const requests = Array.from({ length: 10 }, (_, i) =>
      mockRequest({ id: `req${i}`, amount_stroops: BigInt(i + 1) * 1000000000n })
    )

    render(<QuickConvert openRequests={requests} />)
    
    // Should only render 5 list items
    const listItems = screen.getAllByRole('link')
    expect(listItems).toHaveLength(6) // 5 requests + 1 "New charge" button
  })

  it('navigation links point to correct routes', () => {
    const requests = [
      mockRequest({ id: 'req-123', amount_stroops: 500000000n }),
      mockRequest({ id: 'req-456', amount_stroops: 750000000n }),
    ]

    render(<QuickConvert openRequests={requests} />)
    
    const requestLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('href')?.includes('/request/')
    )
    
    expect(requestLinks[0]).toHaveAttribute('href', '/request/req-123')
    expect(requestLinks[1]).toHaveAttribute('href', '/request/req-456')
  })

  it('New charge button links to /charge', () => {
    render(<QuickConvert openRequests={[]} />)
    
    const chargeButton = screen.getByRole('link', { name: /new charge/i })
    expect(chargeButton).toHaveAttribute('href', '/charge')
  })

  it('snapshot test for empty state', () => {
    const { container } = render(<QuickConvert openRequests={[]} />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('snapshot test for populated state', () => {
    const requests = [
      mockRequest({ id: 'req1', amount_stroops: 500000000n, asset: 'XLM' }),
      mockRequest({ id: 'req2', amount_stroops: 1000000000n, asset: 'USDC' }),
    ]
    const { container } = render(<QuickConvert openRequests={requests} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
