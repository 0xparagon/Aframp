import { clear, getItem, removeItem, setItem } from '@/lib/storage'

describe('lib/storage (browser environment)', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    window.localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('retrieves an existing value with getItem', () => {
    window.localStorage.setItem('test-key', 'test-value')
    expect(getItem('test-key')).toBe('test-value')
  })

  it('returns null for a missing key', () => {
    expect(getItem('non-existent')).toBeNull()
  })

  it('stores a value with setItem', () => {
    setItem('session-key', 'session-data')
    expect(window.localStorage.getItem('session-key')).toBe('session-data')
  })

  it('round-trips a value written with setItem via getItem', () => {
    setItem('user', 'alice')
    expect(getItem('user')).toBe('alice')
  })

  it('removes an item with removeItem', () => {
    setItem('temp', '123')
    expect(getItem('temp')).toBe('123')
    removeItem('temp')
    expect(getItem('temp')).toBeNull()
  })

  it('clears all items with clear', () => {
    setItem('k1', 'v1')
    setItem('k2', 'v2')
    clear()
    expect(getItem('k1')).toBeNull()
    expect(getItem('k2')).toBeNull()
  })

  describe('defensive error handling', () => {
    it('returns null when localStorage.getItem throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Access denied', 'SecurityError')
      })
      expect(getItem('any-key')).toBeNull()
    })

    it('does not throw when localStorage.setItem throws', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      })
      expect(() => setItem('key', 'value')).not.toThrow()
    })

    it('does not throw when localStorage.removeItem throws', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new DOMException('Access denied', 'SecurityError')
      })
      expect(() => removeItem('key')).not.toThrow()
    })

    it('does not throw when localStorage.clear throws', () => {
      jest.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
        throw new DOMException('Access denied', 'SecurityError')
      })
      expect(() => clear()).not.toThrow()
    })

    it('safely handles window.localStorage property access throwing', () => {
      const originalProperty = Object.getOwnPropertyDescriptor(window, 'localStorage')
      try {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('Storage disabled', 'SecurityError')
          },
          configurable: true,
        })

        expect(getItem('foo')).toBeNull()
        expect(() => setItem('foo', 'bar')).not.toThrow()
        expect(() => removeItem('foo')).not.toThrow()
        expect(() => clear()).not.toThrow()
      } finally {
        if (originalProperty) {
          Object.defineProperty(window, 'localStorage', originalProperty)
        }
      }
    })
  })
})
