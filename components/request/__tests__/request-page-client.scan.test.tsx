import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { RequestPageClient } from '../request-page-client'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value}>
      QR Code
    </div>
  ),
}))

jest.mock('@/components/send/qr-scanner', () => ({
  QRScanner: ({ onScan, onClose }: { onScan: (address: string) => void; onClose: () => void }) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan('GTEST123SCANNEDADDRESS')}>Scan Address</button>
      <button onClick={onClose}>Close Scanner</button>
    </div>
  ),
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
})

describe('RequestPageClient', () => {
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ back: mockBack })
    ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined)

    // Mock window.innerWidth for mobile detection
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  it('renders payment request details', () => {
    render(<RequestPageClient requestId="req-123" />)

    expect(screen.getByText(/payment request/i)).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Payment for consulting services')).toBeInTheDocument()
  })

  it('displays QR code with correct value', () => {
    render(<RequestPageClient requestId="req-123" />)

    const qrCode = screen.getByTestId('qr-code')
    expect(qrCode).toBeInTheDocument()
    expect(qrCode).toHaveAttribute(
      'data-value',
      expect.stringContaining('stellar:GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH')
    )
  })

  it('copies wallet address to clipboard', async () => {
    const user = userEvent.setup()
    render(<RequestPageClient requestId="req-123" />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    await user.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH'
    )

    await waitFor(() => {
      expect(screen.getByText(/copied!/i)).toBeInTheDocument()
    })
  })

  it('resets copied state after delay', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    render(<RequestPageClient requestId="req-123" />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText(/copied!/i)).toBeInTheDocument()
    })

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.queryByText(/copied!/i)).not.toBeInTheDocument()
      expect(screen.getByText(/copy/i)).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('navigates back when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<RequestPageClient requestId="req-123" />)

    const backButton = screen.getAllByRole('button')[0] // First button is the back button
    await user.click(backButton)

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  describe('Mobile functionality', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500, // Mobile width
      })
    })

    it('shows camera button on mobile', () => {
      render(<RequestPageClient requestId="req-123" />)

      expect(screen.getByRole('button', { name: /pay with camera/i })).toBeInTheDocument()
    })

    it('opens QR scanner when camera button is clicked', async () => {
      const user = userEvent.setup()
      render(<RequestPageClient requestId="req-123" />)

      const cameraButton = screen.getByRole('button', { name: /pay with camera/i })
      await user.click(cameraButton)

      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument()
    })

    it('handles scanned address', async () => {
      const user = userEvent.setup()
      render(<RequestPageClient requestId="req-123" />)

      const cameraButton = screen.getByRole('button', { name: /pay with camera/i })
      await user.click(cameraButton)

      const scanButton = screen.getByRole('button', { name: /scan address/i })
      await user.click(scanButton)

      await waitFor(() => {
        expect(screen.getByText(/payment detected/i)).toBeInTheDocument()
        expect(screen.getByText(/GTEST123SC...EDADDRESS/i)).toBeInTheDocument()
      })

      // Scanner should be closed
      expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument()
    })

    it('closes scanner when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<RequestPageClient requestId="req-123" />)

      const cameraButton = screen.getByRole('button', { name: /pay with camera/i })
      await user.click(cameraButton)

      const closeButton = screen.getByRole('button', { name: /close scanner/i })
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument()
      })
    })
  })

  describe('Desktop functionality', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024, // Desktop width
      })
    })

    it('does not show camera button on desktop', () => {
      render(<RequestPageClient requestId="req-123" />)

      expect(screen.queryByRole('button', { name: /pay with camera/i })).not.toBeInTheDocument()
    })
  })

  describe('TODO: Backend confirmation', () => {
    it('marks the handleScanPayment TODO as present', async () => {
      // This test documents that handleScanPayment has a TODO for backend confirmation
      // Once the TODO is implemented, this test should be updated to verify the actual behavior
      const user = userEvent.setup()
      
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })

      render(<RequestPageClient requestId="req-123" />)

      const cameraButton = screen.getByRole('button', { name: /pay with camera/i })
      await user.click(cameraButton)

      const scanButton = screen.getByRole('button', { name: /scan address/i })
      await user.click(scanButton)

      // Currently only stores the scanned address locally
      // Future implementation should:
      // 1. Call api.confirmScannedPayment(requestId, address, token)
      // 2. Show success/error feedback based on response
      // 3. Update UI accordingly
      
      await waitFor(() => {
        expect(screen.getByText(/payment detected/i)).toBeInTheDocument()
      })
    })
  })
})
