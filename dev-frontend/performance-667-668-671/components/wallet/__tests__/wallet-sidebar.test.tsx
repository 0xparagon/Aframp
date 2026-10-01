import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { WalletSidebar } from '../wallet-sidebar'

const renderCount = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ replace: jest.fn() }),
}))

jest.mock('@/components/session-provider', () => ({
  useSession: () => ({ signOut: jest.fn() }),
}))

jest.mock('@/components/brand/aframp-mark', () => ({
  AframpMark: () => {
    renderCount()
    return <span data-testid="aframp-mark" />
  },
}))

function ParentHarness() {
  const [, forceParentRender] = useState(0)

  return (
    <>
      <button type="button" onClick={() => forceParentRender((value) => value + 1)}>
        Simulate layout rerender
      </button>
      <WalletSidebar />
    </>
  )
}

describe('WalletSidebar memoization', () => {
  beforeEach(() => {
    renderCount.mockClear()
  })

  it('skips an unchanged parent/layout rerender', () => {
    render(<ParentHarness />)

    expect(renderCount).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Simulate layout rerender' }))

    expect(renderCount).toHaveBeenCalledTimes(1)
  })
})
