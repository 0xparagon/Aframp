const staleAfterMs = 90 * 24 * 60 * 60 * 1000

const relativeTimeUnits: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 365 * 24 * 60 * 60 },
  { unit: 'month', seconds: 30 * 24 * 60 * 60 },
  { unit: 'week', seconds: 7 * 24 * 60 * 60 },
  { unit: 'day', seconds: 24 * 60 * 60 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
]

export function formatLastUsedAt(lastUsedAt: string | null, now = new Date()): string {
  if (!lastUsedAt) return 'Never used'

  const timestamp = Date.parse(lastUsedAt)
  if (!Number.isFinite(timestamp)) return 'Unknown'

  const deltaSeconds = Math.round((timestamp - now.getTime()) / 1000)
  const unit =
    relativeTimeUnits.find(({ seconds }) => Math.abs(deltaSeconds) >= seconds) ??
    relativeTimeUnits[relativeTimeUnits.length - 1]

  return new Intl.RelativeTimeFormat('en', { numeric: 'always' }).format(
    Math.round(deltaSeconds / unit.seconds),
    unit.unit
  )
}

export function isApiKeyUsageStale(lastUsedAt: string | null, now = new Date()): boolean {
  if (!lastUsedAt) return true

  const timestamp = Date.parse(lastUsedAt)
  return Number.isFinite(timestamp) && now.getTime() - timestamp >= staleAfterMs
}
