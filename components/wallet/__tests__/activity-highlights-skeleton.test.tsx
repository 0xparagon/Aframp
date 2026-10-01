import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ActivityHighlightsSkeleton } from '../activity-highlights-skeleton'

describe('ActivityHighlightsSkeleton', () => {
  it('renders the section header', () => {
    render(<ActivityHighlightsSkeleton />)
    
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Activity highlights')).toBeInTheDocument()
  })

  it('renders skeleton rows for statistics', () => {
    const { container } = render(<ActivityHighlightsSkeleton />)
    
    // Should have multiple skeleton elements
    const skeletons = container.querySelectorAll('.bg-muted\\/40, .bg-muted\\/30')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('matches snapshot', () => {
    const { container } = render(<ActivityHighlightsSkeleton />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
