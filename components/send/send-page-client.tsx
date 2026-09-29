'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, QrCode, ChevronRight, Wallet, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { STELLAR_ASSETS, type CryptoAsset } from '@/lib/assets'
import { RecentRecipients } from './recent-recipients'
import { QRScanner } from './qr-scanner'
import { TransactionConfirmation } from './transaction-confirmation'

type Step = 'recipient' | 'amount' | 'confirm' | 'success'

export type { CryptoAsset }

export interface SendFormState {
  recipient: { address: string; name?: string; avatar?: string } | null
  amount: string
  asset: CryptoAsset
  note: string
}

export const ASSETS: CryptoAsset[] = STELLAR_ASSETS

const NUMPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
]

export function SendPageClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('recipient')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [recipientInput, setRecipientInput] = useState('')
  const [form, setForm] = useState<SendFormState>({
    recipient: null,
    amount: '',
    asset: ASSETS[0],
    note: '',
  })

  const steps: Step[] = ['recipient', 'amount', 'confirm']
  const currentStepIdx = steps.indexOf(step)

  const handleBack = () => {
    if (step === 'recipient') {
      router.back()
    } else if (step === 'amount') {
      setStep('recipient')
    } else if (step === 'confirm') {
      setStep('amount')
    } else {
      router.push('/dashboard')
    }
  }

  const handleRecipientSelect = (address: string, name?: string, avatar?: string) => {
    setRecipientInput(address)
    setForm((prev) => ({ ...prev, recipient: { address, name, avatar } }))
  }

  const handleContinueRecipient = () => {
    if (!recipientInput.trim()) return
    setForm((prev) => ({
      ...prev,
      recipient:
        prev.recipient?.address === recipientInput ? prev.recipient : { address: recipientInput },
    }))
    setStep('amount')
  }

  const handleNumpad = (key: string) => {
    if (key === '⌫') {
      setForm((prev) => ({ ...prev, amount: prev.amount.slice(0, -1) }))
      return
    }
    if (key === '.' && form.amount.includes('.')) return
    if (key === '.' && form.amount === '') {
      setForm((prev) => ({ ...prev, amount: '0.' }))
      return
    }
    const parts = form.amount.split('.')
    if (parts[1]?.length >= 6) return
    if (form.amount === '0' && key !== '.') {
      setForm((prev) => ({ ...prev, amount: key }))
      return
    }
    setForm((prev) => ({ ...prev, amount: prev.amount + key }))
  }

  const handleSend = async () => {
    setIsSending(true)
    await new Promise((resolve) => setTimeout(resolve, 2200))
    setIsSending(false)
    setStep('success')
  }

  const isRecipientValid = recipientInput.trim().length > 5
  const isAmountValid = parseFloat(form.amount) > 0

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col relative">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 px-5 pt-6 pb-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base font-semibold tracking-tight">
            {step === 'recipient' && 'Send to'}
            {step === 'amount' && 'Enter amount'}
            {step === 'confirm' && 'Confirm send'}
            {step === 'success' && 'Sent!'}
          </h1>

          {/* Progress dots */}
          {step !== 'success' && (
            <div className="ml-auto flex items-center gap-1.5">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i <= currentStepIdx ? 'bg-emerald-500 w-5' : 'bg-muted w-3'
                  )}
                />
              ))}
            </div>
          )}
        </header>

        {/* ── Recipient Step ── */}
        {step === 'recipient' && (
          <div className="flex flex-col flex-1 px-5 gap-5 pb-8">
            {/* Address input */}
            <div className="space-y-2">
              <label
                htmlFor="recipient-address"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Wallet address or username
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Wallet className="w-4 h-4" />
                </div>
                <Input
                  id="recipient-address"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="G... or @username"
                  className="pl-9 pr-12 font-mono text-sm h-12 bg-muted/40 border-border/60 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                />
                <button
                  onClick={() => setScannerOpen(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-500 transition-colors"
                  title="Scan QR code"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>
              {recipientInput && !isRecipientValid && (
                <p className="text-xs text-muted-foreground">
                  Enter a valid Stellar address (starts with G)
                </p>
              )}
            </div>

            {/* Recent recipients */}
            <RecentRecipients onSelect={handleRecipientSelect} />

            {/* CTA */}
            <div className="mt-auto">
              <Button
                onClick={handleContinueRecipient}
                disabled={!isRecipientValid}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-40 transition-all"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Amount Step ── */}
        {step === 'amount' && (
          <div className="flex flex-col flex-1 px-5 pb-6 gap-4 min-h-0">
            {/* Recipient pill */}
            <button
              onClick={() => setStep('recipient')}
              className="flex items-center gap-2.5 w-fit px-3 py-2 rounded-full bg-muted/50 border border-border/50 hover:border-emerald-500/40 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-500 text-xs font-bold">
                  {form.recipient?.name?.[0]?.toUpperCase() ??
                    form.recipient?.address?.[0]?.toUpperCase() ??
                    'G'}
                </span>
              </div>
              <span className="text-sm font-medium truncate max-w-[160px]">
                {form.recipient?.name ??
                  `${form.recipient?.address?.slice(0, 8)}...${form.recipient?.address?.slice(-4)}`}
              </span>
            </button>

            {/* Amount display */}
            <div className="flex flex-col items-center justify-center py-6 gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight tabular-nums">
                  {form.amount || '0'}
                </span>
                <span className="text-lg font-medium text-muted-foreground">
                  {form.asset.symbol}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Balance: {form.asset.balance} {form.asset.symbol}
              </p>
            </div>

            {/* Asset selector */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ASSETS.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => setForm((prev) => ({ ...prev, asset }))}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors',
                    form.asset.symbol === asset.symbol
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-border/50 bg-muted/40 hover:border-border'
                  )}
                >
                  <span className={cn('text-base', asset.color)}>{asset.icon}</span>
                  {asset.symbol}
                </button>
              ))}
            </div>

            {/* Note input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <StickyNote className="w-4 h-4" />
              </div>
              <Input
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Add a note (optional)"
                className="pl-9 h-11 bg-muted/40 border-border/60"
              />
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 mt-auto">
              {NUMPAD_KEYS.flat().map((key) => (
                <button
                  key={key}
                  onClick={() => handleNumpad(key)}
                  className="h-14 rounded-xl bg-muted/40 hover:bg-muted text-xl font-semibold transition-colors active:scale-95"
                >
                  {key}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setStep('confirm')}
              disabled={!isAmountValid}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-40 transition-all"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ── Confirm Step ── */}
        {step === 'confirm' && (
          <TransactionConfirmation
            recipient={form.recipient}
            amount={form.amount}
            asset={form.asset}
            note={form.note}
            isSending={isSending}
            onConfirm={handleSend}
            onBack={() => setStep('amount')}
          />
        )}

        {/* ── Success Step ── */}
        {step === 'success' && (
          <div className="flex flex-col flex-1 items-center justify-center px-5 gap-4 pb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-500 text-3xl">✓</span>
            </div>
            <h2 className="text-xl font-semibold">Transaction sent</h2>
            <p className="text-sm text-muted-foreground text-center">
              {form.amount} {form.asset.symbol} sent successfully
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold mt-4"
            >
              Back to dashboard
            </Button>
          </div>
        )}

        {/* QR Scanner */}
        {scannerOpen && (
          <QRScanner
            onClose={() => setScannerOpen(false)}
            onScan={(address) => {
              setScannerOpen(false)
              handleRecipientSelect(address)
            }}
          />
        )}
      </div>
    </div>
  )
}
