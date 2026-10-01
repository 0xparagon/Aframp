import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './page'

const replace = vi.fn()
const push = vi.fn()
const signIn = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
}))

vi.mock('@/components/session-provider', () => ({
  useSession: () => ({ session: null, ready: true, signIn }),
}))

vi.mock('@/lib/api', () => ({
  isOffline: (cause: unknown) =>
    typeof cause === 'object' && cause !== null && (cause as { status?: number }).status === 0,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    replace.mockReset()
    push.mockReset()
    signIn.mockReset()
  })

  it('shows a validation error when submitting with an empty email', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Please enter both your email and password.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('shows a validation error when submitting with an empty password', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'merchant@example.com')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Please enter both your email and password.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('shows the offline alert variant when ApiError has status 0', async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValueOnce(Object.assign(new Error('You are offline'), { status: 0 }))
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('You are offline')
    expect(alert).toHaveAttribute('data-variant', 'notice')
  })

  it('navigates to /verify when the response contains a challenge_id', async () => {
    const user = userEvent.setup()
    signIn.mockResolvedValueOnce({ challenge_id: 'challenge-123' })
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/verify?challenge_id=challenge-123&flow=login'),
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it('navigates to /charge on a direct AuthResponse', async () => {
    const user = userEvent.setup()
    signIn.mockResolvedValueOnce({ access_token: 'token', merchant_id: 'merchant-1' })
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/charge'))
    expect(push).not.toHaveBeenCalled()
  })

  it('disables the submit button while submitting', async () => {
    const user = userEvent.setup()
    let resolveSignIn: (value: unknown) => void = () => {}
    signIn.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveSignIn = resolve
      }),
    )
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const button = screen.getByRole('button', { name: 'Signing in…' })
    expect(button).toBeDisabled()

    resolveSignIn({ access_token: 'token', merchant_id: 'merchant-1' })
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/charge'))
  })

  it('redirects to /login when a 401 response is returned during sign-in', async () => {
    const user = userEvent.setup()
    const unauthorized = Object.assign(new Error('Unauthorized'), { status: 401 })
    signIn.mockRejectedValue(unauthorized)
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(replace).toHaveBeenCalledWith('/login')
  })
})
