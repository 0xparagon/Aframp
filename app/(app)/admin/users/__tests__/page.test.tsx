import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminUsersPage from '../page'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'admin-token' }),
}))

jest.mock('@/lib/api', () => ({
  api: { adminUsers: jest.fn() },
}))

const mockAdminUsers = api.adminUsers as jest.Mock

const user = (overrides: Record<string, unknown> = {}) => ({
  id: 'u-1',
  name: 'Ada Merchant',
  email: 'ada@example.com',
  is_admin: false,
  merchant_name: 'Ada Stores',
  created_at: '2026-01-02T10:00:00Z',
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AdminUsersPage', () => {
  it('loads users with the admin token and renders them', async () => {
    mockAdminUsers.mockResolvedValue([
      user(),
      user({
        id: 'u-2',
        name: 'Root',
        email: 'root@example.com',
        is_admin: true,
        merchant_name: null,
      }),
    ])

    render(<AdminUsersPage />)

    expect(await screen.findByText('Ada Merchant')).toBeInTheDocument()
    expect(mockAdminUsers).toHaveBeenCalledWith('admin-token', 100, expect.anything())
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('Ada Stores')).toBeInTheDocument()
    // One 'Admin' is the column header, the other is Root's badge.
    expect(screen.getAllByText('Admin')).toHaveLength(2)
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('shows the empty state when there are no users', async () => {
    mockAdminUsers.mockResolvedValue([])
    render(<AdminUsersPage />)
    expect(await screen.findByText('No users yet.')).toBeInTheDocument()
  })

  it('shows the error and retries the load', async () => {
    mockAdminUsers.mockRejectedValueOnce(new Error('boom')).mockResolvedValue([user()])
    render(<AdminUsersPage />)

    expect(await screen.findByText('boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again|retry/i }))

    expect(await screen.findByText('Ada Merchant')).toBeInTheDocument()
    expect(mockAdminUsers).toHaveBeenCalledTimes(2)
  })

  it('falls back to a generic message for non-Error failures', async () => {
    mockAdminUsers.mockRejectedValue('nope')
    render(<AdminUsersPage />)
    expect(await screen.findByText('Could not load users')).toBeInTheDocument()
  })
})
