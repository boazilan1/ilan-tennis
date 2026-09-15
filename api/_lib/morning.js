// Shared helper for the Morning (Green Invoice) API. Not its own route —
// Vercel only routes top-level files under /api, so this _lib subfolder is
// safe to import from the actual route handlers.

const ENV = process.env.MORNING_ENV === 'production' ? 'production' : 'sandbox'

const BASE_URLS = {
  production: 'https://api.greeninvoice.co.il/api/v1',
  sandbox: 'https://sandbox.d.greeninvoice.co.il/api/v1',
}

const TOKEN_URLS = {
  production: 'https://api.morning.co/idp/v1/oauth/token',
  sandbox: 'https://api.sandbox.morning.dev/idp/v1/oauth/token',
}

const CLIENT_ID = process.env.MORNING_CLIENT_ID || process.env.MORNING_BUSINESS_ID
const CLIENT_SECRET = process.env.MORNING_CLIENT_SECRET || process.env.MORNING_API_SECRET

let cachedToken = null // { accessToken, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() / 1000 + 30) {
    return cachedToken.accessToken
  }
  const res = await fetch(TOKEN_URLS[ENV], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Morning auth failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  cachedToken = { accessToken: data.accessToken, expiresAt: data.expiresAt }
  return cachedToken.accessToken
}

async function morningFetch(path, body) {
  const accessToken = await getAccessToken()
  const res = await fetch(`${BASE_URLS[ENV]}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`Morning API ${path} failed (${res.status}): ${data ? JSON.stringify(data) : await res.text()}`)
  }
  return data
}

export function createPaymentForm({ amount, description, client, custom, successUrl, failureUrl, notifyUrl }) {
  return morningFetch('/payments/form', {
    description,
    type: 320, // חשבונית מס / קבלה
    amount,
    currency: 'ILS',
    vatType: 0,
    lang: 'he',
    maxPayments: 1,
    client,
    custom,
    successUrl,
    failureUrl,
    notifyUrl,
  })
}

export function chargeToken(tokenId, { amount, description }) {
  return morningFetch(`/payments/tokens/${tokenId}/charge`, {
    type: 320,
    amount,
    currency: 'ILS',
    vatType: 0,
    lang: 'he',
    description,
  })
}

export function searchToken(externalKey) {
  return morningFetch('/payments/tokens/search', { externalKey })
}

export const MORNING_ENV = ENV
