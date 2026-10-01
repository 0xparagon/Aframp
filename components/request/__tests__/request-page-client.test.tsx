import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RequestPageClient } from '../request-page-client'
import { useMediaQuery } from '@/hooks/use-media-query'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ back: jest.fn() })),
}))

jest.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: jest.fn(),
}))

describe('RequestPageClient', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses the media query hook for mobile detection instead of a resize listener', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(true)
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

    render(<RequestPageClient requestId="request-1" />)

    expect(useMediaQuery).toHaveBeenCalledWith('(max-width: 767px)')
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('resize', expect.any(Function))
    expect(screen.getByRole('button', { name: /pay with camera/i })).toBeInTheDocument()
  })

  it('copies the wallet address and displays a scanned payment address', async () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(true)
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<RequestPageClient requestId="request-1" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      await Promise.resolve()
    })
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^G/))
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /pay with camera/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Mock scan result' }))

    expect(screen.getByText('Payment detected')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Scan QR code' })).not.toBeInTheDocument()
  })
})
