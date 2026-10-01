import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BalanceFigureSkeleton } from '../balance-figure-skeleton'

describe('BalanceFigureSkeleton', () => {
  it('renders large skeleton by default', () => {
    const { container } = render(<BalanceFigureSkeleton />)
    
    const skeleton = container.querySelector('.h-10')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('w-48')
  })

  it('renders small skeleton when size is sm', () => {
    const { container } = render(<BalanceFigureSkeleton size="sm" />)
    
    const skeleton = container.querySelector('.h-7')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('w-32')
  })

  it('renders large skeleton when size is lg', () => {
    const { container } = render(<BalanceFigureSkeleton size="lg" />)
    
    const skeleton = container.querySelector('.h-10')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('w-48')
  })

  it('matches snapshot for large size', () => {
    const { container } = render(<BalanceFigureSkeleton size="lg" />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot for small size', () => {
    const { container } = render(<BalanceFigureSkeleton size="sm" />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
