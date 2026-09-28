import { render, screen, fireEvent, act } from '@testing-library/react'
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
    localStorage.clear()
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

  it('adds a contact to localStorage after a successful send', async () => {
    jest.useFakeTimers()

    render(<SendPageClient />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: {
        value: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    fireEvent.click(screen.getByRole('button', { name: /review/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm send/i }))

    act(() => {
      jest.advanceTimersByTime(2200)
    })

    const stored = localStorage.getItem('aframp_contacts')
    expect(stored).not.toBeNull()
    const contacts = JSON.parse(stored!) as Array<{ address: string; name: string }>
    expect(contacts.length).toBeGreaterThanOrEqual(1)
    expect(
      contacts.some(
        (c) => c.address === 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      )
    ).toBe(true)

    jest.useRealTimers()
  })
})
