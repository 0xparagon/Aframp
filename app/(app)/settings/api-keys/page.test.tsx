import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApiKeysPage from './page'
import { useAuthenticatedSession } from '@/components/session-provider'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    listApiKeys: jest.fn(),
    createApiKey: jest.fn(),
    revokeApiKey: jest.fn(),
  },
}))

describe('ApiKeysPage - One-time key reveal', () => {
  const mockToken = 'test-token'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuthenticatedSession as jest.Mock).mockReturnValue({
      token: mockToken,
    })
    ;(api.listApiKeys as jest.Mock).mockResolvedValue([])
  })

  it('shows full_key in a modal dialog after creation', async () => {
    const user = userEvent.setup()
    const fullKey = 'ak_live_1234567890abcdef'
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: fullKey,
    })

    render(<ApiKeysPage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Open create dialog
    await user.click(screen.getByRole('button', { name: /new key/i }))

    // Fill in the form
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    // Wait for the reveal dialog to open
    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // Verify the full key is displayed
    expect(screen.getByText(fullKey)).toBeInTheDocument()
  })

  it('disables close button until user checks the acknowledgment checkbox', async () => {
    const user = userEvent.setup()
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: 'ak_live_1234567890abcdef',
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Create a key
    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // The "Done" button should be disabled initially
    const doneButton = screen.getByRole('button', { name: /done/i })
    expect(doneButton).toBeDisabled()

    // Check the acknowledgment checkbox
    const checkbox = screen.getByRole('checkbox', { name: /i have copied my key/i })
    await user.click(checkbox)

    // Now the button should be enabled
    expect(doneButton).toBeEnabled()
  })

  it('does not store full_key after closing the dialog', async () => {
    const user = userEvent.setup()
    const fullKey = 'ak_live_1234567890abcdef'
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: fullKey,
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Create a key
    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // Acknowledge and close
    await user.click(screen.getByRole('checkbox', { name: /i have copied my key/i }))
    await user.click(screen.getByRole('button', { name: /done/i }))

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByText(/save your api key now/i)).not.toBeInTheDocument()
    })

    // The full key should no longer be in the document
    expect(screen.queryByText(fullKey)).not.toBeInTheDocument()
  })

  it('allows copying the key before acknowledging', async () => {
    const user = userEvent.setup()
    const fullKey = 'ak_live_1234567890abcdef'
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: fullKey,
    })

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Create a key
    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // Click the copy button
    await user.click(screen.getByRole('button', { name: /copy api key/i }))

    // Verify clipboard was called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(fullKey)
  })

  it('shows clear warning that key will never be shown again', async () => {
    const user = userEvent.setup()
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: 'ak_live_1234567890abcdef',
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Create a key
    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // Verify warning messages are present
    expect(
      screen.getByText(/this is the only time you'll see the full key/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/once you close this dialog, the key will never be shown again/i)
    ).toBeInTheDocument()
  })
})
