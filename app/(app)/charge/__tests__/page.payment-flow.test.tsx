import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChargePage from '../page'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    createPaymentRequest: jest.fn(),
  },
  ApiError: class extends Error {
    constructor(message: string, public status: number) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

describe('ChargePage', () => {
  const push = jest.fn()
  const mockCreatePaymentRequest = api.createPaymentRequest as jest.Mock

  beforeEach(() => {
    push.mockReset()
    mockCreatePaymentRequest.mockReset()
    ;(useRouter as jest.Mock).mockReturnValue({ push })
    ;(useAuthenticatedSession as jest.Mock).mockReturnValue({
      token: 'test-token',
      userId: 'user-123',
      merchantId: 'merchant-123',
    })
  })

  describe('keypad input', () => {
    it('renders the keypad with all digits and controls', () => {
      render(<ChargePage />)

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '0' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '.' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete last digit' })).toBeInTheDocument()
    })

    it('accepts numeric input from keypad', async () => {
      const user = userEvent.setup()
      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '1' }))
      await user.click(screen.getByRole('button', { name: '2' }))
      await user.click(screen.getByRole('button', { name: '3' }))

      expect(screen.getByText('123')).toBeInTheDocument()
    })

    it('handles decimal point input', async () => {
      const user = userEvent.setup()
      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '2' }))
      await user.click(screen.getByRole('button', { name: '.' }))
      await user.click(screen.getByRole('button', { name: '5' }))

      expect(screen.getByText('2.5')).toBeInTheDocument()
    })

    it('prevents more than one decimal point', async () => {
      const user = userEvent.setup()
      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '1' }))
      await user.click(screen.getByRole('button', { name: '.' }))
      await user.click(screen.getByRole('button', { name: '5' }))
      await user.click(screen.getByRole('button', { name: '.' }))

      expect(screen.getByText('1.5')).toBeInTheDocument()
    })

    it('prevents more than 7 decimal places (Stellar stroops limit)', async () => {
      const user = userEvent.setup()
      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '1' }))
      await user.click(screen.getByRole('button', { name: '.' }))
      
      // Try to add 8 decimal digits
      for (let i = 0; i < 8; i++) {
        await user.click(screen.getByRole('button', { name: '1' }))
      }

      // Should only show 7 decimals
      expect(screen.getByText('1.1111111')).toBeInTheDocument()
    })

    it('handles backspace to remove last digit', async () => {
      const user = userEvent.setup()
      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '1' }))
      await user.click(screen.getByRole('button', { name: '2' }))
      await user.click(screen.getByRole('button', { name: '3' }))
      await user.click(screen.getByRole('button', { name: 'Delete last digit' }))

      expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('backspace on empty input shows zero', async () => {
      const user = userEvent.setup()
      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: 'Delete last digit' }))

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('replaces leading zero when typing digits', async () => {
      const user = userEvent.setup()
      render(<ChargePage />)

      // Input starts at "0"
      expect(screen.getByText('0')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '5' }))

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.queryByText('05')).not.toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('disables the charge button when amount is zero', () => {
      render(<ChargePage />)

      const button = screen.getByRole('button', { name: /Show payment code/i })
      expect(button).toBeDisabled()
    })

    it('enables the charge button when amount is valid', async () => {
      const user = userEvent.setup()
      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '1' }))

      const button = screen.getByRole('button', { name: /Show payment code/i })
      expect(button).toBeEnabled()
    })

    it('creates a payment request and navigates to the request page', async () => {
      const user = userEvent.setup()
      mockCreatePaymentRequest.mockResolvedValue({
        id: 'request-123',
        merchant_id: 'merchant-123',
        address: 'GTEST123',
        network: 'stellar',
        amount_stroops: 25000000n,
        asset: 'XLM',
        memo: 'test-memo',
        status: 'pending',
        expires_at: new Date(Date.now() + 600000).toISOString(),
        created_at: new Date().toISOString(),
        sep7_uri: 'web+stellar:pay?destination=GTEST123',
      })

      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '2' }))
      await user.click(screen.getByRole('button', { name: '.' }))
      await user.click(screen.getByRole('button', { name: '5' }))
      await user.click(screen.getByRole('button', { name: /Show payment code/i }))

      await waitFor(() => {
        expect(mockCreatePaymentRequest).toHaveBeenCalledWith(
          'test-token',
          25000000n, // 2.5 XLM in stroops
          'XLM',
          undefined,
          false
        )
      })

      expect(push).toHaveBeenCalledWith('/request/request-123')
    })

    it('passes allow_partial flag when checkbox is checked', async () => {
      const user = userEvent.setup()
      mockCreatePaymentRequest.mockResolvedValue({
        id: 'request-456',
        amount_stroops: 10000000n,
      })

      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '1' }))
      await user.click(screen.getByLabelText('Allow partial payment'))
      await user.click(screen.getByRole('button', { name: /Show payment code/i }))

      await waitFor(() => {
        expect(mockCreatePaymentRequest).toHaveBeenCalledWith(
          'test-token',
          10000000n,
          'XLM',
          undefined,
          true
        )
      })
    })

    it('shows an error when wallet is not created', async () => {
      const user = userEvent.setup()
      mockCreatePaymentRequest.mockRejectedValue(
        new ApiError('You must create a wallet first', 400)
      )

      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '1' }))
      await user.click(screen.getByRole('button', { name: /Show payment code/i }))

      expect(
        await screen.findByText(/Set up your payment address first/i)
      ).toBeInTheDocument()
    })

    it('shows a generic error message for other failures', async () => {
      const user = userEvent.setup()
      mockCreatePaymentRequest.mockRejectedValue(new Error('Network failure'))

      render(<ChargePage />)

      await user.click(screen.getByRole('button', { name: '1' }))
      await user.click(screen.getByRole('button', { name: /Show payment code/i }))

      expect(await screen.findByText('Network failure')).toBeInTheDocument()
    })
  })
})
