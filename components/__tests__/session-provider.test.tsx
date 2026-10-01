import { renderHook, act, render, screen, waitFor } from '@testing-library/react'
import {
  api,
  setUnauthorizedHandler,
  type LoginResult,
  type Me,
  type OtpChallengeResponse,
} from '@/lib/api'
import { SessionProvider, useSession, useAuthenticatedSession } from '../session-provider'

let unauthorizedCallback: (() => void) | null = null

jest.mock('@/lib/api', () => ({
  api: {
    login: jest.fn(),
    signup: jest.fn(),
    verifyOtp: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
  },
  setUnauthorizedHandler: jest.fn((handler: (() => void) | null) => {
    unauthorizedCallback = handler
  }),
}))

const mockApi = api as jest.Mocked<typeof api>

describe('SessionProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.clearAllMocks()
    unauthorizedCallback = null
  })

  it('initializes with ready=true and session=null when storage is empty', () => {
    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    expect(result.current.ready).toBe(true)
    expect(result.current.session).toBeNull()
    expect(result.current.me).toBeNull()
  })

  it('restores stored session from localStorage on mount', () => {
    const initialSession = { token: 'stored-token', userId: 'u-1', merchantId: 'm-1' }
    window.localStorage.setItem('aframp.session', JSON.stringify(initialSession))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    expect(result.current.ready).toBe(true)
    expect(result.current.session).toEqual(initialSession)
  })

  it('clears corrupted localStorage entry on mount and keeps session null', () => {
    window.localStorage.setItem('aframp.session', 'invalid-json{')

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    expect(result.current.ready).toBe(true)
    expect(result.current.session).toBeNull()
    expect(window.localStorage.getItem('aframp.session')).toBeNull()
  })

  it('signIn success persists session and updates context value for legacy account', async () => {
    mockApi.login.mockResolvedValue({
      token: 'tok-legacy',
      user_id: 'u-legacy',
      merchant_id: 'm-legacy',
    })

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let loginRes: LoginResult | undefined
    await act(async () => {
      loginRes = await result.current.signIn('merchant@example.com', 'password123')
    })

    expect(mockApi.login).toHaveBeenCalledWith('merchant@example.com', 'password123')
    expect(loginRes).toEqual({
      token: 'tok-legacy',
      user_id: 'u-legacy',
      merchant_id: 'm-legacy',
    })
    expect(result.current.session).toEqual({
      token: 'tok-legacy',
      userId: 'u-legacy',
      merchantId: 'm-legacy',
    })
    expect(JSON.parse(window.localStorage.getItem('aframp.session')!)).toEqual({
      token: 'tok-legacy',
      userId: 'u-legacy',
      merchantId: 'm-legacy',
    })
  })

  it('signIn OTP challenge does not set session and returns challenge', async () => {
    mockApi.login.mockResolvedValue({
      challenge_id: 'ch-123',
      expires_in_secs: 300,
    })

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let challengeRes: LoginResult | undefined
    await act(async () => {
      challengeRes = await result.current.signIn('merchant@example.com', 'password123')
    })

    expect(challengeRes).toEqual({
      challenge_id: 'ch-123',
      expires_in_secs: 300,
    })
    expect(result.current.session).toBeNull()
    expect(window.localStorage.getItem('aframp.session')).toBeNull()
  })

  it('signIn failure propagates error and leaves session null', async () => {
    mockApi.login.mockRejectedValue(new Error('Invalid credentials'))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    await act(async () => {
      await expect(result.current.signIn('merchant@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials'
      )
    })

    expect(result.current.session).toBeNull()
  })

  it('signUp calls api.signup and returns challenge', async () => {
    mockApi.signup.mockResolvedValue({
      challenge_id: 'ch-new',
      expires_in_secs: 300,
    })

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let signupRes: OtpChallengeResponse | undefined
    await act(async () => {
      signupRes = await result.current.signUp(
        'new@example.com',
        'password123',
        'Alice',
        '+2348012345678'
      )
    })

    expect(mockApi.signup).toHaveBeenCalledWith(
      'new@example.com',
      'password123',
      'Alice',
      '+2348012345678'
    )
    expect(signupRes).toEqual({
      challenge_id: 'ch-new',
      expires_in_secs: 300,
    })
  })

  it('completeOtp verifies code and persists session', async () => {
    mockApi.verifyOtp.mockResolvedValue({
      token: 'tok-verified',
      user_id: 'u-verified',
      merchant_id: 'm-verified',
    })

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    await act(async () => {
      await result.current.completeOtp('ch-123', '654321')
    })

    expect(mockApi.verifyOtp).toHaveBeenCalledWith('ch-123', '654321')
    expect(result.current.session).toEqual({
      token: 'tok-verified',
      userId: 'u-verified',
      merchantId: 'm-verified',
    })
    expect(JSON.parse(window.localStorage.getItem('aframp.session')!)).toEqual({
      token: 'tok-verified',
      userId: 'u-verified',
      merchantId: 'm-verified',
    })
  })

  it('signOut clears session, me, localStorage and calls api.logout', () => {
    mockApi.logout.mockResolvedValue()
    const initialSession = { token: 'tok-active', userId: 'u-1', merchantId: 'm-1' }
    window.localStorage.setItem('aframp.session', JSON.stringify(initialSession))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    expect(result.current.session).toEqual(initialSession)

    act(() => {
      result.current.signOut()
    })

    expect(mockApi.logout).toHaveBeenCalledWith('tok-active')
    expect(result.current.session).toBeNull()
    expect(result.current.me).toBeNull()
    expect(window.localStorage.getItem('aframp.session')).toBeNull()
  })

  it('signOut handles api.logout rejection gracefully', () => {
    mockApi.logout.mockRejectedValue(new Error('Logout failed'))
    const initialSession = { token: 'tok-error', userId: 'u-1', merchantId: 'm-1' }
    window.localStorage.setItem('aframp.session', JSON.stringify(initialSession))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    act(() => {
      result.current.signOut()
    })

    expect(mockApi.logout).toHaveBeenCalledWith('tok-error')
    expect(result.current.session).toBeNull()
    expect(window.localStorage.getItem('aframp.session')).toBeNull()
  })

  it('signOut does not call api.logout when session is null', () => {
    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    act(() => {
      result.current.signOut()
    })

    expect(mockApi.logout).not.toHaveBeenCalled()
    expect(result.current.session).toBeNull()
  })

  it('calls signOut when 401 onUnauthorized handler fires', () => {
    mockApi.logout.mockResolvedValue()
    const initialSession = { token: 'tok-401', userId: 'u-401', merchantId: null }
    window.localStorage.setItem('aframp.session', JSON.stringify(initialSession))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    expect(result.current.session).toEqual(initialSession)
    expect(unauthorizedCallback).not.toBeNull()

    act(() => {
      unauthorizedCallback?.()
    })

    expect(result.current.session).toBeNull()
    expect(window.localStorage.getItem('aframp.session')).toBeNull()
  })

  it('cleans up onUnauthorized handler when unmounted', () => {
    const { unmount } = renderHook(() => useSession(), { wrapper: SessionProvider })

    unmount()

    expect(setUnauthorizedHandler).toHaveBeenLastCalledWith(null)
  })

  it('session still works for tab when localStorage.setItem throws', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    mockApi.login.mockResolvedValue({
      token: 'tok-quota',
      user_id: 'u-quota',
      merchant_id: 'm-quota',
    })

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    await act(async () => {
      await result.current.signIn('user@test.com', 'password')
    })

    expect(result.current.session).toEqual({
      token: 'tok-quota',
      userId: 'u-quota',
      merchantId: 'm-quota',
    })

    setItemSpy.mockRestore()
  })

  it('refreshMe returns null when session is null', async () => {
    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let profile: Me | null | undefined
    await act(async () => {
      profile = await result.current.refreshMe()
    })

    expect(profile).toBeNull()
    expect(mockApi.getMe).not.toHaveBeenCalled()
  })

  it('refreshMe fetches and updates profile when session exists', async () => {
    const initialSession = { token: 'tok-me', userId: 'u-me', merchantId: 'm-me' }
    window.localStorage.setItem('aframp.session', JSON.stringify(initialSession))

    const mockProfile: Me = {
      user_id: 'u-me',
      email: 'me@example.com',
      name: 'Merchant Me',
      is_admin: false,
      merchant_id: 'm-me',
      merchant_name: 'Test Business',
      created_at: '2026-01-01',
    }
    mockApi.getMe.mockResolvedValue(mockProfile)

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let profile: Me | null | undefined
    await act(async () => {
      profile = await result.current.refreshMe()
    })

    expect(mockApi.getMe).toHaveBeenCalledWith('tok-me')
    expect(profile).toEqual(mockProfile)
    expect(result.current.me).toEqual(mockProfile)
  })

  it('refreshMe returns null and keeps me unchanged when api.getMe fails', async () => {
    const initialSession = { token: 'tok-me-fail', userId: 'u-1', merchantId: 'm-1' }
    window.localStorage.setItem('aframp.session', JSON.stringify(initialSession))

    mockApi.getMe.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let profile: Me | null | undefined
    await act(async () => {
      profile = await result.current.refreshMe()
    })

    expect(profile).toBeNull()
    expect(result.current.me).toBeNull()
  })

  it('useSession throws error when used outside SessionProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useSession())).toThrow(
      'useSession must be used inside <SessionProvider>'
    )

    spy.mockRestore()
  })

  it('ready flag: false before localStorage is read, true after', async () => {
    const readyStates: boolean[] = []

    function ReadyObserver() {
      const { ready } = useSession()
      readyStates.push(ready)
      return null
    }

    render(
      <SessionProvider>
        <ReadyObserver />
      </SessionProvider>
    )

    await waitFor(() => {
      expect(readyStates).toContain(true)
    })
    expect(readyStates[0]).toBe(false)
  })

  it('useAuthenticatedSession throws error when session is null', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuthenticatedSession(), { wrapper: SessionProvider })).toThrow(
      'This screen requires a signed-in merchant'
    )

    spy.mockRestore()
  })

  it('useAuthenticatedSession returns session when authenticated', async () => {
    const initialSession = { token: 'tok-auth', userId: 'u-auth', merchantId: null }
    window.localStorage.setItem('aframp.session', JSON.stringify(initialSession))

    function Consumer() {
      const { ready, session } = useSession()
      if (!ready || !session) return null
      return <AuthenticatedChild />
    }

    function AuthenticatedChild() {
      const session = useAuthenticatedSession()
      return <div data-testid="token">{session.token}</div>
    }

    render(
      <SessionProvider>
        <Consumer />
      </SessionProvider>
    )

    const tokenElement = await screen.findByTestId('token')
    expect(tokenElement.textContent).toBe('tok-auth')
  })
})
