import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RequestPage from '../page'

const POLL_INTERVAL_MS = 3000

const loadMock = jest.fn()

jest.mock('../../../../lib/paymentRequest', () => ({
  load: (...args: unknown[]) => loadMock(...args),
}))

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'req_123' }),
}))

describe('RequestPage polling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    loadMock.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('stops polling after 3 consecutive network errors and shows a retry button', async () => {
    loadMock.mockResolvedValue(null)

    render(<RequestPage />)

    // Initial load fails.
    await act(async () => {
      await Promise.resolve()
    })

    // Two more scheduled polls fail, reaching the 3-error threshold.
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS)
      await Promise.resolve()
    })
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS)
      await Promise.resolve()
    })

    expect(loadMock).toHaveBeenCalledTimes(3)

    // Polling must have stopped: no further calls even after more intervals.
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 5)
      await Promise.resolve()
    })
    expect(loadMock).toHaveBeenCalledTimes(3)

    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('resets the error counter after a successful load', async () => {
    loadMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValue(null)

    render(<RequestPage />)

    await act(async () => {
      await Promise.resolve()
    })
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS)
      await Promise.resolve()
    })
    // Successful load resets the counter.
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS)
      await Promise.resolve()
    })

    // A single subsequent failure must not stop polling.
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS)
      await Promise.resolve()
    })

    expect(loadMock).toHaveBeenCalledTimes(4)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('stops polling once the request is paid', async () => {
    loadMock
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'paid' })

    render(<RequestPage />)

    await act(async () => {
      await Promise.resolve()
    })
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS)
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 5)
      await Promise.resolve()
    })

    expect(loadMock).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument())
  })
})
