import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SendPageClient } from '../send-page-client'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
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

  const goToAmountStep = () => {
    render(<SendPageClient />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  }

  it('keeps the amount display above the keypad on short screens', () => {
    goToAmountStep()

    const amountDisplay = screen.getByText('0', { selector: 'span' }).parentElement?.parentElement
    const keypad = screen.getByRole('button', { name: '1' }).parentElement

    expect(amountDisplay).toHaveClass('flex-1')
    expect(amountDisplay).toHaveClass('shrink-0')
    expect(keypad).toHaveClass('mt-auto')
  })

  it('accepts keyboard digits while the amount step is active', () => {
    goToAmountStep()

    fireEvent.keyDown(window, { key: '7' })
    fireEvent.keyDown(window, { key: '2' })

    expect(screen.getByText('72', { selector: 'span' })).toBeInTheDocument()
  })

  it('supports keyboard backspace and decimal entry in the amount step', () => {
    goToAmountStep()

    fireEvent.keyDown(window, { key: '1' })
    fireEvent.keyDown(window, { key: '2' })
    fireEvent.keyDown(window, { key: '.' })
    fireEvent.keyDown(window, { key: '3' })
    fireEvent.keyDown(window, { key: 'Backspace' })

    expect(screen.getByText('12.', { selector: 'span' })).toBeInTheDocument()
  })

  it('ignores keyboard input when the amount step is not active', () => {
    render(<SendPageClient />)

    fireEvent.keyDown(window, { key: '9' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    fireEvent.keyDown(window, { key: '.' })

    expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument()
  })
})
