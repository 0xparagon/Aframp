import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestPageClient } from '../request-page-client'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}))

// Mock QRScanner component
jest.mock('@/components/send/qr-scanner', () => ({
  QRScanner: ({ onScan, onClose }: { onScan: (address: string) => void; onClose: () => void }) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan('GTEST123VALIDADDRESS456789012345678901234567890123456789ABC')}>
        Scan Valid Address
      </button>
      <button onClick={() => onScan('INVALID')}>Scan Invalid Address</button>
      <button onClick={onClose}>Close Scanner</button>
    </div>
  ),
}))

// Mock react-qr-code
jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: () => <div data-testid="qr-code" />,
}))

describe('RequestPageClient - Payment Confirmation Flow', () => {
  beforeEach(() => {
    // Mock window.innerWidth for mobile detection
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500, // Mobile viewport
    })
  })

  it('opens the QR scanner when Pay with camera button is clicked', async () => {
    const user = userEvent.setup()
    render(<RequestPageClient requestId="request-123" />)

    const payButton = screen.getByRole('button', { name: /Pay with camera/i })
    await user.click(payButton)

    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument()
  })

  it('validates scanned address format and shows error for invalid addresses', async () => {
    const user = userEvent.setup()
    render(<RequestPageClient requestId="request-123" />)

    await user.click(screen.getByRole('button', { name: /Pay with camera/i }))
    
    const invalidButton = screen.getByRole('button', { name: /Scan Invalid Address/i })
    await user.click(invalidButton)

    expect(await screen.findByText('Invalid Stellar address format')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('processes valid scanned address and shows confirmation', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup()
    render(<RequestPageClient requestId="request-123" />)

    await user.click(screen.getByRole('button', { name: /Pay with camera/i }))
    
    const validButton = screen.getByRole('button', { name: /Scan Valid Address/i })
    await user.click(validButton)

    // Should show confirming state
    expect(await screen.findByText('Confirming payment...')).toBeInTheDocument()

    // Fast-forward through the mock delay
    jest.advanceTimersByTime(500)

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('Payment confirmed')).toBeInTheDocument()
    })

    // Should display truncated address
    expect(screen.getByText(/GTEST123VA\.\.\.9ABC/)).toBeInTheDocument()

    jest.useRealTimers()
  })

  it('disables Pay with camera button while confirming', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup()
    render(<RequestPageClient requestId="request-123" />)

    const payButton = screen.getByRole('button', { name: /Pay with camera/i })
    await user.click(payButton)
    
    const validButton = screen.getByRole('button', { name: /Scan Valid Address/i })
    await user.click(validButton)

    // Button should be disabled and show "Confirming..." text
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Confirming/i })
      expect(button).toBeDisabled()
    })

    jest.useRealTimers()
  })

  it('closes scanner after successful scan', async () => {
    const user = userEvent.setup()
    render(<RequestPageClient requestId="request-123" />)

    await user.click(screen.getByRole('button', { name: /Pay with camera/i }))
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument()
    
    const validButton = screen.getByRole('button', { name: /Scan Valid Address/i })
    await user.click(validButton)

    // Scanner should close immediately after scan
    expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument()
  })

  it('allows closing the scanner without scanning', async () => {
    const user = userEvent.setup()
    render(<RequestPageClient requestId="request-123" />)

    await user.click(screen.getByRole('button', { name: /Pay with camera/i }))
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument()
    
    await user.click(screen.getByRole('button', { name: /Close Scanner/i }))

    expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument()
  })

  it('does not show error alert when scanned address is valid', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup()
    render(<RequestPageClient requestId="request-123" />)

    await user.click(screen.getByRole('button', { name: /Pay with camera/i }))
    
    const validButton = screen.getByRole('button', { name: /Scan Valid Address/i })
    await user.click(validButton)

    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Payment confirmed')).toBeInTheDocument()
    })

    // No error should be displayed
    expect(screen.queryByText('Error')).not.toBeInTheDocument()

    jest.useRealTimers()
  })
})
