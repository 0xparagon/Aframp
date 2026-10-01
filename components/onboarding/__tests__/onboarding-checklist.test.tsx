/**
 * OnboardingChecklist — completion logic tests
 *
 * What drives each step:
 *   - All four steps (wallet, charge, payment, cashout) are driven by the
 *     'aframp-merchant-checklist' key in localStorage.
 *   - The entire checklist is hidden when sessionStorage contains a
 *     'walletAddress' value (set by walletSession.setAddress()).
 *   - The entire checklist is also hidden when all four steps are complete
 *     in localStorage.
 *   - Clicking a step link calls markStepComplete, which writes the updated
 *     object back to localStorage and triggers a re-render showing that step
 *     as done.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OnboardingChecklist } from '../onboarding-checklist'

// ── Storage helpers ───────────────────────────────────────────────────────────

const CHECKLIST_KEY = 'aframp-merchant-checklist'
const WALLET_SESSION_KEY = 'walletAddress' // sessionStorage key used by walletSession

function setChecklist(overrides: Partial<Record<'wallet' | 'charge' | 'payment' | 'cashout', boolean>>) {
  const base = { wallet: false, charge: false, payment: false, cashout: false }
  window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify({ ...base, ...overrides }))
}

function setWalletInSession(address: string) {
  window.sessionStorage.setItem(WALLET_SESSION_KEY, address)
}

const FAKE_ADDRESS = 'GAXYZABC123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEFG'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

// ── Visibility ────────────────────────────────────────────────────────────────

describe('checklist visibility', () => {
  it('renders the checklist when no wallet exists and no steps are complete', () => {
    render(<OnboardingChecklist />)
    expect(screen.getByText('Get started with your first Aframp wallet')).toBeInTheDocument()
  })

  it('hides the checklist when a wallet address is present in sessionStorage', () => {
    setWalletInSession(FAKE_ADDRESS)
    render(<OnboardingChecklist />)
    expect(screen.queryByText('Get started with your first Aframp wallet')).not.toBeInTheDocument()
  })

  it('does NOT hide the checklist when walletAddress is only in localStorage (not sessionStorage)', () => {
    // The component exclusively uses walletSession (sessionStorage) — the
    // old localStorage.walletAddress fallback has been removed as a bug fix.
    window.localStorage.setItem(WALLET_SESSION_KEY, FAKE_ADDRESS)
    render(<OnboardingChecklist />)
    expect(screen.getByText('Get started with your first Aframp wallet')).toBeInTheDocument()
  })

  it('hides the checklist when all four steps are marked complete in localStorage', () => {
    setChecklist({ wallet: true, charge: true, payment: true, cashout: true })
    render(<OnboardingChecklist />)
    expect(screen.queryByText('Get started with your first Aframp wallet')).not.toBeInTheDocument()
  })

  it('does not hide the checklist when only some steps are complete', () => {
    setChecklist({ wallet: true, charge: true })
    render(<OnboardingChecklist />)
    expect(screen.getByText('Get started with your first Aframp wallet')).toBeInTheDocument()
  })
})

// ── Individual step completed / pending state ──────────────────────────────────

describe('step completed/pending state', () => {
  it('shows all four steps as pending when localStorage is empty', () => {
    render(<OnboardingChecklist />)

    // Pending steps show a numbered badge (1–4), not a check icon
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
  })

  it('shows the wallet step as completed when checklist.wallet is true', () => {
    setChecklist({ wallet: true })
    render(<OnboardingChecklist />)

    // "wallet" is step index 0 — its number badge should be replaced by a check
    const walletLink = screen.getByRole('link', { name: /create wallet/i })
    expect(walletLink).toHaveTextContent('Done')
    // The other three steps still show numbers
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows the charge step as completed when checklist.charge is true', () => {
    setChecklist({ charge: true })
    render(<OnboardingChecklist />)

    const chargeLink = screen.getByRole('link', { name: /create first charge/i })
    expect(chargeLink).toHaveTextContent('Done')
  })

  it('shows the payment step as completed when checklist.payment is true', () => {
    setChecklist({ payment: true })
    render(<OnboardingChecklist />)

    const paymentLink = screen.getByRole('link', { name: /receive first payment/i })
    expect(paymentLink).toHaveTextContent('Done')
  })

  it('shows the cashout step as completed when checklist.cashout is true', () => {
    setChecklist({ cashout: true })
    render(<OnboardingChecklist />)

    const cashoutLink = screen.getByRole('link', { name: /cash out/i })
    expect(cashoutLink).toHaveTextContent('Done')
  })

  it('shows multiple steps as completed when several flags are true', () => {
    setChecklist({ wallet: true, charge: true })
    render(<OnboardingChecklist />)

    expect(screen.getByRole('link', { name: /create wallet/i })).toHaveTextContent('Done')
    expect(screen.getByRole('link', { name: /create first charge/i })).toHaveTextContent('Done')
    // Remaining two are still pending
    expect(screen.queryAllByText('Done')).toHaveLength(2)
  })
})

// ── Step links ────────────────────────────────────────────────────────────────

describe('step link hrefs', () => {
  it('wallet step links to /wallet-setup', () => {
    render(<OnboardingChecklist />)
    expect(screen.getByRole('link', { name: /create wallet/i })).toHaveAttribute('href', '/wallet-setup')
  })

  it('charge step links to /bills', () => {
    render(<OnboardingChecklist />)
    expect(screen.getByRole('link', { name: /create first charge/i })).toHaveAttribute('href', '/bills')
  })

  it('payment step links to /receive', () => {
    render(<OnboardingChecklist />)
    expect(screen.getByRole('link', { name: /receive first payment/i })).toHaveAttribute('href', '/receive')
  })

  it('cashout step links to /offramp', () => {
    render(<OnboardingChecklist />)
    expect(screen.getByRole('link', { name: /cash out/i })).toHaveAttribute('href', '/offramp')
  })
})

// ── markStepComplete (onClick behaviour) ──────────────────────────────────────

describe('markStepComplete', () => {
  it('marks a pending step as complete when its link is clicked', () => {
    render(<OnboardingChecklist />)

    const walletLink = screen.getByRole('link', { name: /create wallet/i })
    fireEvent.click(walletLink)

    expect(walletLink).toHaveTextContent('Done')
  })

  it('persists the completed state to localStorage on click', () => {
    render(<OnboardingChecklist />)

    fireEvent.click(screen.getByRole('link', { name: /create first charge/i }))

    const stored = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) ?? '{}')
    expect(stored.charge).toBe(true)
    // Other steps remain false
    expect(stored.wallet).toBe(false)
  })

  it('does not revert a previously completed step to pending', () => {
    setChecklist({ payment: true })
    render(<OnboardingChecklist />)

    const paymentLink = screen.getByRole('link', { name: /receive first payment/i })
    fireEvent.click(paymentLink)

    expect(paymentLink).toHaveTextContent('Done')
    const stored = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) ?? '{}')
    expect(stored.payment).toBe(true)
  })

  it('gracefully handles corrupt localStorage by falling back to defaults', () => {
    window.localStorage.setItem(CHECKLIST_KEY, 'not-valid-json{{{')
    // Should not throw; renders with all steps pending
    render(<OnboardingChecklist />)
    expect(screen.getByText('Get started with your first Aframp wallet')).toBeInTheDocument()
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
  })
})
