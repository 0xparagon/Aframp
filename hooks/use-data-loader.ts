import { useCallback, useEffect, useState } from 'react'

export interface UseDataLoaderResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

/**
 * Generic hook for loading data with automatic abort cleanup.
 * 
 * @param fetcher - Async function that accepts an AbortSignal and returns the data
 * @param deps - Dependency array that triggers a reload when changed
 * @returns Object containing data, error, loading state, and reload function
 * 
 * @example
 * const { data, error, loading, reload } = useDataLoader(
 *   async (signal) => api.getBalances(token, signal),
 *   [token]
 * )
 */
export function useDataLoader<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList
): UseDataLoaderResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetcher(signal)
        if (!signal.aborted) {
          setData(result)
          setLoading(false)
        }
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return
        }
        if (!signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'An error occurred')
          setData(null)
          setLoading(false)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  )

  const reload = useCallback(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  return { data, error, loading, reload }
}
