import { chargeToken } from './morning.js'
import { formatDateISO } from '../../src/lib/billing.js'

export const MAX_FAILURES_BEFORE_FLAGGING = 3

function addMonths(dateStr, n) {
  const d = new Date(dateStr)
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
}

// Charges one subscription's saved token for its monthly amount, advancing
// its billing cycle on success or bumping failure_count (and flagging it
// after enough consecutive failures) on failure. Shared by the daily cron
// and the admin's manual "retry" action.
export async function chargeSubscriptionOnce(supabase, sub, origin) {
  if (!sub.morning_token_id) {
    return { id: sub.id, skipped: 'no token' }
  }

  try {
    const doc = await chargeToken(sub.morning_token_id, {
      amount: sub.monthly_amount,
      description: `הוראת קבע — חיוב חודשי (${sub.covers_month})`,
    })

    const nextChargeDate = addMonths(sub.next_charge_date, 1)
    const nextCoversMonth = addMonths(sub.covers_month, 1)

    await supabase.from('billing_subscriptions').update({
      next_charge_date: formatDateISO(nextChargeDate),
      covers_month: formatDateISO(nextCoversMonth),
      failure_count: 0,
      status: 'active',
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id)

    await supabase.from('billing_charges').insert({
      subscription_id: sub.id,
      charge_type: 'recurring',
      amount: sub.monthly_amount,
      status: 'success',
      morning_document_id: doc.id,
    })

    return { id: sub.id, status: 'success' }
  } catch (err) {
    const failureCount = (sub.failure_count || 0) + 1
    const newStatus = failureCount >= MAX_FAILURES_BEFORE_FLAGGING ? 'failed' : 'active'

    await supabase.from('billing_subscriptions').update({
      failure_count: failureCount,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id)

    await supabase.from('billing_charges').insert({
      subscription_id: sub.id,
      charge_type: 'recurring',
      amount: sub.monthly_amount,
      status: 'failed',
      error_message: String(err.message || err),
    })

    if (newStatus === 'failed' && origin) {
      fetch(`${origin}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'billing_failed',
          registrantEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.GMAIL_USER,
          subscriptionId: sub.id,
        }),
      }).catch(notifyErr => console.error('billing_failed notify failed', notifyErr))
    }

    console.error(`chargeSubscriptionOnce: charge failed for subscription ${sub.id}`, err)
    return { id: sub.id, status: 'failed', error: String(err.message || err) }
  }
}
