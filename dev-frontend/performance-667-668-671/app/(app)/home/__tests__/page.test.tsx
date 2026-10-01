import { render } from '@testing-library/react'
import useSWR from 'swr'
import HomePage from '../page'
import { api } from '@/lib/api'

jest.mock('swr')

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token' }),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getBalances: jest.fn(),
    listTransactions: jest.fn(),
    listPaymentRequests: jest.fn(),
  },
}))

jest.mock('@/components/onboarding/onboarding-checklist', () => ({
  OnboardingChecklist: () => null,
}))
jest.mock('@/components/wallet/quick-actions', () => ({ QuickActions: () => null }))
jest.mock('@/components/wallet/quick-convert', () => ({ QuickConvert: () => null }))
jest.mock('@/components/wallet/revenue-chart', () => ({ RevenueChart: () => null }))
jest.mock('@/components/wallet/top-assets', () => ({ TopAssets: () => null }))
jest.mock('@/components/wallet/activity-highlights', () => ({ ActivityHighlights: () => null }))
jest.mock('@/components/wallet/balance-figure', () => ({ BalanceFigure: () => null }))

const mockedUseSWR = useSWR as jest.Mock

describe('HomePage SWR fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses a token-scoped key and 30-second revalidation', () => {
    mockedUseSWR.mockReturnValue({
      data: { balances: [], payments: [], openRequests: [] },
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    })

    render(<HomePage />)

    expect(mockedUseSWR).toHaveBeenCalledWith(
      ['dashboard', 'test-token'],
      expect.any(Function),
      expect.objectContaining({ refreshInterval: 30_000 })
    )
  })

  it('passes the same abort signal to all three API calls', async () => {
    let fetcher: ((key: [string, string]) => Promise<unknown>) | undefined

    mockedUseSWR.mockImplementation((_key, receivedFetcher) => {
      fetcher = receivedFetcher
      return {
        data: { balances: [], payments: [], openRequests: [] },
        error: undefined,
        isLoading: false,
        mutate: jest.fn(),
      }
    })

    ;(api.getBalances as jest.Mock).mockResolvedValue([])
    ;(api.listTransactions as jest.Mock).mockResolvedValue([])
    ;(api.listPaymentRequests as jest.Mock).mockResolvedValue([])

    render(<HomePage />)
    await fetcher?.(['dashboard', 'test-token'])

    const balanceSignal = (api.getBalances as jest.Mock).mock.calls[0][1]
    const transactionSignal = (api.listTransactions as jest.Mock).mock.calls[0][2]
    const requestSignal = (api.listPaymentRequests as jest.Mock).mock.calls[0][2]

    expect(balanceSignal).toBeInstanceOf(AbortSignal)
    expect(transactionSignal).toBe(balanceSignal)
    expect(requestSignal).toBe(balanceSignal)
  })
})
