import crypto from 'crypto'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { searchToken } from './_lib/morning.js'

// Vercel would otherwise parse the JSON body for us — we need the exact raw
// bytes to verify the HMAC signature, so disable that.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function isValidSignature(rawBody, signature) {
  const secret = process.env.MORNING_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  if (expectedBuf.length !== signatureBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, signatureBuf)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const rawBody = await readRawBody(req)
  const signature = req.headers['x-webhook-signature']

  if (!isValidSignature(rawBody, signature)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const topic = req.headers['x-webhook-topic']
  const event = JSON.parse(rawBody.toString('utf8'))

  // Only "document/created" is relevant — that's what /payments/form
  // produces once the customer completes checkout.
  if (topic !== 'document/created') {
    res.status(200).json({ ok: true, ignored: true })
    return
  }

  const enrollmentId = event.custom
  if (!enrollmentId) {
    res.status(200).json({ ok: true, ignored: true })
    return
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: subscription } = await supabase
      .from('billing_subscriptions')
      .select('id, monthly_amount, user_id')
      .eq('enrollment_id', enrollmentId)
      .single()

    if (!subscription) {
      res.status(200).json({ ok: true, ignored: true })
      return
    }

    // Prefer our own cached client id (set when the payment form was
    // created) over the webhook's own recipient.id — it's the id the token
    // was actually saved against.
    const { data: payerProfile } = await supabase
      .from('profiles')
      .select('morning_client_id, email')
      .eq('id', subscription.user_id)
      .single()
    const recipientId = payerProfile?.morning_client_id || event.recipient?.id

    let morningTokenId = null
    if (recipientId) {
      const tokenRes = await searchToken(recipientId).catch(() => null)
      morningTokenId = tokenRes?.items?.[0]?.id || null
    }

    // Deliberately do NOT flip enrollments.status to 'active' here — payment
    // succeeding is not proof the amount was actually correct (a stray test
    // override once let a real ₪1 charge slip through and auto-activate).
    // Admin still confirms manually in the panel, where the actual charged
    // amount (from billing_charges, below) is shown next to the expected one.
    await supabase.from('billing_subscriptions').update({
      status: 'active',
      morning_client_id: recipientId || null,
      morning_token_id: morningTokenId,
      updated_at: new Date().toISOString(),
    }).eq('id', subscription.id)

    await supabase.from('billing_charges').insert({
      subscription_id: subscription.id,
      charge_type: 'initial',
      amount: event.total ?? subscription.monthly_amount,
      status: 'success',
      morning_document_id: event.id,
    })

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('morning-webhook error', err)
    // Acknowledge anyway — we've logged it, and Morning will otherwise keep
    // retrying a delivery we already recorded.
    res.status(200).json({ ok: true, error: 'internal error, logged' })
  }
}
