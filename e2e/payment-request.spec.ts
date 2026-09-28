import { expect, test } from '@playwright/test'

const requestId = 'e2e-payment-request'
const paymentRequest = {
  id: requestId,
  merchant_id: 'e2e-merchant',
  address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  network: 'testnet',
  amount_stroops: 10_000_000,
  asset: 'XLM',
  memo: 'E2E-REFERENCE',
  status: 'pending',
  expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  created_at: new Date().toISOString(),
  sep7_uri:
    'web+stellar:pay?destination=GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF&amount=1',
}

test('creates a payment request and displays its QR code', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'aframp.session',
      JSON.stringify({ token: 'e2e-token', userId: 'e2e-user', merchantId: 'e2e-merchant' })
    )
  })

  await page.route('**/backend/payment-requests', (route) =>
    route.fulfill({ status: 201, json: paymentRequest })
  )
  await page.route(`**/backend/payment-requests/${requestId}`, (route) =>
    route.fulfill({ status: 200, json: paymentRequest })
  )

  await page.goto('/charge')
  await page.getByRole('button', { name: '1', exact: true }).click()
  await page.getByRole('button', { name: 'Show payment code' }).click()

  await expect(page).toHaveURL(new RegExp(`/request/${requestId}$`))
  await expect(page.locator('svg[title^="Pay "]')).toBeVisible()
})
