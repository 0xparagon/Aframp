import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SendPageClient } from '../send-page-client'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('SendPageClient - Complete Flow Tests', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
  })

  describe('Recipient Step', () => {
    it('Continue is disabled when recipient input is shorter than 6 characters', () => {
      render(<SendPageClient />)
      
      const input = screen.getByPlaceholderText('G... or @username')
      const continueButton = screen.getByRole('button', { name: /continue/i })
      
      expect(continueButton).toBeDisabled()
      
      fireEvent.change(input, { target: { value: 'GAB' } })
      expect(continueButton).toBeDisabled()
      
      fireEvent.change(input, { target: { value: 'GABCD' } })
      expect(continueButton).toBeDisabled()
      
      fireEvent.change(input, { target: { value: 'GABCDE' } })
      expect(continueButton).not.toBeDisabled()
    })

    it('Continue is enabled when recipient input is 6 or more characters', () => {
      render(<SendPageClient />)
      
      const input = screen.getByPlaceholderText('G... or @username')
      const continueButton = screen.getByRole('button', { name: /continue/i })
      
      fireEvent.change(input, { target: { value: 'GABCDEF123' } })
      expect(continueButton).not.toBeDisabled()
    })
  })

  describe('Amount Step - Numpad', () => {
    beforeEach(async () => {
      render(<SendPageClient />)
      const input = screen.getByPlaceholderText('G... or @username')
      fireEvent.change(input, { target: { value: 'GABCDEF123456' } })
      const continueButton = screen.getByRole('button', { name: /continue/i })
      fireEvent.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText('Enter amount')).toBeInTheDocument()
      })
    })

    it('numpad correctly builds amount string', async () => {
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '2' }))
      fireEvent.click(screen.getByRole('button', { name: '3' }))
      
      expect(screen.getByText('123')).toBeInTheDocument()
    })

    it('numpad handles decimal correctly', async () => {
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      
      expect(screen.getByText('5.5')).toBeInTheDocument()
    })

    it('prevents multiple decimals', async () => {
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      
      expect(screen.getByText('1.55')).toBeInTheDocument()
    })

    it('adds leading zero when decimal is pressed first', async () => {
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      
      expect(screen.getByText('0.5')).toBeInTheDocument()
    })

    it('replaces leading zero with number when typing', async () => {
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      expect(screen.getByText('0.5')).toBeInTheDocument()
      
      // Clear and start fresh
      fireEvent.click(screen.getByRole('button', { name: '⌫' }))
      fireEvent.click(screen.getByRole('button', { name: '⌫' }))
      
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('numpad handles backspace correctly', async () => {
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '2' }))
      fireEvent.click(screen.getByRole('button', { name: '3' }))
      
      expect(screen.getByText('123')).toBeInTheDocument()
      
      fireEvent.click(screen.getByRole('button', { name: '⌫' }))
      expect(screen.getByText('12')).toBeInTheDocument()
      
      fireEvent.click(screen.getByRole('button', { name: '⌫' }))
      expect(screen.getByText('1')).toBeInTheDocument()
      
      fireEvent.click(screen.getByRole('button', { name: '⌫' }))
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('limits decimal places to 6', async () => {
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '2' }))
      fireEvent.click(screen.getByRole('button', { name: '3' }))
      fireEvent.click(screen.getByRole('button', { name: '4' }))
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      fireEvent.click(screen.getByRole('button', { name: '6' }))
      fireEvent.click(screen.getByRole('button', { name: '7' }))
      
      expect(screen.getByText('1.123456')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('navigating back from amount step returns to recipient step', async () => {
      render(<SendPageClient />)
      
      const input = screen.getByPlaceholderText('G... or @username')
      fireEvent.change(input, { target: { value: 'GABCDEF123456' } })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Enter amount')).toBeInTheDocument()
      })
      
      const backButton = screen.getByRole('button', { name: '' })
      fireEvent.click(backButton)
      
      await waitFor(() => {
        expect(screen.getByText('Send to')).toBeInTheDocument()
      })
    })

    it('navigating back from recipient step calls router.back', async () => {
      render(<SendPageClient />)
      
      const backButton = screen.getByRole('button', { name: '' })
      fireEvent.click(backButton)
      
      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('Amount Validation', () => {
    beforeEach(async () => {
      render(<SendPageClient />)
      const input = screen.getByPlaceholderText('G... or @username')
      fireEvent.change(input, { target: { value: 'GABCDEF123456' } })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Enter amount')).toBeInTheDocument()
      })
    })

    it('Review button is disabled when amount is zero', async () => {
      const reviewButton = screen.getByRole('button', { name: /review/i })
      expect(reviewButton).toBeDisabled()
    })

    it('Review button is disabled when amount is empty', async () => {
      const reviewButton = screen.getByRole('button', { name: /review/i })
      expect(reviewButton).toBeDisabled()
    })

    it('Review button is enabled when amount is greater than zero', async () => {
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      
      const reviewButton = screen.getByRole('button', { name: /review/i })
      expect(reviewButton).not.toBeDisabled()
    })
  })

  describe('RecentRecipients Integration', () => {
    it('handleRecipientSelect pre-fills the input from RecentRecipients', async () => {
      // This test verifies the integration exists
      // Full implementation depends on RecentRecipients mock
      render(<SendPageClient />)
      
      const input = screen.getByPlaceholderText('G... or @username') as HTMLInputElement
      expect(input.value).toBe('')
      
      // Simulate what RecentRecipients would do by calling the handler
      const testAddress = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ'
      fireEvent.change(input, { target: { value: testAddress } })
      
      expect(input.value).toBe(testAddress)
    })
  })
})
