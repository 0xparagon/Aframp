/**
 * Barrel compatibility test for @/lib/api.
 *
 * Verifies that the public API remains accessible through the `lib/api` barrel
 * after splitting into domain modules (Issue #678).
 */

import {
  // Shared
  ApiError,
  BASE_URL,
  BIGINT_KEYS,
  isOffline,
  parseWithBigInts,
  request,
  setUnauthorizedHandler,
  stringifyWithBigInts,
  // Auth domain
  authApi,
  changeEmail,
  deleteAccount,
  getMe,
  getPushSubscriptionStatus,
  login,
  logout,
  registerPushSubscription,
  signup,
  unregisterPushSubscription,
  updateProfile,
  verifyOtp,
  // Payments domain
  createApiKey,
  createOzowPayment,
  createPaymentRequest,
  createRefund,
  createWallet,
  createWithdrawal,
  getBalances,
  getPaymentRequest,
  getWallet,
  listApiKeys,
  listPaymentRequests,
  listRefunds,
  listTransactions,
  listWithdrawals,
  paymentsApi,
  revokeApiKey,
  verifyOzowPayment,
  // Admin domain
  adminApi,
  adminMerchants,
  adminOverview,
  adminPaymentRequests,
  adminTransactions,
  adminUsers,
  adminWallets,
  adminWithdrawals,
  // Remittance domain
  createRemittance,
  getRemittanceFeeEstimate,
  listRemittances,
  remittanceApi,
  // Aggregated api object
  api,
  // Types
  type AdminMerchantRow,
  type AdminOverview,
  type AdminPaymentRequestRow,
  type AdminTransactionRow,
  type AdminUserRow,
  type AdminWalletRow,
  type AdminWithdrawalRow,
  type ApiKey,
  type AssetTotal,
  type AuthResponse,
  type Balance,
  type ChangeEmailRequest,
  type ChangeEmailResponse,
  type DeleteAccountResponse,
  type FeeEstimate,
  type LoginResult,
  type Me,
  type OtpChallengeResponse,
  type Payment,
  type PaymentRequest,
  type PaymentRequestStatus,
  type PaymentStatus,
  type PushSubscriptionRequest,
  type PushSubscriptionResponse,
  type PushSubscriptionStatus,
  type Refund,
  type RefundStatus,
  type Remittance,
  type StatusCount,
  type UpdateProfileRequest,
  type UpdateProfileResponse,
  type UUID,
  type Wallet,
  type Withdrawal,
  type WithdrawalStatus,
} from '@/lib/api'

