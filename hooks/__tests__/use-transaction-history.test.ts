import { act, renderHook } from '@testing-library/react'
import { useTransactionHistory } from '../use-transaction-history'
import { mockTransactions } from '@/lib/fixtures/transactions'

describe('useTransactionHistory', () => {
  it('filters and sorts transactions before pagination', () => {
    const { result } = renderHook(() =>
      useTransactionHistory({ transactions: mockTransactions, pageSize: 3 })
    )

    act(() => {
      result.current.onFilterChange('failed')
    })

    expect(result.current.filteredTransactions).toHaveLength(2)
    expect(result.current.filteredTransactions.map((transaction) => transaction.id)).toEqual([
      'BIL-240162',
      'ONR-240132',
    ])

    act(() => {
      result.current.onSortChange('amount')
    })

    expect(result.current.sortedTransactions[0].id).toBe('ONR-240132')
    expect(result.current.sortedTransactions[0].amount).toBe(10000)

    expect(result.current.totalPages).toBe(1)
  })

  it('moves to the next page when requested', () => {
    const { result } = renderHook(() =>
      useTransactionHistory({ transactions: mockTransactions, pageSize: 3 })
    )

    act(() => {
      result.current.onPageChange(2)
    })

    expect(result.current.currentPage).toBe(2)
    expect(result.current.paginatedTransactions.map((transaction) => transaction.id)).toEqual([
      'ONR-240173',
      'OFF-240166',
      'BIL-240162',
    ])
  })

  it('uses the server total count for pagination when serverMode is enabled', () => {
    const pageChange = jest.fn()
    const serverTransactions = mockTransactions.slice(0, 2)
    const { result } = renderHook(() =>
      useTransactionHistory({
        transactions: serverTransactions,
        pageSize: 2,
        serverMode: true,
        serverTotalCount: 7,
        onPageChange: pageChange,
      })
    )

    expect(result.current.totalPages).toBe(4)
    expect(result.current.currentPage).toBe(1)
    expect(result.current.paginatedTransactions).toEqual(serverTransactions)

    act(() => {
      result.current.onPageChange(3)
    })

    expect(result.current.currentPage).toBe(3)
    expect(pageChange).toHaveBeenCalledWith(3)
  })

  it('filters by transaction type', () => {
    const type = mockTransactions[0].type
    const { result } = renderHook(() =>
      useTransactionHistory({ transactions: mockTransactions, pageSize: 50 })
    )

    act(() => {
      result.current.onFilterChange(type)
    })

    expect(result.current.filteredTransactions.length).toBeGreaterThan(0)
    expect(result.current.filteredTransactions.every((tx) => tx.type === type)).toBe(true)
    expect(result.current.currentPage).toBe(1)
  })

  it.each(['type', 'asset'] as const)('sorts by %s alphabetically, descending first', (field) => {
    const { result } = renderHook(() =>
      useTransactionHistory({ transactions: mockTransactions, pageSize: 50 })
    )

    act(() => {
      result.current.onSortChange(field)
    })

    const values = result.current.sortedTransactions.map((tx) => tx[field])
    expect(values).toEqual([...values].sort((a, b) => b.localeCompare(a)))
    expect(result.current.sortDirection).toBe('desc')
  })

  it('toggles the direction when the same field is chosen again', () => {
    const { result } = renderHook(() =>
      useTransactionHistory({ transactions: mockTransactions, pageSize: 50 })
    )

    act(() => {
      result.current.onSortChange('status')
    })
    const descending = result.current.sortedTransactions.map((tx) => tx.id)

    act(() => {
      result.current.onSortChange('status')
    })

    expect(result.current.sortDirection).toBe('asc')
    const ascendingStatuses = result.current.sortedTransactions.map((tx) => tx.status)
    const descendingStatuses = descending.map(
      (id) => mockTransactions.find((tx) => tx.id === id)!.status
    )
    expect(ascendingStatuses).toEqual([...descendingStatuses].reverse())
  })
})
