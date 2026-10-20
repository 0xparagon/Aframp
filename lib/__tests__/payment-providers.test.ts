import {
  calculateFees,
  formatCurrency,
  getProviderForCurrency,
  OZOW_BANKS,
  PROVIDER_CONFIGS,
} from '../payment-providers'
import type { FiatCurrency } from '@/types/onramp'

describe('getProviderForCurrency', () => {
  it.each([
    ['NGN', 'paystack'],
    ['ZAR', 'ozow'],
    ['KES', 'flutterwave'],
    ['GHS', 'flutterwave'],
    ['UGX', 'flutterwave'],
  ] as const)('routes %s to %s', (currency, provider) => {
    expect(getProviderForCurrency(currency)).toBe(provider)
  })

  it('returns null for an unsupported currency', () => {
    expect(getProviderForCurrency('USD' as FiatCurrency)).toBeNull()
  })
})

describe('calculateFees', () => {
  it('applies the percentage, fixed fee and VAT for Paystack', () => {
    // 1000 * 2.9% + 1 = 30; VAT 15% of 30 = 4.5
    expect(calculateFees(1000, 'paystack')).toEqual({
      processingFee: 30,
      vat: 4.5,
      totalFees: 34.5,
      totalCost: 1034.5,
    })
  })

  it('charges no VAT for Ozow and rounds to cents', () => {
    // 333.33 * 1.5% = 4.99995 → 5
    expect(calculateFees(333.33, 'ozow')).toEqual({
      processingFee: 5,
      vat: 0,
      totalFees: 5,
      totalCost: 338.33,
    })
  })
})

describe('formatCurrency', () => {
  it('prefixes the currency symbol and always shows two decimals', () => {
    expect(formatCurrency(1234.5, 'NGN')).toBe('₦1,234.50')
    expect(formatCurrency(10, 'ZAR')).toBe('R10.00')
    expect(formatCurrency(0.1, 'KES')).toBe('KSh0.10')
  })

  it('falls back to the currency code when no symbol is known', () => {
    expect(formatCurrency(5, 'USD' as FiatCurrency)).toBe('USD5.00')
  })
})

describe('provider data', () => {
  it('keeps every provider minimum below its maximum', () => {
    for (const config of Object.values(PROVIDER_CONFIGS)) {
      expect(config.minAmount).toBeLessThan(config.maxAmount)
    }
  })

  it('lists unique Ozow bank codes', () => {
    const codes = OZOW_BANKS.map((bank) => bank.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
