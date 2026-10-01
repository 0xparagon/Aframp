import { renderHook, waitFor } from '@testing-library/react'
import { useDataLoader } from '../use-data-loader'

describe('useDataLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('starts with loading state', () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'test' })
    const { result } = renderHook(() => useDataLoader(fetcher, []))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('loads data successfully', async () => {
    const mockData = { id: 1, name: 'Test' }
    const fetcher = jest.fn().mockResolvedValue(mockData)
    const { result } = renderHook(() => useDataLoader(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBe(null)
    expect(fetcher).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it('handles errors correctly', async () => {
    const errorMessage = 'Failed to fetch data'
    const fetcher = jest.fn().mockRejectedValue(new Error(errorMessage))
    const { result } = renderHook(() => useDataLoader(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(errorMessage)
  })

  it('handles non-Error rejections', async () => {
    const fetcher = jest.fn().mockRejectedValue('string error')
    const { result } = renderHook(() => useDataLoader(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe('An error occurred')
  })

  it('ignores AbortError', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    const fetcher = jest.fn().mockRejectedValue(abortError)
    const { result } = renderHook(() => useDataLoader(fetcher, []))

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled()
    })

    // Should remain in loading state since abort doesn't set error
    expect(result.current.error).toBe(null)
  })

  it('aborts the request on unmount', async () => {
    let abortSignal: AbortSignal | null = null
    const fetcher = jest.fn().mockImplementation((signal: AbortSignal) => {
      abortSignal = signal
      return new Promise((resolve) => setTimeout(() => resolve({ data: 'test' }), 100))
    })

    const { unmount } = renderHook(() => useDataLoader(fetcher, []))
    unmount()

    await waitFor(() => {
      expect(abortSignal?.aborted).toBe(true)
    })
  })

  it('reloads data when deps change', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'initial' })
    const { result, rerender } = renderHook(
      ({ dep }) => useDataLoader(fetcher, [dep]),
      { initialProps: { dep: 'value1' } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    fetcher.mockResolvedValue({ data: 'updated' })
    rerender({ dep: 'value2' })

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2)
    })
  })

  it('reload function triggers a new fetch', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ data: 'first' })
      .mockResolvedValueOnce({ data: 'second' })

    const { result } = renderHook(() => useDataLoader(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toEqual({ data: 'first' })

    result.current.reload()

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'second' })
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
