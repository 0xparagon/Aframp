import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from './page'
import { useAuthenticatedSession, useSession } from '@/components/session-provider'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(),
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getMe: jest.fn(),
    updateProfile: jest.fn(),
    changeEmail: jest.fn(),
    deleteAccount: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
    }
  },
}))

// Mock the PushNotificationToggle component
jest.mock('@/components/push-notification-toggle', () => ({
  PushNotificationToggle: () => <div>Push Notification Toggle</div>,
}))

describe('ProfilePage - Account deletion confirmation', () => {
  const mockToken = 'test-token'
  const mockMe = {
    user_id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    is_admin: false,
    created_at: '2024-01-01T00:00:00Z',
    merchant_id: 'merchant-1',
    merchant_name: 'Test Merchant',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuthenticatedSession as jest.Mock).mockReturnValue({
      token: mockToken,
    })
    ;(useSession as jest.Mock).mockReturnValue({
      signOut: jest.fn(),
      refreshMe: jest.fn(),
      me: mockMe,
    })
    ;(useRouter as jest.Mock).mockReturnValue({
      replace: jest.fn(),
    })
    ;(api.getMe as jest.Mock).mockResolvedValue(mockMe)
  })

  it('requires email confirmation before calling deleteAccount API', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    // Verify the confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    // The confirmation button should be disabled without entering email
    const confirmButton = screen.getByRole('button', { name: /yes, delete my account/i })
    expect(confirmButton).toBeDisabled()

    // Verify API is not called yet
    expect(api.deleteAccount).not.toHaveBeenCalled()
  })

  it('only enables delete button after email matches exactly', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /yes, delete my account/i })
    const emailInput = screen.getByPlaceholderText(mockMe.email)

    // Button should be disabled initially
    expect(confirmButton).toBeDisabled()

    // Type incorrect email
    await user.type(emailInput, 'wrong@example.com')
    expect(confirmButton).toBeDisabled()

    // Clear and type correct email
    await user.clear(emailInput)
    await user.type(emailInput, mockMe.email)
    expect(confirmButton).toBeEnabled()
  })

  it('does not call API without correct email confirmation', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    const emailInput = screen.getByPlaceholderText(mockMe.email)

    // Type incorrect email
    await user.type(emailInput, 'wrong@example.com')

    // The button is disabled, so clicking won't do anything
    // But let's verify the API wasn't called
    expect(api.deleteAccount).not.toHaveBeenCalled()
  })

  it('calls deleteAccount API only after correct email confirmation', async () => {
    const user = userEvent.setup()
    const mockSignOut = jest.fn()
    const mockReplace = jest.fn()
    
    ;(useSession as jest.Mock).mockReturnValue({
      signOut: mockSignOut,
      refreshMe: jest.fn(),
      me: mockMe,
    })
    ;(useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    })
    ;(api.deleteAccount as jest.Mock).mockResolvedValue({ message: 'Account deleted' })

    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /yes, delete my account/i })
    const emailInput = screen.getByPlaceholderText(mockMe.email)

    // Type correct email
    await user.type(emailInput, mockMe.email)
    expect(confirmButton).toBeEnabled()

    // Click confirm
    await user.click(confirmButton)

    // Verify API was called
    await waitFor(() => {
      expect(api.deleteAccount).toHaveBeenCalledWith(mockToken)
    })

    // Verify user is signed out and redirected
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })

  it('allows canceling without calling the API', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    // Click cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByText(/delete your account\?/i)).not.toBeInTheDocument()
    })

    // Verify API was not called
    expect(api.deleteAccount).not.toHaveBeenCalled()
  })

  it('shows clear warning about irreversibility', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    // Verify warning messages are present
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
    expect(
      screen.getByText(/permanently delete your merchant account/i)
    ).toBeInTheDocument()
  })

  it('prompts user to type their specific email address', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    // Verify the prompt shows their actual email
    expect(screen.getByText(new RegExp(mockMe.email))).toBeInTheDocument()
    expect(screen.getByPlaceholderText(mockMe.email)).toBeInTheDocument()
  })
})
