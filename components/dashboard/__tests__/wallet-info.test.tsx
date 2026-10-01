import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WalletInfo } from '../wallet-info'

const getMeMock = vi.fn()

vi.mock('@/lib/api', () => ({
  getMe: (...args: unknown[]) => getMeMock(...args),
}))

describe('WalletInfo verification badge', () => {
  beforeEach(() => {
    getMeMock.mockReset()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not render the verification badge when kyc_status is not approved', async () => {
    getMeMock.mockResolvedValue({
      id: 'user-1',
      wallet_address: '0x123',
      kyc_status: 'pending',
    })

    render(<WalletInfo />)

    await waitFor(() => expect(getMeMock).toHaveBeenCalled())

    expect(screen.queryByTestId('verified-badge')).not.toBeInTheDocument()
  })

  it('does not render the verification badge when kyc_status is null', async () => {
    getMeMock.mockResolvedValue({
      id: 'user-1',
      wallet_address: '0x123',
      kyc_status: null,
    })

    render(<WalletInfo />)

    await waitFor(() => expect(getMeMock).toHaveBeenCalled())

    expect(screen.queryByTestId('verified-badge')).not.toBeInTheDocument()
  })

  it('ignores a forged localStorage isVerified flag', async () => {
    window.localStorage.setItem('isVerified', 'true')
    getMeMock.mockResolvedValue({
      id: 'user-1',
      wallet_address: '0x123',
      kyc_status: 'pending',
    })

    render(<WalletInfo />)

    await waitFor(() => expect(getMeMock).toHaveBeenCalled())

    expect(screen.queryByTestId('verified-badge')).not.toBeInTheDocument()
  })

  it('renders the verification badge when kyc_status is approved', async () => {
    getMeMock.mockResolvedValue({
      id: 'user-1',
      wallet_address: '0x123',
      kyc_status: 'approved',
    })

    render(<WalletInfo />)

    await waitFor(() =>
      expect(screen.getByTestId('verified-badge')).toBeInTheDocument(),
    )
  })
})
