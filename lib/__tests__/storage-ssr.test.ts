/**
 * @jest-environment node
 */

import { clear, getItem, removeItem, setItem } from '@/lib/storage'

describe('lib/storage (SSR / non-browser environment)', () => {
  it('confirms window is undefined in node environment', () => {
    expect(typeof window).toBe('undefined')
  })

  it('getItem returns null without accessing window or throwing ReferenceError', () => {
    expect(getItem('any-key')).toBeNull()
  })

  it('setItem does nothing and does not throw', () => {
    expect(() => setItem('any-key', 'any-value')).not.toThrow()
  })

  it('removeItem does nothing and does not throw', () => {
    expect(() => removeItem('any-key')).not.toThrow()
  })

  it('clear does nothing and does not throw', () => {
    expect(() => clear()).not.toThrow()
  })

  it('does not cause any test failure due to attempted window access', () => {
    expect(getItem('aframp.session')).toBeNull()
    setItem('aframp.session', JSON.stringify({ token: '123' }))
    expect(getItem('aframp.session')).toBeNull()
    removeItem('aframp.session')
  })
})
