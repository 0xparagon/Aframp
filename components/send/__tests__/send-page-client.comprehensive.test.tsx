import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SendPageClient } from '../send-page-client'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock RecentRecipients component
jest.mock('../recent-recipients', () => ({
  RecentRecipients: ({ onSelect }: { onSelect: (address: string, name?: string) => void }) => (
    <div data-testid="recent-recipients">
      <button onClick={() => onSelect('GTEST123456', 'Test User')}>Test User</button>
    </div>
  ),
}))

describe('SendPageClient', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
  })

  describe('Recipient step', () => {
    it('Continue is disabled when recipient input is shorter than 6 characters', () => {
      render(<SendPageClient />)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeDisabled()

      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GAB' },
      })
      expect(continueButton).toBeDisabled()

      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCD' },
      })
      expect(continueButton).toBeDisabled()

      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDE' },
      })
      expect(continueButton).toBeDisabled()
    })

    it('Continue is enabled when recipient input is 6 characters or more', () => {
      render(<SendPageClient />)

      const continueButton = screen.getByRole('button', { name: /continue/i })

      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF' },
      })
      expect(continueButton).not.toBeDisabled()
    })

    it('handleRecipientSelect pre-fills the input from RecentRecipients', () => {
      render(<SendPageClient />)

      const recipientInput = screen.getByPlaceholderText('G... or @username')
      expect(recipientInput).toHaveValue('')

      const testUserButton = screen.getByText('Test User')
      fireEvent.click(testUserButton)

      expect(recipientInput).toHaveValue('GTEST123456')
    })
  })

  describe('Amount step', () => {
    beforeEach(() => {
      const { rerender } = render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
      rerender(<SendPageClient />)
    })

    it('numpad correctly builds amount string', () => {
      render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      fireEvent.click(screen.getByRole('button', { name: '1' }))
      expect(screen.getByText('1', { selector: 'span' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '2' }))
      expect(screen.getByText('12', { selector: 'span' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '3' }))
      expect(screen.getByText('123', { selector: 'span' })).toBeInTheDocument()
    })

    it('numpad handles decimal correctly', () => {
      render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      fireEvent.click(screen.getByRole('button', { name: '5' }))
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '2' }))
      expect(screen.getByText('5.2', { selector: 'span' })).toBeInTheDocument()

      // Should not allow multiple decimal points
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      expect(screen.getByText('5.2', { selector: 'span' })).toBeInTheDocument()
    })

    it('numpad handles decimal at start', () => {
      render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      fireEvent.click(screen.getByRole('button', { name: '.' }))
      expect(screen.getByText('0.', { selector: 'span' })).toBeInTheDocument()
    })

    it('numpad handles backspace', () => {
      render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '2' }))
      fireEvent.click(screen.getByRole('button', { name: '3' }))
      expect(screen.getByText('123', { selector: 'span' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '⌫' }))
      expect(screen.getByText('12', { selector: 'span' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '⌫' }))
      expect(screen.getByText('1', { selector: 'span' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '⌫' }))
      expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument()
    })

    it('numpad limits decimal places to 6', () => {
      render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: '2' }))
      fireEvent.click(screen.getByRole('button', { name: '3' }))
      fireEvent.click(screen.getByRole('button', { name: '4' }))
      fireEvent.click(screen.getByRole('button', { name: '5' }))
      fireEvent.click(screen.getByRole('button', { name: '6' }))
      expect(screen.getByText('1.123456', { selector: 'span' })).toBeInTheDocument()

      // Should not add 7th decimal place
      fireEvent.click(screen.getByRole('button', { name: '7' }))
      expect(screen.getByText('1.123456', { selector: 'span' })).toBeInTheDocument()
    })

    it('Review button is disabled when amount is zero or empty', () => {
      render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      const reviewButton = screen.getByRole('button', { name: /review/i })
      expect(reviewButton).toBeDisabled()

      fireEvent.click(screen.getByRole('button', { name: '0' }))
      expect(reviewButton).toBeDisabled()

      fireEvent.click(screen.getByRole('button', { name: '.' }))
      fireEvent.click(screen.getByRole('button', { name: '0' }))
      expect(reviewButton).toBeDisabled()
    })

    it('Review button is enabled when amount is greater than zero', () => {
      render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      fireEvent.click(screen.getByRole('button', { name: '5' }))
      const reviewButton = screen.getByRole('button', { name: /review/i })
      expect(reviewButton).not.toBeDisabled()
    })

    it('navigating back from amount step returns to recipient step', () => {
      render(<SendPageClient />)
      
      fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
        target: { value: 'GABCDEF123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))

      expect(screen.getByText('Enter amount')).toBeInTheDocument()

      const backButton = screen.getAllByRole('button')[0]
      fireEvent.click(backButton)

      expect(screen.getByText('Send to')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('G... or @username')).toBeInTheDocument()
    })
  })

  it('keeps the amount display above the keypad on short screens', () => {
    render(<SendPageClient />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    const amountDisplay = screen.getByText('0', { selector: 'span' }).parentElement?.parentElement
    const keypad = screen.getByRole('button', { name: '1' }).parentElement

    expect(amountDisplay).toHaveClass('flex-1')
    expect(amountDisplay).toHaveClass('shrink-0')
    expect(keypad).toHaveClass('mt-auto')
  })
})