describe('lib/api barrel compatibility', () => {
  describe('Shared exports', () => {
    it('exports shared utilities and classes', () => {
      expect(typeof request).toBe('function')
      expect(typeof parseWithBigInts).toBe('function')
      expect(typeof stringifyWithBigInts).toBe('function')
      expect(typeof setUnauthorizedHandler).toBe('function')
      expect(typeof isOffline).toBe('function')
      expect(BASE_URL).toBe('/backend')
      expect(BIGINT_KEYS).toBeInstanceOf(Set)
      expect(new ApiError('test', 500)).toBeInstanceOf(Error)
    })
  })

  describe('Auth domain exports', () => {
    it('exports individual auth functions', () => {
      expect(typeof signup).toBe('function')
      expect(typeof login).toBe('function')
      expect(typeof verifyOtp).toBe('function')
      expect(typeof logout).toBe('function')
      expect(typeof getMe).toBe('function')
      expect(typeof updateProfile).toBe('function')
      expect(typeof changeEmail).toBe('function')
      expect(typeof deleteAccount).toBe('function')
      expect(typeof registerPushSubscription).toBe('function')
      expect(typeof unregisterPushSubscription).toBe('function')
      expect(typeof getPushSubscriptionStatus).toBe('function')
    })

    it('exports authApi namespace matching individual functions', () => {
      expect(authApi.signup).toBe(signup)
      expect(authApi.login).toBe(login)
      expect(authApi.verifyOtp).toBe(verifyOtp)
      expect(authApi.logout).toBe(logout)
      expect(authApi.getMe).toBe(getMe)
      expect(authApi.updateProfile).toBe(updateProfile)
      expect(authApi.changeEmail).toBe(changeEmail)
      expect(authApi.deleteAccount).toBe(deleteAccount)
      expect(authApi.registerPushSubscription).toBe(registerPushSubscription)
      expect(authApi.unregisterPushSubscription).toBe(unregisterPushSubscription)
      expect(authApi.getPushSubscriptionStatus).toBe(getPushSubscriptionStatus)
    })
  })

  describe('Payments domain exports', () => {
    it('exports individual payment functions', () => {
      expect(typeof createWallet).toBe('function')
      expect(typeof getWallet).toBe('function')
      expect(typeof getBalances).toBe('function')
      expect(typeof listTransactions).toBe('function')
      expect(typeof createPaymentRequest).toBe('function')
      expect(typeof listPaymentRequests).toBe('function')
      expect(typeof getPaymentRequest).toBe('function')
      expect(typeof createRefund).toBe('function')
      expect(typeof listRefunds).toBe('function')
      expect(typeof createWithdrawal).toBe('function')
      expect(typeof listWithdrawals).toBe('function')
      expect(typeof listApiKeys).toBe('function')
      expect(typeof createApiKey).toBe('function')
      expect(typeof revokeApiKey).toBe('function')
      expect(typeof createOzowPayment).toBe('function')
      expect(typeof verifyOzowPayment).toBe('function')
    })

    it('exports paymentsApi namespace matching individual functions', () => {
      expect(paymentsApi.listTransactions).toBe(listTransactions)
      expect(paymentsApi.createPaymentRequest).toBe(createPaymentRequest)
      expect(paymentsApi.listPaymentRequests).toBe(listPaymentRequests)
      expect(paymentsApi.createWithdrawal).toBe(createWithdrawal)
      expect(paymentsApi.createWallet).toBe(createWallet)
    })
  })

  describe('Admin domain exports', () => {
    it('exports individual admin functions', () => {
      expect(typeof adminOverview).toBe('function')
      expect(typeof adminUsers).toBe('function')
      expect(typeof adminMerchants).toBe('function')
      expect(typeof adminWallets).toBe('function')
      expect(typeof adminTransactions).toBe('function')
      expect(typeof adminWithdrawals).toBe('function')
      expect(typeof adminPaymentRequests).toBe('function')
    })

    it('exports adminApi namespace matching individual functions', () => {
      expect(adminApi.adminOverview).toBe(adminOverview)
      expect(adminApi.adminUsers).toBe(adminUsers)
      expect(adminApi.adminMerchants).toBe(adminMerchants)
      expect(adminApi.adminWallets).toBe(adminWallets)
      expect(adminApi.adminTransactions).toBe(adminTransactions)
      expect(adminApi.adminWithdrawals).toBe(adminWithdrawals)
      expect(adminApi.adminPaymentRequests).toBe(adminPaymentRequests)
    })
  })

  describe('Remittance domain exports', () => {
    it('exports individual remittance functions', () => {
      expect(typeof getRemittanceFeeEstimate).toBe('function')
      expect(typeof createRemittance).toBe('function')
      expect(typeof listRemittances).toBe('function')
    })

    it('exports remittanceApi namespace matching individual functions', () => {
      expect(remittanceApi.getRemittanceFeeEstimate).toBe(getRemittanceFeeEstimate)
      expect(remittanceApi.createRemittance).toBe(createRemittance)
      expect(remittanceApi.listRemittances).toBe(listRemittances)
    })
  })

  describe('Aggregated api object', () => {
    it('provides all domain methods through the legacy api object', () => {
      // Auth
      expect(api.signup).toBe(signup)
      expect(api.login).toBe(login)
      expect(api.verifyOtp).toBe(verifyOtp)
      expect(api.logout).toBe(logout)
      expect(api.getMe).toBe(getMe)
      expect(api.updateProfile).toBe(updateProfile)
      expect(api.changeEmail).toBe(changeEmail)
      expect(api.deleteAccount).toBe(deleteAccount)
      expect(api.registerPushSubscription).toBe(registerPushSubscription)
      expect(api.unregisterPushSubscription).toBe(unregisterPushSubscription)
      expect(api.getPushSubscriptionStatus).toBe(getPushSubscriptionStatus)

      // Payments
      expect(api.createWallet).toBe(createWallet)
      expect(api.getWallet).toBe(getWallet)
      expect(api.getBalances).toBe(getBalances)
      expect(api.listTransactions).toBe(listTransactions)
      expect(api.createPaymentRequest).toBe(createPaymentRequest)
      expect(api.listPaymentRequests).toBe(listPaymentRequests)
      expect(api.getPaymentRequest).toBe(getPaymentRequest)
      expect(api.createRefund).toBe(createRefund)
      expect(api.listRefunds).toBe(listRefunds)
      expect(api.createWithdrawal).toBe(createWithdrawal)
      expect(api.listWithdrawals).toBe(listWithdrawals)
      expect(api.listApiKeys).toBe(listApiKeys)
      expect(api.createApiKey).toBe(createApiKey)
      expect(api.revokeApiKey).toBe(revokeApiKey)
      expect(api.createOzowPayment).toBe(createOzowPayment)
      expect(api.verifyOzowPayment).toBe(verifyOzowPayment)

      // Admin
      expect(api.adminOverview).toBe(adminOverview)
      expect(api.adminUsers).toBe(adminUsers)
      expect(api.adminMerchants).toBe(adminMerchants)
      expect(api.adminWallets).toBe(adminWallets)
      expect(api.adminTransactions).toBe(adminTransactions)
      expect(api.adminWithdrawals).toBe(adminWithdrawals)
      expect(api.adminPaymentRequests).toBe(adminPaymentRequests)

      // Remittance
      expect(api.getRemittanceFeeEstimate).toBe(getRemittanceFeeEstimate)
      expect(api.createRemittance).toBe(createRemittance)
      expect(api.listRemittances).toBe(listRemittances)
    })
  })

  describe('Type accessibility', () => {
    it('demonstrates re-exported TypeScript types are usable', () => {
      // Type compile-time check
      const auth: AuthResponse = { token: 't', user_id: 'u', merchant_id: null }
      const otp: OtpChallengeResponse = { challenge_id: 'c', expires_in_secs: 60 }
      const loginResult: LoginResult = auth
      const me: Me = {
        user_id: 'u',
        email: 'e',
        name: 'n',
        is_admin: false,
        created_at: '',
        merchant_id: null,
        merchant_name: null,
      }
      const payment: Payment = {
        id: 'p',
        merchant_id: 'm',
        wallet_id: 'w',
        wallet_address: 'a',
        tx_hash: 'h',
        amount_stroops: 100n,
        asset: 'XLM',
        network: 'TESTNET',
        status: 'confirmed',
        confirmations: 1,
        created_at: '',
        updated_at: '',
      }
      const estimate: FeeEstimate = {
        fee_stroops: 10n,
        network_fee_stroops: 1n,
        total_stroops: 11n,
      }

      const typesCheck = {
        adminMerchantRow: null as unknown as AdminMerchantRow,
        adminOverview: null as unknown as AdminOverview,
        adminPaymentRequestRow: null as unknown as AdminPaymentRequestRow,
        adminTransactionRow: null as unknown as AdminTransactionRow,
        adminUserRow: null as unknown as AdminUserRow,
        adminWalletRow: null as unknown as AdminWalletRow,
        adminWithdrawalRow: null as unknown as AdminWithdrawalRow,
        apiKey: null as unknown as ApiKey,
        assetTotal: null as unknown as AssetTotal,
        balance: null as unknown as Balance,
        changeEmailRequest: null as unknown as ChangeEmailRequest,
        changeEmailResponse: null as unknown as ChangeEmailResponse,
        deleteAccountResponse: null as unknown as DeleteAccountResponse,
        paymentRequest: null as unknown as PaymentRequest,
        paymentRequestStatus: null as unknown as PaymentRequestStatus,
        paymentStatus: null as unknown as PaymentStatus,
        pushSubscriptionRequest: null as unknown as PushSubscriptionRequest,
        pushSubscriptionResponse: null as unknown as PushSubscriptionResponse,
        pushSubscriptionStatus: null as unknown as PushSubscriptionStatus,
        refund: null as unknown as Refund,
        refundStatus: null as unknown as RefundStatus,
        remittance: null as unknown as Remittance,
        statusCount: null as unknown as StatusCount,
        updateProfileRequest: null as unknown as UpdateProfileRequest,
        updateProfileResponse: null as unknown as UpdateProfileResponse,
        uuid: null as unknown as UUID,
        wallet: null as unknown as Wallet,
        withdrawal: null as unknown as Withdrawal,
        withdrawalStatus: null as unknown as WithdrawalStatus,
      }

      expect(auth.token).toBe('t')
      expect(otp.expires_in_secs).toBe(60)
      expect(loginResult).toBeDefined()
      expect(me.email).toBe('e')
      expect(payment.amount_stroops).toBe(100n)
      expect(estimate.total_stroops).toBe(11n)
      expect(typesCheck).toBeDefined()
    })
  })
})
