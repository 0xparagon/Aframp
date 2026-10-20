import type { Balance } from '@/lib/api'
import { BANKS_BY_COUNTRY, type Bank, type BankCountry } from '@/lib/banks'
import { formatStroops, isAmountMultipleOf } from '@/lib/money'

/**
 * Assets with a cash-out (offramp) route. cNGN settles to Nigerian bank
 * accounts, cKES to Kenyan banks / mobile money and cGHS to Ghanaian banks /
 * mobile money. XLM and USDC have no cash-out path yet.
 */
export type WithdrawalAsset = 'cNGN' | 'cKES' | 'cGHS'

export const WITHDRAWAL_ASSETS: WithdrawalAsset[] = ['cNGN', 'cKES', 'cGHS']

export interface WithdrawalAssetConfig {
  asset: WithdrawalAsset
  country: BankCountry
  /** Lowest amount a merchant can cash out, in stroops. */
  minimumStroops: bigint
  /** Smallest supported currency sub-unit, in stroops. */
  minimumPrecisionStroops: bigint
  accountNumberLength: number
}

/**
 * Per-asset cash-out rules. Minimums are stopgap figures mirroring each
 * provider's own floor (Paystack NGN 50, M-Pesa KES 10, MoMo GHS 5).
 */
export const WITHDRAWAL_ASSET_CONFIG: Record<WithdrawalAsset, WithdrawalAssetConfig> = {
  cNGN: {
    asset: 'cNGN',
    country: 'Nigeria',
    minimumStroops: 500_000_000n,
    minimumPrecisionStroops: 100_000n,
    accountNumberLength: 10,
  },
  cKES: {
    asset: 'cKES',
    country: 'Kenya',
    minimumStroops: 100_000_000n,
    minimumPrecisionStroops: 100_000n,
    accountNumberLength: 10,
  },
  cGHS: {
    asset: 'cGHS',
    country: 'Ghana',
    minimumStroops: 50_000_000n,
    minimumPrecisionStroops: 100_000n,
    accountNumberLength: 10,
  },
}

export function getWithdrawalAssetConfig(asset: WithdrawalAsset): WithdrawalAssetConfig {
  return WITHDRAWAL_ASSET_CONFIG[asset]
}

export function validateWithdrawal(
  amount: bigint | null,
  config: WithdrawalAssetConfig,
  available: bigint,
  bankCode: string,
  accountNumber: string
): string | null {
  if (amount === null || amount <= 0n) return 'Enter an amount to cash out.'
  if (!isAmountMultipleOf(amount, config.minimumPrecisionStroops)) {
    return 'Amount must have at most 2 decimal places.'
  }
  if (amount < config.minimumStroops) {
    return `The smallest cash-out is ${formatStroops(config.minimumStroops)} ${config.asset}.`
  }
  if (amount > available) return 'That is more than your available balance.'
  if (!bankCode) return 'Choose your bank.'
  if (accountNumber.length !== config.accountNumberLength) {
    return `Account numbers are ${config.accountNumberLength} digits.`
  }
  if (!/^\d+$/.test(accountNumber)) return 'Account number must contain digits only.'
  return null
}

/** Banks / mobile-money options for the country a given asset settles in. */
export function getBankOptions(asset: WithdrawalAsset): Bank[] {
  return BANKS_BY_COUNTRY[WITHDRAWAL_ASSET_CONFIG[asset].country]
}

/** Assets the merchant actually holds a non-zero balance in, in canonical order. */
export function getWithdrawableAssets(balances: Balance[]): WithdrawalAsset[] {
  const held = new Set(
    balances.filter((balance) => balance.available > 0n).map((balance) => balance.asset)
  )
  return WITHDRAWAL_ASSETS.filter((asset) => held.has(asset))
}
