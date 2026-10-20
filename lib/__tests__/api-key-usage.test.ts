import { formatLastUsedAt, isApiKeyUsageStale } from '../api-key-usage'

describe('API key usage display', () => {
  const now = new Date('2025-04-10T12:00:00.000Z')

  it('shows never-used keys explicitly and marks them stale', () => {
    expect(formatLastUsedAt(null, now)).toBe('Never used')
    expect(isApiKeyUsageStale(null, now)).toBe(true)
  })

  it('formats the last-used timestamp as relative time', () => {
    expect(formatLastUsedAt('2025-04-07T12:00:00.000Z', now)).toBe('3 days ago')
  })

  it('marks keys stale at 90 days but not before', () => {
    expect(isApiKeyUsageStale('2025-01-10T12:00:00.000Z', now)).toBe(true)
    expect(isApiKeyUsageStale('2025-01-10T12:00:00.001Z', now)).toBe(false)
  })
})
