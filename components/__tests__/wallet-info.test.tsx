/**
 * WalletInfo — merged component tests
 *
 * Covers:
 *   - loading skeleton renders without throwing
 *   - wallet name and shortened address are shown
 *   - active prop shows/hides the verified badge
 *   - copy button copies full address to clipboard and shows feedback
 *   - explorer link points to the correct network URL
 *   - NEXT_PUBLIC_STELLAR_NETWORK=MAINNET produces a mainnet explorer URL
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WalletInfo } from '../wallet-info'

// ── Clipboard mock ────────────────────────────────────────────────────────────

const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FULL_ADDRESS = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGFWF5OTLYQDYHVSFLJXTOS'
const SHORT_ADDRESS = 'GCEZWK…XTOS'

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('renders a skeleton and no wallet name when loading=true', () => {
    render(
      <WalletInfo walletName="My Wallet" walletAddress={FULL_ADDRESS} loading />
    )
    expect(screen.queryByText('My Wallet')).not.toBeInTheDocument()
    // Skeletons are rendered as divs with a skeleton class; at minimum the
    // component should not throw and should render something.
    expect(document.querySelector('.animate-pulse, [data-slot="skeleton"]')).not.toBeNull()
  })
})

// ── Default (loaded) state ────────────────────────────────────────────────────

describe('loaded state', () => {
  it('displays the wallet name', () => {
    render(<WalletInfo walletName="Aframp Wallet" walletAddress={FULL_ADDRESS} />)
    expect(screen.getByRole('heading', { name: 'Aframp Wallet' })).toBeInTheDocument()
  })

  it('displays a shortened form of the address', () => {
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} />)
    expect(screen.getByText(SHORT_ADDRESS)).toBeInTheDocument()
  })

  it('does not shorten addresses that are already 12 chars or fewer', () => {
    render(<WalletInfo walletName="W" walletAddress="GSHORTADDR" />)
    expect(screen.getByText('GSHORTADDR')).toBeInTheDocument()
  })
})

// ── active prop ───────────────────────────────────────────────────────────────

describe('active prop', () => {
  it('shows the verified badge when active=true', () => {
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} active />)
    expect(screen.getByLabelText('Has received payments')).toBeInTheDocument()
  })

  it('hides the verified badge when active=false (default)', () => {
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} />)
    expect(screen.queryByLabelText('Has received payments')).not.toBeInTheDocument()
  })
})

// ── Copy button ───────────────────────────────────────────────────────────────

describe('copy button', () => {
  it('copies the full address (not the shortened form) to clipboard', async () => {
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} />)

    await userEvent.click(screen.getByRole('button', { name: /copy address/i }))

    expect(writeText).toHaveBeenCalledWith(FULL_ADDRESS)
  })

  it('updates the aria-label to "Address copied" after copying', async () => {
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} />)

    await userEvent.click(screen.getByRole('button', { name: /copy address/i }))

    expect(screen.getByRole('button', { name: /address copied/i })).toBeInTheDocument()
  })

  it('resets the aria-label back to "Copy address" after 2 s', async () => {
    vi.useFakeTimers()
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} />)

    await userEvent.click(screen.getByRole('button', { name: /copy address/i }))
    expect(screen.getByRole('button', { name: /address copied/i })).toBeInTheDocument()

    vi.advanceTimersByTime(2000)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /copy address/i })).toBeInTheDocument()
    )
    vi.useRealTimers()
  })
})

// ── Explorer link ─────────────────────────────────────────────────────────────

describe('explorer link', () => {
  it('links to the testnet explorer when NEXT_PUBLIC_STELLAR_NETWORK is unset', () => {
    // Default env in tests is undefined → falls back to TESTNET
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} />)

    const link = screen.getByRole('link', { name: /view on explorer/i })
    expect(link).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/testnet/account/${FULL_ADDRESS}`
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('links to the mainnet explorer when NEXT_PUBLIC_STELLAR_NETWORK=MAINNET', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'MAINNET'
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} />)

    expect(screen.getByRole('link', { name: /view on explorer/i })).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/public/account/${FULL_ADDRESS}`
    )
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
  })

  it('links to the testnet explorer when NEXT_PUBLIC_STELLAR_NETWORK=TESTNET', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'TESTNET'
    render(<WalletInfo walletName="W" walletAddress={FULL_ADDRESS} />)

    expect(screen.getByRole('link', { name: /view on explorer/i })).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/testnet/account/${FULL_ADDRESS}`
    )
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
  })
})
