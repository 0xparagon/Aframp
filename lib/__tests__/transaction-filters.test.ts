import type { Payment } from '@/lib/api'
import {
  filterPaymentsByDateRange,
  filterPaymentsByStatus,
  searchPayments,
} from '@/lib/transaction-filters'

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    merchant_id: 'merchant-1',
    wallet_id: 'wallet-1',
    wallet_address: 'GABCDEF123456789',
    tx_hash: 'hash-abc-123',
    amount_stroops: 1_000_000_000n,
    asset: 'cNGN',
    network: 'stellar',
    status: 'confirmed',
    confirmations: 1,
    created_at: '2025-06-15T12:00:00.000Z',
    updated_at: '2025-06-15T12:00:00.000Z',
    ...overrides,
  }
}

describe('searchPayments', () => {
  it('matches transaction hash, wallet address, and asset without case sensitivity', () => {
    const transactions = [
      payment(),
      payment({
        id: 'payment-2',
        tx_hash: 'different',
        wallet_address: 'GXYZ987654321',
        asset: 'cKES',
      }),
    ]

    expect(searchPayments(transactions, 'HASH-ABC')).toEqual([transactions[0]])
    expect(searchPayments(transactions, 'gxyz')).toEqual([transactions[1]])
    expect(searchPayments(transactions, 'CNgn')).toEqual([transactions[0]])
  })

  it('returns all payments for an empty query', () => {
    const transactions = [payment()]
    expect(searchPayments(transactions, '  ')).toBe(transactions)
  })
})

describe('filterPaymentsByStatus', () => {
  it('returns payments with the selected status', () => {
    const transactions = [payment(), payment({ id: 'payment-2', status: 'failed' })]

    expect(filterPaymentsByStatus(transactions, 'failed')).toEqual([transactions[1]])
    expect(filterPaymentsByStatus(transactions, 'all')).toBe(transactions)
  })
})

describe('filterPaymentsByDateRange', () => {
  it('includes both selected dates and excludes dates outside the range', () => {
    const transactions = [
      payment({ id: 'before', created_at: '2025-06-14T23:59:59.000Z' }),
      payment({ id: 'start', created_at: '2025-06-15T00:00:00.000Z' }),
      payment({ id: 'end', created_at: '2025-06-16T23:59:59.000Z' }),
      payment({ id: 'after', created_at: '2025-06-17T00:00:00.000Z' }),
    ]

    expect(filterPaymentsByDateRange(transactions, '2025-06-15', '2025-06-16')).toEqual([
      transactions[1],
      transactions[2],
    ])
  })

  it('returns all payments when no date bounds are set', () => {
    const transactions = [payment()]
    expect(filterPaymentsByDateRange(transactions, '', '')).toBe(transactions)
  })
})
