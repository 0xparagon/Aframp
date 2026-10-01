import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VerifyOtpPage from './page'
import { useSession } from '@/components/session-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import { ApiError } from '@/lib/api'
import { CHALLENGE_SESSION_KEY } from '@/app/login/page'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

function paramsWith(entries: Record<string, string>) {
  return { get: (key: string) => entries[key] ?? null }
}

describe('VerifyOtpPage', () => {
  const replace = jest.fn()
  const completeOtp = jest.fn()

  beforeEach(() => {
    replace.mockReset()
    completeOtp.mockReset()
    sessionStorage.clear()
    ;(useRouter as jest.Mock).mockReturnValue({ replace })
    ;(useSession as jest.Mock).mockReturnValue({
      session: null,
      ready: true,
      completeOtp,
    })
  })

  it('redirects to /login when there is no challenge_id in sessionStorage', () => {
    ;(useSearchParams as jest.Mock).mockReturnValue(paramsWith({ flow: 'login' }))
    render(<VerifyOtpPage />)

    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('renders the code form when a challenge_id is present in sessionStorage', () => {
    sessionStorage.setItem(CHALLENGE_SESSION_KEY, 'chal-1')
    ;(useSearchParams as jest.Mock).mockReturnValue(paramsWith({ flow: 'login' }))
    render(<VerifyOtpPage />)

    expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
  })

  it('submits the code against the challenge and redirects a signup to /charge on success', async () => {
    sessionStorage.setItem(CHALLENGE_SESSION_KEY, 'chal-1')
    ;(useSearchParams as jest.Mock).mockReturnValue(paramsWith({ flow: 'signup' }))
    completeOtp.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<VerifyOtpPage />)

    await user.type(screen.getByLabelText(/6-digit code/i), '482913')
    await user.click(screen.getByRole('button', { name: /verify/i }))

    expect(completeOtp).toHaveBeenCalledWith('chal-1', '482913')
    expect(replace).toHaveBeenCalledWith('/charge')
  })

  it('clears challenge_id from sessionStorage after successful verification', async () => {
    sessionStorage.setItem(CHALLENGE_SESSION_KEY, 'chal-1')
    ;(useSearchParams as jest.Mock).mockReturnValue(paramsWith({ flow: 'login' }))
    completeOtp.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<VerifyOtpPage />)

    await user.type(screen.getByLabelText(/6-digit code/i), '482913')
    await user.click(screen.getByRole('button', { name: /verify/i }))

    expect(sessionStorage.getItem(CHALLENGE_SESSION_KEY)).toBeNull()
  })

  it('lets the user retry on an incorrect code without losing the challenge', async () => {
    sessionStorage.setItem(CHALLENGE_SESSION_KEY, 'chal-1')
    ;(useSearchParams as jest.Mock).mockReturnValue(paramsWith({ flow: 'login' }))
    completeOtp.mockRejectedValue(new ApiError('incorrect code', 400, 'OTP_INVALID'))
    const user = userEvent.setup()
    render(<VerifyOtpPage />)

    await user.type(screen.getByLabelText(/6-digit code/i), '000000')
    await user.click(screen.getByRole('button', { name: /verify/i }))

    expect(await screen.findByText('incorrect code')).toBeInTheDocument()
    // Still the normal form, not the terminal "start over" state.
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
    // challenge_id still in sessionStorage so the user can retry
    expect(sessionStorage.getItem(CHALLENGE_SESSION_KEY)).toBe('chal-1')
  })

  it('shows a "start over" link and clears sessionStorage when the challenge is locked', async () => {
    sessionStorage.setItem(CHALLENGE_SESSION_KEY, 'chal-1')
    ;(useSearchParams as jest.Mock).mockReturnValue(paramsWith({ flow: 'signup' }))
    completeOtp.mockRejectedValue(new ApiError('too many incorrect attempts', 400, 'OTP_LOCKED'))
    const user = userEvent.setup()
    render(<VerifyOtpPage />)

    await user.type(screen.getByLabelText(/6-digit code/i), '000000')
    await user.click(screen.getByRole('button', { name: /verify/i }))

    expect(await screen.findByRole('link', { name: /start over/i })).toHaveAttribute('href', '/signup')
    expect(screen.queryByRole('button', { name: /^verify$/i })).not.toBeInTheDocument()
    expect(sessionStorage.getItem(CHALLENGE_SESSION_KEY)).toBeNull()
  })
})
