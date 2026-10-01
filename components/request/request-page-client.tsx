'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, Camera, AlertCircle } from 'lucide-react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { QRScanner } from '@/components/send/qr-scanner'
import { CountdownTimer } from '@/components/countdown-timer'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'

interface RequestPageClientProps {
  requestId: string
  request?: {
    id: string
    amount: number
    currency: string
    asset: string
    description: string
    requesterName: string
    requesterWallet: string
    created_at: string
    expires_at: string
  }
}

// Mock payment request data — in production, fetch from API
const MOCK_REQUEST = {
  id: '123456',
  amount: 100,
  currency: 'USD',
  asset: 'USDC',
  description: 'Payment for consulting services',
  requesterName: 'John Doe',
  requesterWallet: 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH',
  created_at: new Date(Date.now() - 3600000).toISOString(),
  expires_at: new Date(Date.now() + 86400000).toISOString(),
}

export function RequestPageClient({ requestId, request = MOCK_REQUEST }: RequestPageClientProps) {
  const router = useRouter()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [scannedAddress, setScannedAddress] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(new Date(request.expires_at).getTime() <= Date.now())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleCopyWallet = async () => {
    if (isExpired) return
    await navigator.clipboard.writeText(request.requesterWallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleScanPayment = async (address: string) => {
    if (isExpired) return
    setScannedAddress(address)
    setScannerOpen(false)

    // Validate address format (basic Stellar address validation)
    if (!/^G[A-Z0-9]{55}$/.test(address)) {
      setError('Invalid Stellar address format')
      return
    }

    setSubmitting(true)
    setError(null)
    
    try {
      // Backend call to confirm payment after scan
      // TODO: Replace mock with actual API endpoint when backend is ready:
      // await api.confirmScannedPayment(requestId, address)
      
      // Mock success for now - would navigate or show success state
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Success: could navigate to success screen or update UI
      // router.push(`/request/${requestId}/success`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to confirm payment. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const qrValue = `stellar:${request.requesterWallet}?amount=${request.amount}&memo=${requestId}`

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col min-h-screen relative">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold tracking-tight">Payment Request</h1>
        </header>

        <div className="flex flex-col flex-1 px-5 pb-8 gap-5">
          {/* ── Payment amount card ── */}
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Amount requested
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{request.amount}</span>
              <span className="text-lg text-muted-foreground">{request.currency}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              on Stellar network via {request.asset}
            </p>
          </div>

          <CountdownTimer
            expiresAt={new Date(request.expires_at)}
            onExpire={() => setIsExpired(true)}
          />

          {/* ── Request details ── */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Requested by
              </p>
              <p className="text-sm font-semibold text-foreground">{request.requesterName}</p>
            </div>
            {request.description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  Description
                </p>
                <p className="text-sm text-foreground">{request.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Expires
              </p>
              <p className="text-sm text-foreground">
                {new Date(request.expires_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* ── QR Code card ── */}
          <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-border/60 bg-card">
            <div className="relative">
              {isExpired && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-[1px]">
                  <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                    Expired
                  </span>
                </div>
              )}
              <div className="p-4 bg-white rounded-2xl shadow-sm">
                <QRCode
                  value={qrValue}
                  size={200}
                  style={{ display: 'block' }}
                  viewBox="0 0 256 256"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Scan with {request.asset} wallet to pay this request
            </p>
          </div>

          {/* ── Wallet address ── */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Payment address
              </p>
              <p className="font-mono text-xs break-all leading-relaxed text-foreground">
                {request.requesterWallet}
              </p>
            </div>
            <div className="px-4 pb-4 flex gap-2 mt-2">
              <Button
                onClick={handleCopyWallet}
                variant="outline"
                size="sm"
                disabled={isExpired}
                className={cn(
                  'flex-1 h-9 gap-2 transition-all',
                  copied && 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ── Mobile camera button ── */}
          {isMobile && (
            <Button
              onClick={() => setScannerOpen(true)}
              disabled={isExpired || submitting}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex gap-2 disabled:opacity-40"
            >
              <Camera className="w-5 h-5" />
              {submitting ? 'Confirming...' : 'Pay with camera'}
            </Button>
          )}

          {/* ── Error message ── */}
          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Error</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* ── Scanned address confirmation ── */}
          {scannedAddress && !error && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  {submitting ? 'Confirming payment...' : 'Payment confirmed'}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  From: {scannedAddress.slice(0, 10)}...{scannedAddress.slice(-10)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QR Scanner Modal ── */}
      {scannerOpen && (
        <QRScanner onScan={handleScanPayment} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  )
}
