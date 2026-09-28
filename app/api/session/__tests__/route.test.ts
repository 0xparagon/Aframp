// Test the /api/session route: cookie is set and localStorage key is absent
import { POST, DELETE, GET } from '../route'
import { NextRequest } from 'next/server'

const mockCookieSet = jest.fn()
const mockCookieDelete = jest.fn()
const mockCookieGet = jest.fn()

jest.mock('next/headers', () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      set: mockCookieSet,
      delete: mockCookieDelete,
      get: mockCookieGet,
    })
  ),
}))

const sessionPayload = { token: 'jwt-token', userId: 'user-1', merchantId: 'merchant-1' }

beforeEach(() => {
  mockCookieSet.mockReset()
  mockCookieDelete.mockReset()
  mockCookieGet.mockReset()
})

describe('POST /api/session', () => {
  it('sets an httpOnly, SameSite=Strict cookie with the session data', async () => {
    const req = new NextRequest('http://localhost/api/session', {
      method: 'POST',
      body: JSON.stringify(sessionPayload),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)

    expect(mockCookieSet).toHaveBeenCalledWith(
      'aframp.session',
      JSON.stringify(sessionPayload),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
      })
    )
  })

  it('does not write to localStorage — token is in the httpOnly cookie only', async () => {
    // The route only uses httpOnly cookies — localStorage must never be written
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
    const req = new NextRequest('http://localhost/api/session', {
      method: 'POST',
      body: JSON.stringify(sessionPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)
    // The route handler must not touch localStorage at all
    expect(setItemSpy).not.toHaveBeenCalled()
    setItemSpy.mockRestore()
  })
})

describe('DELETE /api/session', () => {
  it('deletes the session cookie', async () => {
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(mockCookieDelete).toHaveBeenCalledWith('aframp.session')
  })
})

describe('GET /api/session', () => {
  it('returns null when no cookie is set', async () => {
    mockCookieGet.mockReturnValue(undefined)
    const res = await GET()
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('returns the parsed session when cookie is present', async () => {
    mockCookieGet.mockReturnValue({ value: JSON.stringify(sessionPayload) })
    const res = await GET()
    const body = await res.json() as typeof sessionPayload
    expect(body).toEqual(sessionPayload)
  })
})
