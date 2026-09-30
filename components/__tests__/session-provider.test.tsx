import { act, render, renderHook, screen } from '@testing-library/react'
import { SessionProvider, useAuthenticatedSession, useSession } from '@/components/session-provider'
import { setUnauthorizedHandler } from '@/lib/api'
import { getItem, removeItem, setItem } from '@/lib/storage'

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

const mockApi = {
  login: jest.fn(),
  signup: jest.fn(),
  verifyOtp: jest.fn(),
  logout: jest.fn(),
  getMe: jest.fn(),
}

jest.mock('@/lib/api', () => ({
  api: {
    login: (...args: unknown[]) => mockApi.login(...args),
    signup: (...args: unknown[]) => mockApi.signup(...args),
    verifyOtp: (...args: unknown[]) => mockApi.verifyOtp(...args),
    logout: (...args: unknown[]) => mockApi.logout(...args),
    getMe: (...args: unknown[]) => mockApi.getMe(...args),
  },
  setUnauthorizedHandler: jest.fn(),
}))

describe('SessionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getItem as jest.Mock).mockReturnValue(null)
  })

  it('renders children and marks ready after reading storage', () => {
    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })
    expect(result.current.ready).toBe(true)
    expect(result.current.session).toBeNull()
    expect(getItem).toHaveBeenCalledWith('aframp.session')
  })

  it('loads valid session from storage on mount', () => {
    const storedSession = { token: 'tok_1', userId: 'u_1', merchantId: 'm_1' }
    ;(getItem as jest.Mock).mockReturnValue(JSON.stringify(storedSession))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })
    expect(result.current.session).toEqual(storedSession)
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('removes invalid JSON from storage on mount', () => {
    ;(getItem as jest.Mock).mockReturnValue('invalid-json{{{')

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })
    expect(result.current.session).toBeNull()
    expect(removeItem).toHaveBeenCalledWith('aframp.session')
  })

  it('handles signIn with direct AuthResponse (legacy account)', async () => {
    const authResponse = { token: 'legacy_tok', user_id: 'user_1', merchant_id: 'merch_1' }
    mockApi.login.mockResolvedValue(authResponse)

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let res: unknown
    await act(async () => {
      res = await result.current.signIn('legacy@aframp.com', 'pass')
    })

    expect(res).toEqual(authResponse)
    expect(setItem).toHaveBeenCalledWith(
      'aframp.session',
      JSON.stringify({ token: 'legacy_tok', userId: 'user_1', merchantId: 'merch_1' })
    )
    expect(result.current.session).toEqual({
      token: 'legacy_tok',
      userId: 'user_1',
      merchantId: 'merch_1',
    })
  })

  it('handles signIn with challenge response without persisting immediately', async () => {
    const challengeResponse = { challenge_id: 'chal_123', expires_in_secs: 300 }
    mockApi.login.mockResolvedValue(challengeResponse)

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let res: unknown
    await act(async () => {
      res = await result.current.signIn('user@aframp.com', 'pass')
    })

    expect(res).toEqual(challengeResponse)
    expect(setItem).not.toHaveBeenCalled()
    expect(result.current.session).toBeNull()
  })

  it('handles signUp calling api.signup', async () => {
    mockApi.signup.mockResolvedValue({ challenge_id: 'chal_abc', expires_in_secs: 600 })

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let res: unknown
    await act(async () => {
      res = await result.current.signUp('new@aframp.com', 'pw', 'New User', '+2348000000000')
    })

    expect(mockApi.signup).toHaveBeenCalledWith(
      'new@aframp.com',
      'pw',
      'New User',
      '+2348000000000'
    )
    expect(res).toEqual({ challenge_id: 'chal_abc', expires_in_secs: 600 })
  })

  it('handles completeOtp and persists verified session', async () => {
    const verifiedResponse = { token: 'tok_otp', user_id: 'u_otp', merchant_id: 'm_otp' }
    mockApi.verifyOtp.mockResolvedValue(verifiedResponse)

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    await act(async () => {
      await result.current.completeOtp('chal_123', '123456')
    })

    expect(mockApi.verifyOtp).toHaveBeenCalledWith('chal_123', '123456')
    expect(setItem).toHaveBeenCalledWith(
      'aframp.session',
      JSON.stringify({ token: 'tok_otp', userId: 'u_otp', merchantId: 'm_otp' })
    )
    expect(result.current.session).toEqual({
      token: 'tok_otp',
      userId: 'u_otp',
      merchantId: 'm_otp',
    })
  })

  it('handles signOut and clears storage and state', () => {
    const storedSession = { token: 'tok_active', userId: 'u_1', merchantId: null }
    ;(getItem as jest.Mock).mockReturnValue(JSON.stringify(storedSession))
    mockApi.logout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    act(() => {
      result.current.signOut()
    })

    expect(mockApi.logout).toHaveBeenCalledWith('tok_active')
    expect(removeItem).toHaveBeenCalledWith('aframp.session')
    expect(result.current.session).toBeNull()
    expect(result.current.me).toBeNull()
  })

  it('handles signOut when api.logout throws', () => {
    const storedSession = { token: 'tok_active', userId: 'u_1', merchantId: null }
    ;(getItem as jest.Mock).mockReturnValue(JSON.stringify(storedSession))
    mockApi.logout.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    act(() => {
      result.current.signOut()
    })

    expect(mockApi.logout).toHaveBeenCalledWith('tok_active')
    expect(removeItem).toHaveBeenCalledWith('aframp.session')
    expect(result.current.session).toBeNull()
  })

  it('handles refreshMe successfully', async () => {
    const storedSession = { token: 'tok_me', userId: 'u_1', merchantId: null }
    ;(getItem as jest.Mock).mockReturnValue(JSON.stringify(storedSession))
    const meData = {
      user_id: 'u_1',
      email: 'me@aframp.com',
      name: 'Me',
      is_admin: false,
      created_at: '',
      merchant_id: null,
      merchant_name: null,
    }
    mockApi.getMe.mockResolvedValue(meData)

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    let data: unknown
    await act(async () => {
      data = await result.current.refreshMe()
    })

    expect(data).toEqual(meData)
    expect(result.current.me).toEqual(meData)
  })

  it('handles refreshMe returning null when there is no session or when api.getMe throws', async () => {
    const { result: noSessionResult } = renderHook(() => useSession(), {
      wrapper: SessionProvider,
    })
    let res = await noSessionResult.current.refreshMe()
    expect(res).toBeNull()

    const storedSession = { token: 'tok_me', userId: 'u_1', merchantId: null }
    ;(getItem as jest.Mock).mockReturnValue(JSON.stringify(storedSession))
    mockApi.getMe.mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    await act(async () => {
      res = await result.current.refreshMe()
    })
    expect(res).toBeNull()
  })

  it('registers unauthorized handler and cleans up on unmount', () => {
    const { unmount } = renderHook(() => useSession(), { wrapper: SessionProvider })
    expect(setUnauthorizedHandler).toHaveBeenCalledWith(expect.any(Function))

    unmount()
    expect(setUnauthorizedHandler).toHaveBeenCalledWith(null)
  })

  it('throws when useSession is used outside SessionProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useSession())).toThrow(
      'useSession must be used inside <SessionProvider>'
    )
    consoleError.mockRestore()
  })

  it('throws when useAuthenticatedSession is used without a session', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuthenticatedSession(), { wrapper: SessionProvider })).toThrow(
      'This screen requires a signed-in merchant'
    )
    consoleError.mockRestore()
  })

  it('returns session with useAuthenticatedSession when signed in', async () => {
    const storedSession = { token: 'tok_auth', userId: 'u_1', merchantId: 'm_1' }
    ;(getItem as jest.Mock).mockReturnValue(JSON.stringify(storedSession))

    function Consumer() {
      const { ready } = useSession()
      if (!ready) return <div>Loading...</div>
      return <ProtectedChild />
    }

    function ProtectedChild() {
      const authSession = useAuthenticatedSession()
      return <div>Token: {authSession.token}</div>
    }

    render(
      <SessionProvider>
        <Consumer />
      </SessionProvider>
    )

    expect(await screen.findByText('Token: tok_auth')).toBeInTheDocument()
  })

  it('tolerates storage.setItem throwing in persist', async () => {
    ;(setItem as jest.Mock).mockImplementation(() => {
      throw new Error('Quota exceeded')
    })
    const authResponse = { token: 'tok', user_id: 'u', merchant_id: null }
    mockApi.login.mockResolvedValue(authResponse)

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

    await act(async () => {
      await result.current.signIn('test@aframp.com', 'pw')
    })

    expect(result.current.session).toEqual({ token: 'tok', userId: 'u', merchantId: null })
  })
})
