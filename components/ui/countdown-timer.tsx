'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CountdownTimerProps {
  /** The moment the countdown runs out. */
  expiresAt: Date
  /** Called once, when the timer first reaches zero. */
  onExpire?: () => void
}

/** Whole seconds left until `target`, floored and clamped at zero. */
function secondsUntil(target: Date): number {
  return Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000))
}

/**
 * The single "time left" component for the app (see #679).
 *
 * This replaces the two divergent copies that used to live at
 * `components/countdown-timer.tsx` and `components/onramp/countdown-timer.tsx`.
 * The implementation is the more robust of the two:
 *
 * - the remaining time is seeded on first render, so the component never
 *   flashes "00:00" before the first tick corrects it;
 * - `onExpire` is held in a ref, so a caller passing an inline arrow does not
 *   tear down and rebuild the interval on every render;
 * - the interval clears itself as soon as it hits zero, so `onExpire` fires
 *   exactly once instead of on every subsequent tick.
 */
export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt))

  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    setRemaining(secondsUntil(expiresAt))
    const timer = setInterval(() => {
      const next = secondsUntil(expiresAt)
      setRemaining(next)
      if (next === 0) {
        clearInterval(timer) // stop, rather than firing onExpire every second
        onExpireRef.current?.()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  const expired = remaining === 0
  const urgent = !expired && remaining < 120

  return (
    <div
      role="timer"
      aria-live={urgent ? 'polite' : 'off'}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
        expired
          ? 'bg-destructive/10 text-destructive'
          : urgent
            ? 'bg-accent/15 text-accent-foreground'
            : 'bg-muted text-muted-foreground'
      )}
    >
      <Clock className="size-4" aria-hidden />
      {expired ? (
        <span>Expired</span>
      ) : (
        <span>
          Expires in{' '}
          <span className="tabular-nums">
            {String(Math.floor(remaining / 60)).padStart(2, '0')}:
            {String(remaining % 60).padStart(2, '0')}
          </span>
        </span>
      )}
    </div>
  )
}
