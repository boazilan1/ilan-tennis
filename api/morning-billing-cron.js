import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { chargeSubscriptionOnce } from './_lib/chargeSubscription.js'
import { formatDateISO } from '../src/lib/billing.js'

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }

  try {
    const supabase = getSupabaseAdmin()
    const todayIso = formatDateISO(new Date())
    const origin = req.headers.origin || `https://${req.headers.host}`

    const { data: due, error } = await supabase
      .from('billing_subscriptions')
      .select('id, enrollment_id, monthly_amount, morning_token_id, next_charge_date, covers_month, failure_count')
      .eq('status', 'active')
      .lte('next_charge_date', todayIso)

    if (error) {
      console.error('morning-billing-cron: failed to load due subscriptions', error)
      res.status(500).json({ error: 'Failed to load subscriptions' })
      return
    }

    const results = []
    for (const sub of due || []) {
      results.push(await chargeSubscriptionOnce(supabase, sub, origin))
    }

    res.status(200).json({ ok: true, processed: results.length, results })
  } catch (err) {
    console.error('morning-billing-cron error', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
