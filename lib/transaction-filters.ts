import type { Payment, PaymentStatus } from '@/lib/api'

export function searchPayments(payments: Payment[], query: string): Payment[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return payments

  return payments.filter((payment) =>
    [payment.tx_hash, payment.wallet_address, payment.asset].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )
  )
}

export function filterPaymentsByStatus(
  payments: Payment[],
  status: PaymentStatus | 'all'
): Payment[] {
  if (status === 'all') return payments
  return payments.filter((payment) => payment.status === status)
}

export function filterPaymentsByDateRange(
  payments: Payment[],
  fromDate: string,
  toDate: string
): Payment[] {
  if (!fromDate && !toDate) return payments

  const start = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
  const end = toDate ? new Date(`${toDate}T00:00:00`) : null
  if (end) end.setDate(end.getDate() + 1)
  const endExclusive = end?.getTime() ?? null

  return payments.filter((payment) => {
    const createdAt = new Date(payment.created_at).getTime()
    return (
      Number.isFinite(createdAt) &&
      (start === null || createdAt >= start) &&
      (endExclusive === null || createdAt < endExclusive)
    )
  })
}
