'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  api,
  setUnauthorizedHandler,
  type AuthResponse,
  type LoginResult,
  type Me,
  type OtpChallengeResponse,
} from '@/lib/api'

// #633: token is now stored in an HTTP-only cookie via /api/session,
// not in localStorage. No token is ever readable by client-side JS.

interface Session {
  token: string
  userId: string
  merchantId: string | null
}

interface SessionContextValue {
  session: Session | null
  /** False until the cookie has been read from the server — guards against redirecting on first paint. */
  ready: boolean
  /** Returns the raw result so the caller can branch: a session (legacy
   * no-phone accounts) vs a challenge (everyone else) that needs `/verify`. */
  signIn: (email: string, password: string) => Promise<LoginResult>
  /** Always a challenge — the account doesn't exist until `completeOtp` succeeds. */
  signUp: (email: string, password: string, name: string, phoneNumber: string) => Promise<OtpChallengeResponse>
  completeOtp: (challengeId: string, code: string) => Promise<void>
  signOut: () => void
  /** Re-fetches /me and updates any cached profile data. */
  refreshMe: () => Promise<Me | null>
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

/** Persist the session to the HTTP-only cookie via the API route. */
async function persistCookie(next: Session): Promise<void> {
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  })
}

/** Clear the HTTP-only cookie. */
async function clearCookie(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' })
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<Me | null>(null)

  // #633: on mount, read the session from the HTTP-only cookie via
  // /api/session (GET). This replaces the localStorage read.
  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json() as Promise<{ session: Session | null }>)
      .then(({ session: stored }) => {
        if (stored) setSession(stored)
      })
      .catch(() => {
        // Network error on startup — start with no session.
      })
      .finally(() => setReady(true))
  }, [])

  const persist = useCallback(async (next: Session) => {
    setSession(next)
    await persistCookie(next)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password)
      // Only a legacy no-phone account gets a session straight away; a
      // challenge means the caller still has to route to `/verify`.
      if ('token' in result) await persist(toSession(result))
      return result
    },
    [persist]
  )

  const signUp = useCallback((email: string, password: string, name: string, phoneNumber: string) => {
    return api.signup(email, password, name, phoneNumber)
  }, [])

  const completeOtp = useCallback(
    async (challengeId: string, code: string) => {
      await persist(toSession(await api.verifyOtp(challengeId, code)))
    },
    [persist]
  )

  const signOut = useCallback(() => {
    // Best-effort: a failed logout call shouldn't block clearing the local
    // session, but it's the only thing that clears the server-side cookie.
    if (session) api.logout(session.token).catch(() => {})
    clearCookie().catch(() => {})
    setSession(null)
    setMe(null)
  }, [session])

  const refreshMe = useCallback(async () => {
    if (!session) return null
    try {
      const data = await api.getMe(session.token)
      setMe(data)
      return data
    } catch {
      return null
    }
  }, [session])

  // Tokens expire after 24h with no refresh path, so drop the session on any
  // 401 from an authenticated call — the route guards handle the redirect.
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

/**
 * For screens that cannot render without a token. The `(app)` layout guarantees
 * one exists before mounting children, so this narrows the type for them.
 */
export function useAuthenticatedSession(): Session {
  const { session } = useSession()
  if (!session) throw new Error('This screen requires a signed-in merchant')
  return session
}
