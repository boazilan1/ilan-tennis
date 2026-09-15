import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { chargeSubscriptionOnce } from './_lib/chargeSubscription.js'

async function requireAdmin(req, supabase) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return false

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return false

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  return profile?.role === 'admin'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const supabase = getSupabaseAdmin()

  if (!(await requireAdmin(req, supabase))) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const { subscriptionId } = req.body || {}
  if (!subscriptionId) {
    res.status(400).json({ error: 'Missing subscriptionId' })
    return
  }

  const { data: sub, error } = await supabase
    .from('billing_subscriptions')
    .select('id, enrollment_id, monthly_amount, morning_token_id, next_charge_date, covers_month, failure_count')
    .eq('id', subscriptionId)
    .single()

  if (error || !sub) {
    res.status(404).json({ error: 'Subscription not found' })
    return
  }

  const origin = req.headers.origin || `https://${req.headers.host}`
  const result = await chargeSubscriptionOnce(supabase, sub, origin)
  res.status(200).json(result)
}
