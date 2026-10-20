import {
  getBankOptions,
  getWithdrawableAssets,
  getWithdrawalAssetConfig,
  WITHDRAWAL_ASSETS,
  validateWithdrawal,
} from '@/lib/withdraw'
import type { Balance } from '@/lib/api'

function balance(asset: string, available: bigint): Balance {
  return { merchant_id: 'm', asset, available, pending: 0n, updated_at: '' }
}

describe('getWithdrawableAssets', () => {
  it('returns [] for an empty balance array', () => {
    expect(getWithdrawableAssets([])).toEqual([])
  })

  it('excludes assets with a zero available balance', () => {
    const result = getWithdrawableAssets([
      balance('cNGN', 0n),
      balance('cKES', 0n),
      balance('cGHS', 0n),
    ])
    expect(result).toEqual([])
  })

  it.each([
    ['cNGN', 100_000n],
    ['cKES', 100_000n],
    ['cGHS', 100_000n],
  ] as const)('%s uses its configured currency sub-unit precision', (asset, precision) => {
    expect(getWithdrawalAssetConfig(asset).minimumPrecisionStroops).toBe(precision)
  })

  it('excludes non-withdrawable assets even with a positive balance', () => {
    const result = getWithdrawableAssets([
      balance('XLM', 10_000_000_000n),
      balance('USDC', 10_000_000_000n),
    ])
    expect(result).toEqual([])
  })

  it('excludes unknown asset symbols', () => {
    const result = getWithdrawableAssets([balance('DOGE', 10_000_000_000n)])
    expect(result).toEqual([])
  })

  it('returns all three withdrawal assets when all balances are positive', () => {
    const result = getWithdrawableAssets([
      balance('cNGN', 10_000_000_000n),
      balance('cKES', 5_000_000_000n),
      balance('cGHS', 1_000_000_000n),
    ])
    expect([...result].sort()).toEqual([...WITHDRAWAL_ASSETS].sort())
  })

  it('keeps only the withdrawable assets from a mixed balance set', () => {
    const result = getWithdrawableAssets([
      balance('cNGN', 10_000_000_000n),
      balance('XLM', 10_000_000_000n),
      balance('cKES', 0n),
      balance('USDC', 10_000_000_000n),
    ])
    expect(result).toEqual(['cNGN'])
  })
})

describe('getBankOptions', () => {
  it.each([...WITHDRAWAL_ASSETS])('returns a non-empty array for %s', (asset) => {
    const options = getBankOptions(asset)
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })
})

describe('validateWithdrawal', () => {
  const config = getWithdrawalAssetConfig('cNGN')
  const available = 1_000_000_000n
  const validAmount = 500_000_000n
  const validAccount = '0123456789'

  it.each([null, 0n, -1n])('requires a positive parsed amount (%s)', (amount) => {
    expect(validateWithdrawal(amount, config, available, '044', validAccount)).toBe(
      'Enter an amount to cash out.'
    )
  })

  it('rejects amounts below the configured precision', () => {
    expect(validateWithdrawal(validAmount + 1n, config, available, '044', validAccount)).toBe(
      'Amount must have at most 2 decimal places.'
    )
  })

  it('rejects amounts below the asset minimum', () => {
    expect(validateWithdrawal(100_000n, config, available, '044', validAccount)).toBe(
      'The smallest cash-out is 50 cNGN.'
    )
  })

  it('rejects amounts above the available balance', () => {
    expect(validateWithdrawal(1_000_100_000n, config, available, '044', validAccount)).toBe(
      'That is more than your available balance.'
    )
  })

  it('requires a bank selection', () => {
    expect(validateWithdrawal(validAmount, config, available, '', validAccount)).toBe(
      'Choose your bank.'
    )
  })

  it('requires an account number with the configured length', () => {
    expect(validateWithdrawal(validAmount, config, available, '044', '123')).toBe(
      'Account numbers are 10 digits.'
    )
  })

  it('requires a digits-only account number', () => {
    expect(validateWithdrawal(validAmount, config, available, '044', '01234abcde')).toBe(
      'Account number must contain digits only.'
    )
  })

  it('accepts a valid withdrawal', () => {
    expect(validateWithdrawal(validAmount, config, available, '044', validAccount)).toBeNull()
  })
})
