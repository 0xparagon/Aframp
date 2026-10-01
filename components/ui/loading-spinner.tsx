import React from 'react'

interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className = '' }: LoadingSpinnerProps) {
  return (
    <div
      data-testid="loading-spinner"
      className={`h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
