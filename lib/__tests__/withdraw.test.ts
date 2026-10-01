import { getWithdrawableAssets, getBankOptions, WITHDRAWAL_ASSETS } from '../withdraw'

function balance(asset: string, available: bigint) {
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
    expect(result.map((b) => b.asset).sort()).toEqual([...WITHDRAWAL_ASSETS].sort())
  })

  it('keeps only the withdrawable assets from a mixed balance set', () => {
    const result = getWithdrawableAssets([
      balance('cNGN', 10_000_000_000n),
      balance('XLM', 10_000_000_000n),
      balance('cKES', 0n),
      balance('USDC', 10_000_000_000n),
    ])
    expect(result.map((b) => b.asset)).toEqual(['cNGN'])
  })
})

describe('getBankOptions', () => {
  it.each([...WITHDRAWAL_ASSETS])('returns a non-empty array for %s', (asset) => {
    const options = getBankOptions(asset)
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })
})
