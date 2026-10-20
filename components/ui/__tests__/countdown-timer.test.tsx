import { act, render, screen } from '@testing-library/react'
import { CountdownTimer } from '../countdown-timer'

const START = new Date('2026-01-01T00:00:00.000Z')

/** A date `seconds` after the frozen clock. */
function at(seconds: number): Date {
  return new Date(START.getTime() + seconds * 1000)
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(START)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('CountdownTimer', () => {
  it('renders the real remaining time on first paint (no 00:00 flash)', () => {
    render(<CountdownTimer expiresAt={at(90)} />)

    expect(screen.getByRole('timer')).toHaveTextContent('01:30')
  })

  it('renders "Expired" when the deadline has already passed', () => {
    render(<CountdownTimer expiresAt={at(-1)} />)

    expect(screen.getByRole('timer')).toHaveTextContent('Expired')
  })

  it('ticks down once per second', () => {
    render(<CountdownTimer expiresAt={at(5)} />)
    expect(screen.getByRole('timer')).toHaveTextContent('00:05')

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('timer')).toHaveTextContent('00:03')
  })

  it('fires onExpire exactly once when it reaches zero', () => {
    const onExpire = jest.fn()
    render(<CountdownTimer expiresAt={at(2)} onExpire={onExpire} />)

    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('timer')).toHaveTextContent('Expired')

    // The interval stops at zero, so further ticks must not re-fire it.
    act(() => {
      jest.advanceTimersByTime(10_000)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('never fires onExpire before the deadline', () => {
    const onExpire = jest.fn()
    render(<CountdownTimer expiresAt={at(5)} onExpire={onExpire} />)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(onExpire).not.toHaveBeenCalled()
  })

  it('uses the newest onExpire callback without restarting the countdown', () => {
    const first = jest.fn()
    const latest = jest.fn()
    const { rerender } = render(<CountdownTimer expiresAt={at(2)} onExpire={first} />)

    rerender(<CountdownTimer expiresAt={at(2)} onExpire={latest} />)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(latest).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it('resets the remaining time when expiresAt changes', () => {
    const { rerender } = render(<CountdownTimer expiresAt={at(5)} />)
    expect(screen.getByRole('timer')).toHaveTextContent('00:05')

    rerender(<CountdownTimer expiresAt={at(30)} />)
    expect(screen.getByRole('timer')).toHaveTextContent('00:30')
  })

  it('tears down its interval on unmount', () => {
    const onExpire = jest.fn()
    const { unmount } = render(<CountdownTimer expiresAt={at(2)} onExpire={onExpire} />)

    unmount()
    act(() => {
      jest.advanceTimersByTime(10_000)
    })

    expect(onExpire).not.toHaveBeenCalled()
  })

  it('announces politely only when under two minutes remain', () => {
    const { rerender } = render(<CountdownTimer expiresAt={at(300)} />)
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off')

    rerender(<CountdownTimer expiresAt={at(60)} />)
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'polite')
  })
})
