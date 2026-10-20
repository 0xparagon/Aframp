import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import SettingsLayout from '../layout'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

describe('SettingsLayout', () => {
  it('renders the settings nav around its children', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/settings')
    render(
      <SettingsLayout>
        <p>Profile form</p>
      </SettingsLayout>
    )

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Profile form')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('link', { name: 'API Keys' })).toHaveAttribute(
      'href',
      '/settings/api-keys'
    )
  })

  it('marks the link for the current route as the active page', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/settings/api-keys')
    render(
      <SettingsLayout>
        <p>Keys</p>
      </SettingsLayout>
    )

    expect(screen.getByRole('link', { name: 'API Keys' })).toHaveAttribute('aria-current', 'page')
    // Profile's href '/settings' is a parent of the current path, so it is
    // highlighted too.
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page')
  })

  it('leaves links inactive on unrelated routes', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/home')
    render(
      <SettingsLayout>
        <p>Other</p>
      </SettingsLayout>
    )

    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'API Keys' })).not.toHaveAttribute('aria-current')
  })
})
