import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HomePageSkeleton } from '../home-page-skeleton'

describe('HomePageSkeleton', () => {
  it('renders the page structure with skeleton placeholders', () => {
    render(<HomePageSkeleton />)
    
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Track balances and payment activity in one place.')).toBeInTheDocument()
  })

  it('renders balance section skeletons', () => {
    const { container } = render(<HomePageSkeleton />)
    
    expect(screen.getByText('Available to cash out')).toBeInTheDocument()
    
    // Should have skeleton elements
    const skeletons = container.querySelectorAll('.bg-muted\\/40, .bg-muted\\/30')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders activity highlights skeleton', () => {
    render(<HomePageSkeleton />)
    
    expect(screen.getByText('Activity highlights')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('renders quick convert section skeleton', () => {
    render(<HomePageSkeleton />)
    
    expect(screen.getByText('Waiting to be paid')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(<HomePageSkeleton />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
