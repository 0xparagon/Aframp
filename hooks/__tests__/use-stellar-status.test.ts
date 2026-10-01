import { renderHook, waitFor } from '@testing-library/react'
import { useStellarStatus } from '@/hooks/use-stellar-status'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('useStellarStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('initially returns loading status', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { result } = renderHook(() => useStellarStatus())

    expect(result.current.status).toBe('loading')
    expect(result.current.description).toBe('Loading network status...')
  })

  it('returns operational status when indicator is none', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: {
          indicator: 'none',
          description: 'All Systems Operational',
        },
      }),
    })

    const { result } = renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(result.current.status).toBe('operational')
      expect(result.current.description).toBe('All Systems Operational')
    })
  })

  it('returns degraded status when indicator is minor', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: {
          indicator: 'minor',
          description: 'Some systems experiencing issues',
        },
      }),
    })

    const { result } = renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(result.current.status).toBe('degraded')
      expect(result.current.description).toBe('Some systems experiencing issues')
    })
  })

  it('returns outage status when indicator is major', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: {
          indicator: 'major',
          description: 'Major outage detected',
        },
      }),
    })

    const { result } = renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(result.current.status).toBe('outage')
      expect(result.current.description).toBe('Major outage detected')
    })
  })

  it('returns outage status when indicator is critical', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: {
          indicator: 'critical',
          description: 'Critical system failure',
        },
      }),
    })

    const { result } = renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(result.current.status).toBe('outage')
      expect(result.current.description).toBe('Critical system failure')
    })
  })

  it('returns error status when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(result.current.status).toBe('error')
      expect(result.current.description).toBe('Unable to fetch network status')
    })
  })

  it('returns error status when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    })

    const { result } = renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(result.current.status).toBe('error')
      expect(result.current.description).toBe('Unable to fetch network status')
    })
  })

  it('polls status every 60 seconds', async () => {
    let callCount = 0
    mockFetch.mockImplementation(() => {
      callCount++
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: {
            indicator: 'none',
            description: `Status update ${callCount}`,
          },
        }),
      })
    })

    const { result } = renderHook(() => useStellarStatus())

    // Initial call
    await waitFor(() => {
      expect(result.current.description).toBe('Status update 1')
    })

    // Fast-forward 60 seconds
    jest.advanceTimersByTime(60000)

    await waitFor(() => {
      expect(result.current.description).toBe('Status update 2')
    })

    expect(callCount).toBe(2)
  })

  it('handles missing status data gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(result.current.status).toBe('operational') // defaults to operational
      expect(result.current.description).toBe('Unknown status')
    })
  })

  it('uses testnet URL when NEXT_PUBLIC_STELLAR_NETWORK is TESTNET', async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'TESTNET'

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: {
          indicator: 'none',
          description: 'Testnet operational',
        },
      }),
    })

    renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://status.testnet.stellar.org/api/v2/status.json'
      )
    })

    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
  })

  it('uses mainnet URL when NEXT_PUBLIC_STELLAR_NETWORK is MAINNET or not set', async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'MAINNET'

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: {
          indicator: 'none',
          description: 'Mainnet operational',
        },
      }),
    })

    renderHook(() => useStellarStatus())

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('https://status.stellar.org/api/v2/status.json')
    })

    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
  })
})
