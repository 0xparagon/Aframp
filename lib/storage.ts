/**
 * SSR-safe storage wrapper around browser localStorage.
 *
 * In server-side rendering (SSR) environments or when localStorage is inaccessible
 * (such as in private browsing mode, restricted iframes, or when storage is disabled),
 * operations fail safely without throwing ReferenceError or unhandled exceptions.
 */

function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

/**
 * Retrieves an item from localStorage safely.
 * Returns null in SSR environments or if the item does not exist or storage cannot be accessed.
 */
export function getItem(key: string): string | null {
  try {
    if (!isStorageAvailable()) {
      return null
    }
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Stores an item in localStorage safely.
 * Does nothing in SSR environments or if storage fails (e.g. quota exceeded or disabled).
 */
export function setItem(key: string, value: string): void {
  try {
    if (!isStorageAvailable()) {
      return
    }
    window.localStorage.setItem(key, value)
  } catch {
    // Storage may be unavailable (private mode, quota, blocked) — fail silently
  }
}

/**
 * Removes an item from localStorage safely.
 * Does nothing in SSR environments or if storage cannot be accessed.
 */
export function removeItem(key: string): void {
  try {
    if (!isStorageAvailable()) {
      return
    }
    window.localStorage.removeItem(key)
  } catch {
    // Fail silently on storage errors
  }
}

/**
 * Clears all items in localStorage safely.
 */
export function clear(): void {
  try {
    if (!isStorageAvailable()) {
      return
    }
    window.localStorage.clear()
  } catch {
    // Fail silently on storage errors
  }
}
