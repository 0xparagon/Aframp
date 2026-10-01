import { calculateFiatEquivalent } from '@/lib/charge'

describe('calculateFiatEquivalent', () => {
  it('returns ≈ ₦0 for empty, zero, or non-numeric inputs', () => {
    expect(calculateFiatEquivalent('', 250)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('0', 250)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('invalid', 250)).toBe('≈ ₦0')
    expect(calculateFiatEquivalent('-5', 250)).toBe('≈ ₦0')
  })

  it('calculates fiat equivalent and formats with commas', () => {
    expect(calculateFiatEquivalent('50', 249)).toBe('≈ ₦12,450')
    expect(calculateFiatEquivalent('1000', 300)).toBe('≈ ₦300,000')
  })

  it('handles decimal amounts up to 2 fraction digits', () => {
    expect(calculateFiatEquivalent('1.5', 200)).toBe('≈ ₦300')
    expect(calculateFiatEquivalent('0.25', 100)).toBe('≈ ₦25')
    expect(calculateFiatEquivalent('10.55', 200)).toBe('≈ ₦2,110')
  })
})
