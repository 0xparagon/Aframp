import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'aframp.session'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 h — matches backend JWT expiry

const SECURE = process.env.NODE_ENV === 'production'

/** POST /api/session — persist the session in an HTTP-only cookie. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    token?: string
    userId?: string
    merchantId?: string | null
  }

  if (!body.token || !body.userId) {
    return NextResponse.json({ error: 'token and userId are required' }, { status: 400 })
  }

  const payload = JSON.stringify({
    token: body.token,
    userId: body.userId,
    merchantId: body.merchantId ?? null,
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, payload, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  return response
}

/** DELETE /api/session — clear the HTTP-only cookie. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

/** GET /api/session — read the cookie and return the session payload. */
export async function GET(req: NextRequest) {
  const raw = req.cookies.get(COOKIE_NAME)?.value
  if (!raw) return NextResponse.json({ session: null })

  try {
    const session = JSON.parse(raw) as {
      token: string
      userId: string
      merchantId: string | null
    }
    return NextResponse.json({ session })
  } catch {
    return NextResponse.json({ session: null })
  }
}
