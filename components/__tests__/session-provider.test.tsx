import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider, useSession } from '../session-provider'

function Consumer() {
  const { session, ready, signIn, signOut, completeOtp } = useSession()
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="session">{session ? session.token : 'none'}</span>
      <button onClick={() => signIn('merchant@example.com', 'secret-pass')}>sign-in</button>
      <button onClick={() => signOut()}>sign-out</button>
      <button onClick={() => completeOtp('otp-token', { user_id: 'u', merchant_id: 'm' })}>
        complete-otp
      </button>
    </div>
  )
}

function renderProvider(props: Record<string, unknown> = {}) {
  return render(
    <SessionProvider {...props}>
      <Consumer />
    </SessionProvider>,
  )
}

describe('SessionProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.restoreAllMocks()
  })

  it('is not ready before localStorage is read, then becomes ready', async () => {
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'))
  })

  it('completeOtp stores the token in localStorage and updates session state', async () => {
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'complete-otp' }))

    expect(window.localStorage.getItem('aframp.session')).toBeTruthy()
    expect(screen.getByTestId('session')).toHaveTextContent('otp-token')
  })

  it('signOut clears localStorage and sets session to null', async () => {
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'complete-otp' }))
    expect(screen.getByTestId('session')).toHaveTextContent('otp-token')

    await user.click(screen.getByRole('button', { name: 'sign-out' }))

    expect(window.localStorage.getItem('aframp.session')).toBeNull()
    expect(screen.getByTestId('session')).toHaveTextContent('none')
  })

  it('legacy signIn with an AuthResponse stores the session without an OTP step', async () => {
    const user = userEvent.setup()
    const fetchMock = jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'legacy-token', user_id: 'u', merchant_id: 'm' }),
    } as Response)

    renderProvider()
    await user.click(screen.getByRole('button', { name: 'sign-in' }))

    expect(fetchMock).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('legacy-token'))
    expect(window.localStorage.getItem('aframp.session')).toBeTruthy()
  })

  it('calls onUnauthorized when the stored token is expired', async () => {
    const onUnauthorized = jest.fn()
    window.localStorage.setItem(
      'aframp.session',
      JSON.stringify({ token: 'expired-token', expires_at: Date.now() - 1000 }),
    )

    renderProvider({ onUnauthorized })

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled())
    expect(screen.getByTestId('session')).toHaveTextContent('none')
  })
})
