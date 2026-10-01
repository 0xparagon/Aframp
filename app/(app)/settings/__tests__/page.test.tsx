import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))

const mockMe = {
  id: '1',
  email: 'current@example.com',
  name: 'Test User',
  merchant_name: 'Test Merchant',
}

vi.mock('@/lib/api', () => ({
  api: {
    getMe: vi.fn().mockResolvedValue(mockMe),
    changeEmail: vi.fn().mockResolvedValue({ message: 'ok' }),
    updateProfile: vi.fn().mockResolvedValue(mockMe),
    deleteAccount: vi.fn().mockResolvedValue({}),
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(msg: string, status: number) {
      super(msg)
      this.status = status
    }
  },
}))

vi.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'tok' }),
  useSession: () => ({ signOut: vi.fn(), refreshMe: vi.fn(), me: mockMe }),
}))

vi.mock('@/components/push-notification-toggle', () => ({
  PushNotificationToggle: () => <div>push toggle</div>,
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

import ProfilePage from '../page'
import { api } from '@/lib/api'

describe('Settings page – email validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an email with no @ sign and shows an inline error', async () => {
    render(<ProfilePage />)

    const input = await screen.findByLabelText(/current email/i)

    await userEvent.clear(input)
    await userEvent.type(input, 'notanemail')

    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please enter a valid email address.'
    )
    expect(api.changeEmail).not.toHaveBeenCalled()
  })

  it('rejects an email missing a TLD and shows an inline error', async () => {
    render(<ProfilePage />)

    const input = await screen.findByLabelText(/current email/i)

    await userEvent.clear(input)
    await userEvent.type(input, 'user@nodot')

    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please enter a valid email address.'
    )
    expect(api.changeEmail).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only email', async () => {
    render(<ProfilePage />)

    const input = await screen.findByLabelText(/current email/i)

    await userEvent.clear(input)
    await userEvent.type(input, '   ')

    fireEvent.submit(input.closest('form')!)

    // The "enter a new email" guard fires before the format check for blank values
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(api.changeEmail).not.toHaveBeenCalled()
  })

  it('clears the inline error when the user starts correcting the value', async () => {
    render(<ProfilePage />)

    const input = await screen.findByLabelText(/current email/i)

    await userEvent.clear(input)
    await userEvent.type(input, 'notanemail')
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByRole('alert')).toBeInTheDocument()

    // Start correcting
    await userEvent.type(input, '@')
    expect(screen.queryByText('Please enter a valid email address.')).not.toBeInTheDocument()
  })

  it('calls api.changeEmail for a valid new address', async () => {
    render(<ProfilePage />)

    const input = await screen.findByLabelText(/current email/i)

    await userEvent.clear(input)
    await userEvent.type(input, 'new@example.com')

    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(api.changeEmail).toHaveBeenCalledWith('tok', 'new@example.com'))
    expect(screen.queryByText('Please enter a valid email address.')).not.toBeInTheDocument()
  })

  it('does not call api.changeEmail when address equals current email', async () => {
    render(<ProfilePage />)

    // The input is pre-filled with the current email from mockMe
    await screen.findByLabelText(/current email/i)

    const form = screen.getByLabelText(/current email/i).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => expect(api.changeEmail).not.toHaveBeenCalled())
  })
})
