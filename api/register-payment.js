import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { createPaymentForm, createClient } from './_lib/morning.js'
import { computeBillingPlan, getActivityDaysOfWeek, formatDateISO } from '../src/lib/billing.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { enrollmentId } = req.body || {}
  if (!enrollmentId) {
    res.status(400).json({ error: 'Missing enrollmentId' })
    return
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, user_id, created_at, activity:activities(id, name, price, day_of_week, days_of_week), player:players(name)')
      .eq('id', enrollmentId)
      .single()

    if (enrollError || !enrollment) {
      res.status(404).json({ error: 'Enrollment not found' })
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, email, morning_client_id')
      .eq('id', enrollment.user_id)
      .single()

    const activity = enrollment.activity
    const days = getActivityDaysOfWeek(activity)
    const plan = computeBillingPlan(new Date(enrollment.created_at), days, Number(activity.price))

    const origin = req.headers.origin || `https://${req.headers.host}`

    // A payment tied only to an inline/ad-hoc client (no client.id) does not
    // reliably produce a token we can find afterward via /payments/tokens/search
    // — a real, persistent Morning client is required for that. Create one once
    // per user and cache its id.
    let morningClientId = profile?.morning_client_id || null
    if (!morningClientId) {
      const newClient = await createClient({
        name: profile?.full_name || 'תלמיד/ה',
        email: profile?.email,
        phone: profile?.phone,
      })
      morningClientId = newClient.id
      await supabase.from('profiles').update({ morning_client_id: morningClientId }).eq('id', enrollment.user_id)
    }

    // TEMPORARY: lets a real end-to-end checkout be tested for ~nothing
    // instead of the real prorated amount. Only active when explicitly
    // enabled via env var — remove once verified.
    const testAmount = Number(process.env.MORNING_TEST_FORCE_AMOUNT)
    const chargeAmount = testAmount > 0 ? testAmount : plan.immediateCharge

    const form = await createPaymentForm({
      amount: chargeAmount,
      description: `הרשמה לחוג ${activity.name} — ${enrollment.player?.name || ''}`,
      client: {
        id: morningClientId,
        name: profile?.full_name || 'תלמיד/ה',
        emails: profile?.email ? [profile.email] : [],
        phone: profile?.phone || '',
      },
      custom: enrollmentId,
      successUrl: `${origin}/register/thank-you`,
      failureUrl: `${origin}/register?activity=${activity.id}`,
      notifyUrl: `${origin}/api/morning-webhook`,
    })

    const { error: subError } = await supabase.from('billing_subscriptions').upsert({
      enrollment_id: enrollmentId,
      user_id: enrollment.user_id,
      monthly_amount: Number(activity.price),
      status: 'pending_first_payment',
      next_charge_date: formatDateISO(plan.standingOrderFirstDate),
      covers_month: formatDateISO(plan.standingOrderCoversDate),
    }, { onConflict: 'enrollment_id' })

    if (subError) throw subError

    res.status(200).json({ url: form.url })
  } catch (err) {
    console.error('register-payment error', err)
    res.status(502).json({ error: 'Payment setup failed' })
  }
}
