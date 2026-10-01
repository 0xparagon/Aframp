import { render, screen } from '@testing-library/react'
import AdminLayout from '@/app/(app)/admin/layout'
import { useSession } from '@/components/session-provider'
import { api, ApiError } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getMe: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

describe('AdminLayout', () => {
  const mockSession = {
    token: 'test-token',
    user_id: 'user-123',
    merchant_id: 'merchant-123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({
      session: mockSession,
      ready: true,
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
    })
  })

  it('shows loading spinner while verifying admin access', () => {
    ;(api.getMe as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows error state when API call fails', async () => {
    ;(api.getMe as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    )

    expect(await screen.findByText(/network error/i)).toBeInTheDocument()
  })

  it('shows admin access required when user is not admin', async () => {
    ;(api.getMe as jest.Mock).mockResolvedValue({
      id: 'user-123',
      merchant_id: 'merchant-123',
      is_admin: false,
    })

    render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    )

    expect(await screen.findByText(/admin access required/i)).toBeInTheDocument()
    expect(screen.getByText(/back to your dashboard/i)).toBeInTheDocument()
  })

  it('renders admin content when user is admin', async () => {
    ;(api.getMe as jest.Mock).mockResolvedValue({
      id: 'user-123',
      merchant_id: 'merchant-123',
      is_admin: true,
    })

    render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    )

    await screen.findByText('Admin content')
    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  it('handles network error with specific message', async () => {
    const error = new ApiError('Network error', 0)
    ;(api.getMe as jest.Mock).mockRejectedValue(error)

    render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    )

    expect(await screen.findByText(/can't reach the payment server right now/i)).toBeInTheDocument()
  })
})
