import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PushNotificationToggle } from '../push-notification-toggle'
import {
  usePushNotifications,
  type UsePushNotificationsReturn,
} from '@/hooks/use-push-notifications'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'tok' }),
}))

jest.mock('@/hooks/use-push-notifications', () => ({
  usePushNotifications: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getPushSubscriptionStatus: jest.fn(),
    registerPushSubscription: jest.fn(),
    unregisterPushSubscription: jest.fn(),
  },
}))

const mockApi = api as jest.Mocked<typeof api>
const subscribe = jest.fn()
const unsubscribe = jest.fn()

function hookState(overrides: Partial<UsePushNotificationsReturn> = {}) {
  ;(usePushNotifications as jest.Mock).mockReturnValue({
    permission: 'default',
    subscribed: false,
    loading: false,
    error: null,
    subscribe,
    unsubscribe,
    ...overrides,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockApi.getPushSubscriptionStatus.mockResolvedValue({ enabled: false })
  mockApi.registerPushSubscription.mockResolvedValue({} as never)
  mockApi.unregisterPushSubscription.mockResolvedValue(undefined as never)
  hookState()
})

describe('PushNotificationToggle', () => {
  it('explains when push is unsupported', () => {
    hookState({ permission: 'unsupported' })
    render(<PushNotificationToggle />)
    expect(screen.getByText(/does not support Web Push/i)).toBeInTheDocument()
  })

  it('explains when permission is blocked', () => {
    hookState({ permission: 'denied' })
    render(<PushNotificationToggle />)
    expect(screen.getByText('Push notifications blocked')).toBeInTheDocument()
  })

  it('shows an off switch once the backend status loads, and subscribes when turned on', async () => {
    render(<PushNotificationToggle />)

    const toggle = await screen.findByRole('switch')
    expect(toggle).not.toBeChecked()
    expect(mockApi.getPushSubscriptionStatus).toHaveBeenCalledWith('tok')

    await userEvent.click(toggle)
    expect(subscribe).toHaveBeenCalled()
  })

  it('treats a failed status check as disabled', async () => {
    mockApi.getPushSubscriptionStatus.mockRejectedValue(new Error('offline'))
    render(<PushNotificationToggle />)
    expect(await screen.findByRole('switch')).not.toBeChecked()
  })

  it('is on when subscribed locally and enabled on the backend, and unsubscribes when turned off', async () => {
    mockApi.getPushSubscriptionStatus.mockResolvedValue({ enabled: true })
    hookState({ subscribed: true })
    render(<PushNotificationToggle />)

    const toggle = await screen.findByRole('switch')
    expect(toggle).toBeChecked()
    expect(screen.getByText(/You will receive a notification/)).toBeInTheDocument()

    await userEvent.click(toggle)
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('registers the subscription with the backend when the hook announces it', async () => {
    render(<PushNotificationToggle />)
    await screen.findByRole('switch')

    const detail = { endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' }
    act(() => {
      window.dispatchEvent(new CustomEvent('aframp:push-subscribe', { detail }))
    })

    await waitFor(() =>
      expect(mockApi.registerPushSubscription).toHaveBeenCalledWith('tok', detail)
    )
  })

  it('shows an error when saving the subscription fails', async () => {
    mockApi.registerPushSubscription.mockRejectedValue(new Error('save failed'))
    render(<PushNotificationToggle />)
    await screen.findByRole('switch')

    act(() => {
      window.dispatchEvent(new CustomEvent('aframp:push-subscribe', { detail: {} }))
    })

    expect(await screen.findByText('save failed')).toBeInTheDocument()
  })

  it('unregisters with the backend when the hook announces an unsubscribe', async () => {
    render(<PushNotificationToggle />)
    await screen.findByRole('switch')

    act(() => {
      window.dispatchEvent(new CustomEvent('aframp:push-unsubscribe'))
    })

    await waitFor(() => expect(mockApi.unregisterPushSubscription).toHaveBeenCalledWith('tok'))
  })

  it('shows a fallback error when removing the subscription fails without a message', async () => {
    mockApi.unregisterPushSubscription.mockRejectedValue('nope')
    render(<PushNotificationToggle />)
    await screen.findByRole('switch')

    act(() => {
      window.dispatchEvent(new CustomEvent('aframp:push-unsubscribe'))
    })

    expect(await screen.findByText('Could not remove subscription')).toBeInTheDocument()
  })

  it('shows the hook error', async () => {
    hookState({ error: 'Permission denied.' })
    render(<PushNotificationToggle />)
    expect(await screen.findByText('Permission denied.')).toBeInTheDocument()
  })
})
