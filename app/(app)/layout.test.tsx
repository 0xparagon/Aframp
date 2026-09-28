import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import AppLayout from './layout'
import { useSession } from '@/components/session-provider'
import { useRouter } from 'next/navigation'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('AppLayout', () => {
  it('redirects to /login exactly once when ready becomes true and no session exists', () => {
    const replace = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ replace })
    ;(useSession as jest.Mock).mockReturnValue({ session: null, ready: false })

    const { rerender } = render(<AppLayout>content</AppLayout>)

    ;(useSession as jest.Mock).mockReturnValue({ session: null, ready: true })
    rerender(<AppLayout>content</AppLayout>)

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/login')
  })
})
