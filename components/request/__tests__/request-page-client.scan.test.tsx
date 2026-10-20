import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { RequestPageClient } from '../request-page-client'
import { api, type PaymentRequest } from '@/lib/api'
import { useMediaQuery } from '@/hooks/use-media-query'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: { getPaymentRequest: jest.fn() },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
    }
  },
}))

jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}))

// The scanner hands back whatever address the test sets here.
let mockScanResult = ''
jest.mock('@/components/send/qr-scanner', () => ({
  QRScanner: ({ onScan, onClose }: { onScan: (address: string) => void; onClose: () => void }) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan(mockScanResult)}>Scan address</button>
      <button onClick={onClose}>Close scanner</button>
    </div>
  ),
}))

const VALID_ADDRESS = 'G' + 'A'.repeat(55)

const pendingRequest: PaymentRequest = {
  id: 'req-123',
  merchant_id: 'merchant-1',
  address: 'GPAYMENTADDRESS1234567890',
  network: 'stellar',
  amount_stroops: 1_000_000_000n,
  asset: 'USDC',
  memo: 'Invoice 42',
  status: 'pending',
  expires_at: new Date(Date.now() + 600_000).toISOString(),
  created_at: new Date().toISOString(),
  sep7_uri: 'web+stellar:pay?destination=GPAYMENTADDRESS1234567890&amount=100',
}

const back = jest.fn()
const writeText = jest.fn()

function setupUser() {
  const user = userEvent.setup()
  // userEvent.setup() installs its own clipboard stub; put ours back.
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return user
}

async function renderLoaded({ mobile = true } = {}) {
  ;(useMediaQuery as jest.Mock).mockReturnValue(mobile)
  render(<RequestPageClient requestId="req-123" />)
  await screen.findByText('Payment address')
}

beforeEach(() => {
  jest.clearAllMocks()
  mockScanResult = VALID_ADDRESS
  writeText.mockResolvedValue(undefined)
  ;(useRouter as jest.Mock).mockReturnValue({ back })
  ;(api.getPaymentRequest as jest.Mock).mockResolvedValue(pendingRequest)
})

describe('RequestPageClient', () => {
  it('loads the request by id and shows its details', async () => {
    await renderLoaded()

    expect(api.getPaymentRequest).toHaveBeenCalledWith('req-123', expect.anything())
    expect(screen.getByText('Payment Request')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Invoice 42')).toBeInTheDocument()
    expect(screen.getByText(pendingRequest.address)).toBeInTheDocument()
  })

  it('encodes the SEP-7 URI in the QR code', async () => {
    await renderLoaded()
    expect(screen.getByTestId('qr-code')).toHaveTextContent(pendingRequest.sep7_uri!)
  })

  it('copies the payment address and shows feedback', async () => {
    await renderLoaded()
    const user = setupUser()

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith(pendingRequest.address)
    expect(await screen.findByText(/copied!/i)).toBeInTheDocument()
  })

  it('resets the copied state after two seconds', async () => {
    await renderLoaded()
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByText(/copied!/i)).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(2000)
    })
    await waitFor(() => expect(screen.queryByText(/copied!/i)).not.toBeInTheDocument())
    jest.useRealTimers()
  })

  it('navigates back from the header', async () => {
    await renderLoaded()
    const user = setupUser()

    await user.click(screen.getAllByRole('button')[0])

    expect(back).toHaveBeenCalled()
  })

  describe('on mobile', () => {
    it('opens and closes the QR scanner', async () => {
      await renderLoaded({ mobile: true })
      const user = setupUser()

      await user.click(screen.getByRole('button', { name: /pay with camera/i }))
      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /close scanner/i }))
      expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument()
    })

    it('rejects a scanned value that is not a Stellar address', async () => {
      mockScanResult = 'not-a-stellar-address'
      await renderLoaded({ mobile: true })
      const user = setupUser()

      await user.click(screen.getByRole('button', { name: /pay with camera/i }))
      await user.click(screen.getByRole('button', { name: /scan address/i }))

      expect(screen.getByText('Invalid Stellar address format')).toBeInTheDocument()
      expect(screen.queryByText(/payment detected/i)).not.toBeInTheDocument()
    })

    it('accepts a valid scan, closes the scanner and shows the payer', async () => {
      await renderLoaded({ mobile: true })
      const user = setupUser()

      await user.click(screen.getByRole('button', { name: /pay with camera/i }))
      await user.click(screen.getByRole('button', { name: /scan address/i }))

      expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument()
      expect(screen.getByText(/payment detected/i)).toBeInTheDocument()
      expect(screen.getByText(/GAAAAAAAAA\.\.\.AAAAAAAAAA/)).toBeInTheDocument()
      expect(screen.queryByText('Error')).not.toBeInTheDocument()
    })

    it('disables the camera button while the scan is being confirmed', async () => {
      await renderLoaded({ mobile: true })
      const user = setupUser()

      await user.click(screen.getByRole('button', { name: /pay with camera/i }))
      await user.click(screen.getByRole('button', { name: /scan address/i }))

      expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /pay with camera/i })).toBeEnabled()
      )
    })
  })

  it('hides the camera button on desktop', async () => {
    await renderLoaded({ mobile: false })
    expect(screen.queryByRole('button', { name: /pay with camera/i })).not.toBeInTheDocument()
  })
})
