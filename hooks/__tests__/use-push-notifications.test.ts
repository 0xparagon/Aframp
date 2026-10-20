import { act, renderHook, waitFor } from '@testing-library/react'
import { usePushNotifications } from '../use-push-notifications'

type Sub = { toJSON: () => unknown; unsubscribe: jest.Mock }

let existingSubscription: Sub | null
let registerImpl: jest.Mock
let pushSubscribe: jest.Mock
let permission: NotificationPermission
let requestPermission: jest.Mock

function makeSubscription(): Sub {
  return {
    toJSON: () => ({
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'p-key', auth: 'a-key' },
    }),
    unsubscribe: jest.fn().mockResolvedValue(true),
  }
}

function installPushApis() {
  const registration = {
    pushManager: {
      getSubscription: jest.fn(() => Promise.resolve(existingSubscription)),
      subscribe: pushSubscribe,
    },
  }
  registerImpl = jest.fn(() => Promise.resolve(registration))
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register: registerImpl },
    configurable: true,
  })
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: jest.fn(() => Promise.resolve({ addEventListener: jest.fn() })),
    },
    configurable: true,
  })
  Object.defineProperty(window, 'PushManager', {
    value: function PushManager() {},
    configurable: true,
  })
  Object.defineProperty(window, 'Notification', {
    value: {
      get permission() {
        return permission
      },
      requestPermission,
    },
    configurable: true,
  })
}

function removePushApis() {
  // Make `'serviceWorker' in navigator` false.
  delete (navigator as unknown as Record<string, unknown>).serviceWorker
  delete (window as unknown as Record<string, unknown>).PushManager
}

beforeEach(() => {
  existingSubscription = null
  permission = 'default'
  pushSubscribe = jest.fn(() => Promise.resolve(makeSubscription()))
  requestPermission = jest.fn(() => Promise.resolve('granted'))
  installPushApis()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  removePushApis()
})

async function renderReady() {
  const hook = renderHook(() => usePushNotifications())
  await waitFor(() => expect(registerImpl).toHaveBeenCalledWith('/sw.js'))
  await act(async () => {
    await Promise.resolve()
  })
  return hook
}

describe('usePushNotifications', () => {
  it('reports unsupported when the browser has no push support', () => {
    removePushApis()
    const { result } = renderHook(() => usePushNotifications())
    expect(result.current.permission).toBe('unsupported')
  })

  it('reflects an existing subscription and granted permission on mount', async () => {
    permission = 'granted'
    existingSubscription = makeSubscription()
    const { result } = await renderReady()

    expect(result.current.permission).toBe('granted')
    await waitFor(() => expect(result.current.subscribed).toBe(true))
  })

  it('reports denied permission on mount', async () => {
    permission = 'denied'
    const { result } = await renderReady()
    expect(result.current.permission).toBe('denied')
  })

  it('surfaces a service worker registration failure', async () => {
    installPushApis()
    registerImpl.mockRejectedValueOnce(new Error('no sw'))
    const { result } = renderHook(() => usePushNotifications())
    await waitFor(() => expect(result.current.error).toBe('Could not register push notifications'))
  })

  it('asks for permission, subscribes and announces the subscription', async () => {
    const listener = jest.fn()
    window.addEventListener('aframp:push-subscribe', listener)
    const { result } = await renderReady()

    await act(async () => {
      await result.current.subscribe()
    })

    expect(requestPermission).toHaveBeenCalled()
    expect(pushSubscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }))
    expect(result.current.subscribed).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(listener.mock.calls[0][0].detail).toEqual({
      endpoint: 'https://push.example/1',
      p256dh: 'p-key',
      auth: 'a-key',
    })
    window.removeEventListener('aframp:push-subscribe', listener)
  })

  it('stops with a message when permission is refused', async () => {
    requestPermission.mockResolvedValue('denied')
    const { result } = await renderReady()

    await act(async () => {
      await result.current.subscribe()
    })

    expect(result.current.permission).toBe('denied')
    expect(result.current.error).toMatch(/Permission denied/)
    expect(pushSubscribe).not.toHaveBeenCalled()
  })

  it('reports a failed subscribe', async () => {
    permission = 'granted'
    pushSubscribe.mockRejectedValue(new Error('push service down'))
    const { result } = await renderReady()

    await act(async () => {
      await result.current.subscribe()
    })

    expect(result.current.error).toBe('push service down')
    expect(result.current.subscribed).toBe(false)
  })

  it('refuses to subscribe before the service worker is registered', async () => {
    removePushApis()
    const { result } = renderHook(() => usePushNotifications())

    await act(async () => {
      await result.current.subscribe()
    })

    expect(result.current.error).toBe('Push notifications are not supported on this device.')
  })

  it('unsubscribes and announces it', async () => {
    permission = 'granted'
    existingSubscription = makeSubscription()
    const listener = jest.fn()
    window.addEventListener('aframp:push-unsubscribe', listener)
    const { result } = await renderReady()

    await act(async () => {
      await result.current.unsubscribe()
    })

    expect(existingSubscription.unsubscribe).toHaveBeenCalled()
    expect(listener).toHaveBeenCalled()
    expect(result.current.subscribed).toBe(false)
    window.removeEventListener('aframp:push-unsubscribe', listener)
  })

  it('reports a failed unsubscribe', async () => {
    existingSubscription = makeSubscription()
    existingSubscription.unsubscribe.mockRejectedValue(new Error('cannot unsubscribe'))
    const { result } = await renderReady()

    await act(async () => {
      await result.current.unsubscribe()
    })

    expect(result.current.error).toBe('cannot unsubscribe')
  })
})
