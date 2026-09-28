import { render, screen, waitFor, act } from '@testing-library/react'
import { ApiError } from '@/lib/api'

// Mock the entire api module
const mockGetWallet = jest.fn()
const mockGetBalances = jest.fn()

jest.mock('@/lib/api', () => ({
  api: {
    getWallet: (...args: unknown[]) => mockGetWallet(...args),
    getBalances: (...args: unknown[]) => mockGetBalances(...args),
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
      this.name = 'ApiError'
    }
  },
}))

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token', userId: 'u1', merchantId: 'm1' }),
  useSession: () => ({ me: null }),
}))

jest.mock('@/components/wallet/balance-figure', () => ({
  BalanceFigure: () => <div data-testid="balance-figure" />,
}))

// Dynamically import the page so mocks apply
let WalletPage: React.ComponentType
beforeAll(async () => {
  const mod = await import('../page')
  WalletPage = mod.default
})

describe('WalletPage abort on unmount', () => {
  it('does not update state after unmount (AbortError is swallowed)', async () => {
    // Delay getWallet so it resolves after unmount
    let resolveWallet!: (val: unknown) => void
    mockGetWallet.mockImplementation((_token: string, signal?: AbortSignal) => {
      return new Promise((resolve, reject) => {
        resolveWallet = resolve
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'))
        })
      })
    })
    mockGetBalances.mockResolvedValue([])

    const { unmount } = render(<WalletPage />)
    // Unmount immediately — triggers AbortController.abort()
    unmount()

    // Now resolve after unmount — should not cause React state update warnings
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => {
      resolveWallet({ id: 'w1', address: 'GTEST', merchant_id: 'm1', network: 'testnet', created_at: '' })
    })
    // No "Can't perform state update on unmounted component" error
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Can't perform")
    )
    consoleSpy.mockRestore()
  })

  it('AbortController cleanup is called on unmount', () => {
    const abortSpy = jest.fn()
    const originalAbortController = global.AbortController
    global.AbortController = class {
      signal = { addEventListener: jest.fn() }
      abort = abortSpy
    } as unknown as typeof AbortController

    mockGetWallet.mockResolvedValue(null)
    mockGetBalances.mockResolvedValue([])

    const { unmount } = render(<WalletPage />)
    unmount()

    expect(abortSpy).toHaveBeenCalledTimes(1)
    global.AbortController = originalAbortController
  })
})
