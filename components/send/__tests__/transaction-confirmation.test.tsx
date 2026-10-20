import { render, screen, fireEvent } from '@testing-library/react'
import { TransactionConfirmation } from '../transaction-confirmation'
import type { SendFormState, CryptoAsset } from '../send-page-client'

const mockAsset: CryptoAsset = {
  symbol: 'XLM',
  name: 'Stellar Lumens',
  balance: '1000.00',
  icon: '✦',
  color: 'text-sky-400',
}

const mockForm: SendFormState = {
  recipient: { address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', name: 'Alice' },
  amount: '100',
  asset: mockAsset,
  note: 'Test payment',
}

describe('TransactionConfirmation', () => {
  describe('confirm step', () => {
    it('renders confirm view with form details', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="confirm"
          isSending={false}
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
        />
      )

      expect(screen.getByText('100 XLM')).toBeInTheDocument()
      expect(screen.getByText('Stellar Lumens')).toBeInTheDocument()
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
      expect(screen.getByText(/Test payment/)).toBeInTheDocument()
    })

    it('shows loading state while sending', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="confirm"
          isSending={true}
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
        />
      )

      expect(screen.getByText('Sending...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled()
    })

    it('displays error alert when error prop is provided', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="confirm"
          isSending={false}
          error="Insufficient balance"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
        />
      )

      expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
    })

    it('calls onConfirm when button is clicked', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="confirm"
          isSending={false}
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Confirm send/i }))
      expect(mockOnConfirm).toHaveBeenCalled()
    })

    it('calls onBack when back button is clicked', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="confirm"
          isSending={false}
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Back/i }))
      expect(mockOnBack).toHaveBeenCalled()
    })
  })

  describe('success step', () => {
    it('renders success view with checkmark', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="success"
          isSending={false}
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
        />
      )

      expect(screen.getByText('Sent successfully')).toBeInTheDocument()
      expect(screen.getByText(/100 XLM was sent to Alice/)).toBeInTheDocument()
    })

    it('calls onDone when done button is clicked', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="success"
          isSending={false}
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Back to dashboard/i }))
      expect(mockOnDone).toHaveBeenCalled()
    })
  })

  describe('failure step', () => {
    it('renders failure view with error message', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="failure"
          isSending={false}
          error="Network error"
          failureReason="Connection timeout"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByText('Send failed')).toBeInTheDocument()
      expect(screen.getByText('Connection timeout')).toBeInTheDocument()
    })

    it('displays form details in failure view', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="failure"
          isSending={false}
          error="Send failed"
          failureReason="Insufficient funds in destination account"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByText('100 XLM')).toBeInTheDocument()
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
      expect(screen.getByText('Insufficient funds in destination account')).toBeInTheDocument()
    })

    it('displays failure_reason preferentially over error message', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="failure"
          isSending={false}
          error="Generic error"
          failureReason="Specific failure reason"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByText('Specific failure reason')).toBeInTheDocument()
      expect(screen.queryByText('Generic error')).not.toBeInTheDocument()
    })

    it('calls onRetry when retry button is clicked', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="failure"
          isSending={false}
          error="Send failed"
          failureReason="Network error"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
          onRetry={mockOnRetry}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Retry/i }))
      expect(mockOnRetry).toHaveBeenCalled()
    })

    it('calls onBack when change details button is clicked', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="failure"
          isSending={false}
          error="Send failed"
          failureReason="Network error"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
          onRetry={mockOnRetry}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Change details/i }))
      expect(mockOnBack).toHaveBeenCalled()
    })

    it('does not show recipient name when not provided', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()
      const mockOnRetry = jest.fn()

      const formWithoutName: SendFormState = {
        ...mockForm,
        recipient: { address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
      }

      render(
        <TransactionConfirmation
          form={formWithoutName}
          step="failure"
          isSending={false}
          error="Send failed"
          failureReason="Network error"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByText(/GXXXXXXX/)).toBeInTheDocument()
    })

    it('displays memo in failure details when present', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <TransactionConfirmation
          form={mockForm}
          step="failure"
          isSending={false}
          error="Send failed"
          failureReason="Network error"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByText('Note: Test payment')).toBeInTheDocument()
    })

    it('hides memo when not provided', () => {
      const mockOnConfirm = jest.fn()
      const mockOnBack = jest.fn()
      const mockOnDone = jest.fn()
      const mockOnRetry = jest.fn()

      const formWithoutNote: SendFormState = {
        ...mockForm,
        note: '',
      }

      render(
        <TransactionConfirmation
          form={formWithoutNote}
          step="failure"
          isSending={false}
          error="Send failed"
          failureReason="Network error"
          onBack={mockOnBack}
          onConfirm={mockOnConfirm}
          onDone={mockOnDone}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.queryByText(/Note:/)).not.toBeInTheDocument()
    })
  })
})
