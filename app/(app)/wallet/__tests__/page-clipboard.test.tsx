import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WalletPage from '../page'
import { useAuthenticatedSession, useSession } from '@/components/session-provider'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(),
  useSession: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getWallet: jest.fn(),
    getBalances: jest.fn(),
    createWallet: jest.fn(),
  },
}))

const mockWallet = {
  id: 'wallet-123',
  merchant_id: 'merchant-123',
  address: 'GTEST123VALIDADDRESS456789012345678901234567890123456789ABC',
  network: 'stellar',
  created_at: '2024-01-01T00:00:00Z',
}

describe('WalletPage - Clipboard functionality', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    ;(useAuthenticatedSession as jest.Mock).mockReturnValue({
      token: 'test-token',
      userId: 'user-123',
      merchantId: 'merchant-123',
    })
    ;(useSession as jest.Mock).mockReturnValue({
      me: {
        user_id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        merchant_name: 'Test Merchant',
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        merchant_id: 'merchant-123',
      },
    })
    ;(api.getWallet as jest.Mock).mockResolvedValue(mockWallet)
    ;(api.getBalances as jest.Mock).mockResolvedValue([])
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('successfully copies address to clipboard', async () => {
    const user = userEvent.setup()
    const mockWriteText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    render(<WalletPage />)

    await waitFor(() => {
      expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
    })

    const copyButton = screen.getByRole('button', { name: /Copy address/i })
    await user.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith(mockWallet.address)
    expect(await screen.findByText(/Copied/i)).toBeInTheDocument()
  })

  it('shows error message when clipboard permission is denied', async () => {
    const user = userEvent.setup()
    const mockError = new DOMException('Permission denied', 'NotAllowedError')
    const mockWriteText = jest.fn().mockRejectedValue(mockError)
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    render(<WalletPage />)

    await waitFor(() => {
      expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
    })

    const copyButton = screen.getByRole('button', { name: /Copy address/i })
    await user.click(copyButton)

    expect(
      await screen.findByText(
        /Could not copy — please select and copy the address manually/i
      )
    ).toBeInTheDocument()

    expect(consoleErrorSpy).toHaveBeenCalledWith('Clipboard copy failed:', mockError)
  })

  it('shows error message when clipboard API is not available (non-secure context)', async () => {
    const user = userEvent.setup()
    const mockError = new TypeError('navigator.clipboard is undefined')
    const mockWriteText = jest.fn().mockRejectedValue(mockError)
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    render(<WalletPage />)

    await waitFor(() => {
      expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
    })

    const copyButton = screen.getByRole('button', { name: /Copy address/i })
    await user.click(copyButton)

    expect(
      await screen.findByText(
        /Could not copy — please select and copy the address manually/i
      )
    ).toBeInTheDocument()

    expect(consoleErrorSpy).toHaveBeenCalledWith('Clipboard copy failed:', mockError)
  })

  it('does not attempt to copy when wallet is not loaded', async () => {
    const user = userEvent.setup()
    const mockWriteText = jest.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })
    
    ;(api.getWallet as jest.Mock).mockRejectedValue(new Error('No wallet'))

    render(<WalletPage />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Copy address/i })).not.toBeInTheDocument()
    })

    expect(mockWriteText).not.toHaveBeenCalled()
  })

  it('clears the error message when a subsequent copy succeeds', async () => {
    const user = userEvent.setup()
    const mockWriteText = jest
      .fn()
      .mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined)

    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    render(<WalletPage />)

    await waitFor(() => {
      expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
    })

    const copyButton = screen.getByRole('button', { name: /Copy address/i })
    
    // First attempt fails
    await user.click(copyButton)
    expect(
      await screen.findByText(/Could not copy — please select and copy the address manually/i)
    ).toBeInTheDocument()

    // Second attempt succeeds
    await user.click(copyButton)
    await waitFor(() => {
      expect(
        screen.queryByText(/Could not copy — please select and copy the address manually/i)
      ).not.toBeInTheDocument()
    })
    expect(screen.getByText(/Copied/i)).toBeInTheDocument()
  })

  it('shows copied state for 2 seconds then reverts', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup()
    const mockWriteText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    render(<WalletPage />)

    await waitFor(() => {
      expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
    })

    const copyButton = screen.getByRole('button', { name: /Copy address/i })
    await user.click(copyButton)

    expect(await screen.findByText(/Copied/i)).toBeInTheDocument()

    // Fast-forward 2 seconds
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy address/i })).toBeInTheDocument()
      expect(screen.queryByText(/Copied/i)).not.toBeInTheDocument()
    })

    jest.useRealTimers()
  })
})
