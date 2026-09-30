import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { createPaymentForm, createClient } from './_lib/morning.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { kind, id } = req.body || {}
  if (!id || !['privateBooking', 'package'].includes(kind)) {
    res.status(400).json({ error: 'Missing or invalid kind/id' })
    return
  }

  try {
    const supabase = getSupabaseAdmin()
    let amount, description, userId, failurePath

    if (kind === 'privateBooking') {
      const { data: booking, error } = await supabase
        .from('private_slot_bookings')
        .select('id, user_id, player:players(name), slot:private_slots(id, slot_date, time, price)')
        .eq('id', id).single()
      if (error || !booking) { res.status(404).json({ error: 'Booking not found' }); return }
      amount = Number(booking.slot.price)
      description = `אימון פרטי — ${booking.player?.name || ''} — ${booking.slot.slot_date} ${booking.slot.time}`
      userId = booking.user_id
      failurePath = `/private-lessons?slot=${booking.slot.id}`
    } else {
      const { data: pkg, error } = await supabase
        .from('lesson_packages')
        .select('id, user_id, session_count, price, player:players(name)')
        .eq('id', id).single()
      if (error || !pkg) { res.status(404).json({ error: 'Package not found' }); return }
      amount = Number(pkg.price)
      description = `חבילת ${pkg.session_count} אימונים פרטיים — ${pkg.player?.name || ''}`
      userId = pkg.user_id
      failurePath = '/private-lessons?buy=package'
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, email, morning_client_id')
      .eq('id', userId)
      .single()

    let morningClientId = profile?.morning_client_id || null
    if (!morningClientId) {
      const newClient = await createClient({
        name: profile?.full_name || 'תלמיד/ה',
        email: profile?.email,
        phone: profile?.phone,
      })
      morningClientId = newClient.id
      await supabase.from('profiles').update({ morning_client_id: morningClientId }).eq('id', userId)
    }

    const origin = req.headers.origin || `https://${req.headers.host}`

    const form = await createPaymentForm({
      amount,
      description,
      client: {
        id: morningClientId,
        name: profile?.full_name || 'תלמיד/ה',
        emails: profile?.email ? [profile.email] : [],
        phone: profile?.phone || '',
      },
      custom: id,
      successUrl: `${origin}/register/thank-you`,
      failureUrl: `${origin}${failurePath}`,
    })

    res.status(200).json({ url: form.url })
  } catch (err) {
    console.error('private-payment error', err)
    res.status(502).json({ error: 'Payment setup failed' })
  }
}
