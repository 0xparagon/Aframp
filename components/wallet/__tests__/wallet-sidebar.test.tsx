import { render, screen } from '@testing-library/react'
import { WalletSidebar } from '@/components/wallet/wallet-sidebar'
import { useSession } from '@/components/session-provider'
import { usePathname, useRouter } from 'next/navigation'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

describe('WalletSidebar', () => {
  const signOut = jest.fn()
  const replace = jest.fn()

  beforeEach(() => {
    signOut.mockReset()
    replace.mockReset()
    ;(useRouter as jest.Mock).mockReturnValue({ replace })
    ;(useSession as jest.Mock).mockReturnValue({
      session: { token: 't', user_id: 'u', merchant_id: 'm' },
      ready: true,
      signOut,
      signIn: jest.fn(),
      signUp: jest.fn(),
    })
  })

  it('highlights Home nav item when on home route', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/home')
    render(<WalletSidebar />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('highlights Cash Out nav item when on withdraw route', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/withdraw')
    render(<WalletSidebar />)

    const cashOutLink = screen.getByRole('link', { name: /cash out/i })
    expect(cashOutLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('highlights Send nav item when on send route', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/send')
    render(<WalletSidebar />)

    const sendLink = screen.getByRole('link', { name: /send money/i })
    expect(sendLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('highlights Transactions nav item when on transactions route', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/transactions')
    render(<WalletSidebar />)

    const transactionsLink = screen.getByRole('link', { name: /payments/i })
    expect(transactionsLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('highlights nav item when on nested route', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/transactions/details')
    render(<WalletSidebar />)

    const transactionsLink = screen.getByRole('link', { name: /payments/i })
    expect(transactionsLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('does not highlight inactive nav items', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/home')
    render(<WalletSidebar />)

    const sendLink = screen.getByRole('link', { name: /send money/i })
    expect(sendLink).not.toHaveClass('bg-nav-active', 'font-bold', 'text-white')
    expect(sendLink).toHaveClass('text-dim')
  })
})
