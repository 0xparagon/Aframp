import type { PaymentRequestStatus, PaymentStatus, WithdrawalStatus } from './payments'
import { request, type UUID } from './shared'

/** Platform-wide, not merchant-scoped — every `admin/*` call requires `Me.is_admin`. */
export interface AssetTotal {
  asset: string
  available: bigint
  pending: bigint
}

export interface StatusCount {
  status: string
  count: number
}

export interface AdminOverview {
  total_users: number
  total_merchants: number
  total_wallets: number
  balances_by_asset: AssetTotal[]
  payments_by_status: StatusCount[]
  withdrawals_by_status: StatusCount[]
  payment_requests_by_status: StatusCount[]
}

export interface AdminUserRow {
  id: UUID
  email: string
  name: string
  is_admin: boolean
  created_at: string
  merchant_id: UUID | null
  merchant_name: string | null
}

export interface AdminMerchantRow {
  id: UUID
  name: string
  owner_user_id: UUID
  owner_email: string
  created_at: string
  wallet_address: string | null
}

export interface AdminWalletRow {
  id: UUID
  merchant_id: UUID
  merchant_name: string
  address: string
  network: string
  created_at: string
}

export interface AdminTransactionRow {
  id: UUID
  merchant_id: UUID
  merchant_name: string
  wallet_address: string
  tx_hash: string
  amount_stroops: bigint
  asset: string
  network: string
  status: PaymentStatus
  confirmations: number
  created_at: string
  updated_at: string
}

export interface AdminWithdrawalRow {
  id: UUID
  merchant_id: UUID
  merchant_name: string
  amount_stroops: bigint
  asset: string
  status: WithdrawalStatus
  provider: string | null
  provider_reference: string | null
  bank_code: string | null
  account_number: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface AdminPaymentRequestRow {
  id: UUID
  merchant_id: UUID
  merchant_name: string
  amount_stroops: bigint
  asset: string
  memo: string
  status: PaymentRequestStatus
  payment_id: UUID | null
  expires_at: string
  created_at: string
  updated_at: string
}

export function adminOverview(token: string, signal?: AbortSignal): Promise<AdminOverview> {
  return request<AdminOverview>('/admin/overview', { token, signal })
}

export function adminUsers(
  token: string,
  limit = 100,
  signal?: AbortSignal
): Promise<AdminUserRow[]> {
  return request<AdminUserRow[]>(`/admin/users?limit=${limit}`, { token, signal })
}

export function adminMerchants(
  token: string,
  limit = 100,
  signal?: AbortSignal
): Promise<AdminMerchantRow[]> {
  return request<AdminMerchantRow[]>(`/admin/merchants?limit=${limit}`, { token, signal })
}

export function adminWallets(
  token: string,
  limit = 100,
  signal?: AbortSignal
): Promise<AdminWalletRow[]> {
  return request<AdminWalletRow[]>(`/admin/wallets?limit=${limit}`, { token, signal })
}

export function adminTransactions(
  token: string,
  limit = 100,
  signal?: AbortSignal
): Promise<AdminTransactionRow[]> {
  return request<AdminTransactionRow[]>(`/admin/transactions?limit=${limit}`, { token, signal })
}

export function adminWithdrawals(
  token: string,
  limit = 100,
  signal?: AbortSignal
): Promise<AdminWithdrawalRow[]> {
  return request<AdminWithdrawalRow[]>(`/admin/withdrawals?limit=${limit}`, { token, signal })
}

export function adminPaymentRequests(
  token: string,
  limit = 100,
  signal?: AbortSignal
): Promise<AdminPaymentRequestRow[]> {
  return request<AdminPaymentRequestRow[]>(`/admin/payment-requests?limit=${limit}`, {
    token,
    signal,
  })
}

export const adminApi = {
  adminOverview,
  adminUsers,
  adminMerchants,
  adminWallets,
  adminTransactions,
  adminWithdrawals,
  adminPaymentRequests,
}
