'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  api,
  isOffline,
  setUnauthorizedHandler,
  type AuthResponse,
  type LoginResult,
  type Me,
  type OtpChallengeResponse,
} from '@/lib/api'

interface Session {
  token: string
  userId: string
  merchantId: string | null
}

interface SessionContextValue {
  session: Session | null
  /** False until the session cookie has been read — guards against redirecting on first paint. */
  ready: boolean
  signIn: (email: string, password: string) => Promise<LoginResult>
  /** Always a challenge — the account doesn't exist until `completeOtp` succeeds. */
  signUp: (
    email: string,
    password: string,
    name: string,
    phoneNumber: string
  ) => Promise<OtpChallengeResponse>
  completeOtp: (challengeId: string, code: string) => Promise<void>
  signOut: () => void
  /** Re-fetches /me and updates any cached profile data. Returns a discriminated
   * union so callers can distinguish between success, network errors, and auth
   * failures (401). Auth failures are not caught — they propagate to trigger
   * signOut via the unauthorized handler. */
  refreshMe: () => Promise<{ success: true; data: Me } | { success: false; reason: 'network' }>
  /** Latest profile data from /me, if fetched. */
  me: Me | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

function toSession(response: AuthResponse): Session {
  return {
    token: response.token,
    userId: response.user_id,
    merchantId: response.merchant_id,
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<Me | null>(null)

  // On mount, read the session from the httpOnly cookie via the API route.
  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json() as Promise<Session | null>)
      .then((data) => {
        if (data?.token) setSession(data)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const persist = useCallback(async (next: Session) => {
    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
    } catch {
      // Best-effort: if the API route fails the session still works for this tab.
    }
    setSession(next)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password)
      if ('token' in result) await persist(toSession(result))
      return result
    },
    [persist]
  )

  const signUp = useCallback(
    (email: string, password: string, name: string, phoneNumber: string) => {
      return api.signup(email, password, name, phoneNumber)
    },
    []
  )

  const completeOtp = useCallback(
    async (challengeId: string, code: string) => {
      await persist(toSession(await api.verifyOtp(challengeId, code)))
    },
    [persist]
  )

  const signOut = useCallback(() => {
    if (session) api.logout(session.token).catch(() => {})
    fetch('/api/session', { method: 'DELETE' }).catch(() => {})
    setSession(null)
    setMe(null)
  }, [session])

  const refreshMe = useCallback(async () => {
    if (!session) {
      throw new Error('refreshMe called without a session')
    }
    try {
      const data = await api.getMe(session.token)
      setMe(data)
      return { success: true as const, data }
    } catch (cause) {
      // Network errors (status 0) are recoverable — report them without sign-out.
      // Auth errors (401) are not caught here; they propagate to trigger the
      // unauthorized handler in lib/api.ts, which calls signOut.
      if (isOffline(cause)) {
        return { success: false as const, reason: 'network' as const }
      }
      throw cause
    }
  }, [session])

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  const value = useMemo(
    () => ({ session, ready, signIn, signUp, completeOtp, signOut, refreshMe, me }),
    [session, ready, signIn, signUp, completeOtp, signOut, refreshMe, me]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside <SessionProvider>')
  return context
}

export function useAuthenticatedSession(): Session {
  const { session } = useSession()
  if (!session) throw new Error('This screen requires a signed-in merchant')
  return session
}
