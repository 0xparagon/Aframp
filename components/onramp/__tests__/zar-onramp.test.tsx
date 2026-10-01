import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/lib/api'
import { ZarOnramp } from '../zar-onramp'

jest.mock('@/lib/api', () => ({
  api: {
    createOzowPayment: jest.fn(),
  },
}))

jest.mock('@/lib/payment-providers', () => ({
  OZOW_BANKS: [{ code: 'ABSA', name: 'ABSA Bank' }],
  calculateFees: () => ({ processingFee: 1.5, totalCost: 101.5 }),
  formatCurrency: (amount: number, currency: string) => `${currency} ${amount}`,
}))

// Mock Select so we can drive it with simple DOM events in jsdom.
jest.mock('@/components/ui/select', () => {
  const React = jest.requireActual('react')
  return {
    Select: ({ value, onValueChange, children }: any) =>
      React.createElement(
        'select',
        {
          value,
          onChange: (e: any) => onValueChange(e.target.value),
          'data-testid': 'bank-select',
        },
        children
      ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => children,
    SelectItem: ({ value, children }: any) => React.createElement('option', { value }, children),
  }
})

const mockCreateOzowPayment = api.createOzowPayment as jest.Mock

// Track window.location.href assignments without redefining the property.
let assignedHref = ''

beforeAll(() => {
  // jsdom sets window.location as non-configurable by default.
  // Delete it first so we can install our own writable descriptor.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).location
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      href: '',
      origin: 'https://app.aframp.com',
    },
  })
})

beforeEach(() => {
  assignedHref = ''
  // Reset href and intercept assignments.
  Object.defineProperty(window.location, 'href', {
    configurable: true,
    set(val: string) {
      assignedHref = val
    },
    get() {
      return assignedHref
    },
  })
  jest.clearAllMocks()
})

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  render(<ZarOnramp token="test-token" />)
  await user.type(screen.getByLabelText('Amount (ZAR)'), '100')
  fireEvent.change(screen.getByTestId('bank-select'), { target: { value: 'ABSA' } })
  await user.click(screen.getByRole('button', { name: /continue to ozow/i }))
}

describe('ZarOnramp – payment_url validation (#639)', () => {
  it('redirects to a valid https://ozow.com URL', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({
      payment_url: 'https://pay.ozow.com/initiate?token=abc',
    })

    await fillAndSubmit(user)

    await waitFor(() =>
      expect(assignedHref).toBe('https://pay.ozow.com/initiate?token=abc')
    )
  })

  it('rejects a javascript: URL and shows an error', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({
      payment_url: 'javascript:alert(1)',
    })

    await fillAndSubmit(user)

    expect(
      await screen.findByText(/Invalid payment URL received from server/i)
    ).toBeInTheDocument()
    expect(assignedHref).toBe('')
  })

  it('rejects an http:// (non-https) URL and shows an error', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({
      payment_url: 'http://pay.ozow.com/initiate',
    })

    await fillAndSubmit(user)

    expect(
      await screen.findByText(/Payment URL failed security validation/i)
    ).toBeInTheDocument()
    expect(assignedHref).toBe('')
  })

  it('rejects a URL on a non-Ozow domain and shows an error', async () => {
    const user = userEvent.setup()
    mockCreateOzowPayment.mockResolvedValue({
      payment_url: 'https://evil.example.com/steal',
    })

    await fillAndSubmit(user)

    expect(
      await screen.findByText(/Payment URL failed security validation/i)
    ).toBeInTheDocument()
    expect(assignedHref).toBe('')
  })
})
