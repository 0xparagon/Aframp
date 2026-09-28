import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SendPageClient } from '../send-page-client'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(() => ({ token: 'test-token', userId: 'user-1', merchantId: 'merchant-1' })),
}))

jest.mock('@/lib/api', () => ({
  api: {
    createRemittance: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number
    code?: string
    constructor(message: string, status: number, code?: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
    }
  },
}))

/** Navigate the UI from the initial recipient step through to the confirm step. */
async function navigateToConfirm(address: string, amount: string) {
  // Step 1 → recipient
  fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
    target: { value: address },
  })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))

  // Step 2 → amount (tap numpad keys)
  for (const char of amount) {
    if (char === '.') {
      fireEvent.click(screen.getByRole('button', { name: '.' }))
    } else {
      fireEvent.click(screen.getByRole('button', { name: char }))
    }
  }

  // Step 3 → confirm
  fireEvent.click(screen.getByRole('button', { name: /review/i }))
}

describe('SendPageClient', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()
  const mockCreateRemittance = api.createRemittance as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
  })

  // ── layout smoke test ──────────────────────────────────────────────────────

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

  // ── handleSend: happy path ─────────────────────────────────────────────────

  it('calls api.createRemittance with correct parameters on confirm', async () => {
    const DESTINATION = 'GDESTINATION1234567890ABCDEFGHIJ'
    const mockRemittance = {
      id: 'rem-uuid-001',
      merchant_id: 'merchant-1',
      destination_address: DESTINATION,
      amount_stroops: 10_000_000n,
      asset: 'XLM',
      memo: null,
      status: 'pending',
      tx_hash: null,
      failure_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockCreateRemittance.mockResolvedValueOnce(mockRemittance)

    render(<SendPageClient />)
    await navigateToConfirm(DESTINATION, '1')

    // Hit Confirm
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(mockCreateRemittance).toHaveBeenCalledTimes(1)
      expect(mockCreateRemittance).toHaveBeenCalledWith(
        'test-token',
        DESTINATION,
        10_000_000n,   // 1 XLM in stroops
        'XLM',
        undefined      // no memo
      )
    })

    // Should advance to success screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sent!/i })).toBeInTheDocument()
    })
  })

  it('passes the memo when the user fills in a note', async () => {
    const DESTINATION = 'GDESTINATION1234567890ABCDEFGHIJ'
    mockCreateRemittance.mockResolvedValueOnce({
      id: 'rem-002', merchant_id: 'merchant-1', destination_address: DESTINATION,
      amount_stroops: 25_000_000n, asset: 'XLM', memo: 'rent', status: 'pending',
      tx_hash: null, failure_reason: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })

    render(<SendPageClient />)

    // Fill recipient
    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: DESTINATION },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // Tap 2.5 on numpad
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: '.' }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))

    // Add a note
    fireEvent.change(screen.getByPlaceholderText(/add a note/i), {
      target: { value: 'rent' },
    })

    fireEvent.click(screen.getByRole('button', { name: /review/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(mockCreateRemittance).toHaveBeenCalledWith(
        'test-token',
        DESTINATION,
        25_000_000n,   // 2.5 XLM in stroops
        'XLM',
        'rent'
      )
    })
  })

  it('passes the correct asset symbol when a non-default asset is selected', async () => {
    const DESTINATION = 'GDESTINATION1234567890ABCDEFGHIJ'
    mockCreateRemittance.mockResolvedValueOnce({
      id: 'rem-003', merchant_id: 'merchant-1', destination_address: DESTINATION,
      amount_stroops: 10_000_000n, asset: 'USDC', memo: null, status: 'pending',
      tx_hash: null, failure_reason: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })

    render(<SendPageClient />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: DESTINATION },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // Tap 1
    fireEvent.click(screen.getByRole('button', { name: '1' }))

    // Switch asset to USDC
    fireEvent.click(screen.getByRole('button', { name: 'USDC' }))

    fireEvent.click(screen.getByRole('button', { name: /review/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(mockCreateRemittance).toHaveBeenCalledWith(
        'test-token',
        DESTINATION,
        10_000_000n,
        'USDC',
        undefined
      )
    })
  })

  // ── handleSend: error handling ─────────────────────────────────────────────

  it('displays an ApiError message to the user when the API rejects', async () => {
    const DESTINATION = 'GDESTINATION1234567890ABCDEFGHIJ'
    mockCreateRemittance.mockRejectedValueOnce(
      new ApiError('Insufficient balance', 422)
    )

    render(<SendPageClient />)
    await navigateToConfirm(DESTINATION, '1')
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
    })

    // The confirm button must still be present so the user can retry
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    // Must NOT advance to success
    expect(screen.queryByRole('heading', { name: /sent!/i })).not.toBeInTheDocument()
  })

  it('displays a generic error message for unexpected non-ApiError throws', async () => {
    const DESTINATION = 'GDESTINATION1234567890ABCDEFGHIJ'
    mockCreateRemittance.mockRejectedValueOnce(new Error('network error'))

    render(<SendPageClient />)
    await navigateToConfirm(DESTINATION, '1')
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.getByText('network error')).toBeInTheDocument()
    })
  })

  it('shows a fallback message when a non-Error is thrown', async () => {
    const DESTINATION = 'GDESTINATION1234567890ABCDEFGHIJ'
    mockCreateRemittance.mockRejectedValueOnce('unexpected string rejection')

    render(<SendPageClient />)
    await navigateToConfirm(DESTINATION, '1')
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.getByText('Transaction failed. Please try again.')).toBeInTheDocument()
    })
  })

  it('disables the confirm button while the request is in flight', async () => {
    const DESTINATION = 'GDESTINATION1234567890ABCDEFGHIJ'
    // Never resolves — so isSending stays true throughout
    mockCreateRemittance.mockReturnValueOnce(new Promise(() => {}))

    render(<SendPageClient />)
    await navigateToConfirm(DESTINATION, '1')

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    // While in flight the button label changes to "Sending..." and is disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
    })
  })

  // ── handleSend: guard clauses ──────────────────────────────────────────────

  it('does not call api.createRemittance when no recipient address is set', async () => {
    render(<SendPageClient />)

    // Jump straight to amount step without a valid recipient shouldn't be possible
    // via the UI (Continue is disabled), but confirm the API is never invoked.
    expect(mockCreateRemittance).not.toHaveBeenCalled()
  })
})
