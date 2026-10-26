import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { createPaymentForm, createClient } from './_lib/morning.js'

// Morning rejects phones with dashes/spaces or a +972 prefix (errorCode 2601).
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  return digits.startsWith('972') ? `0${digits.slice(3)}` : digits
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { kind, id, source } = req.body || {}
  if (!id || !['privateBooking', 'package'].includes(kind)) {
    res.status(400).json({ error: 'Missing or invalid kind/id' })
    return
  }

  try {
    const supabase = getSupabaseAdmin()
    // `invite`: the person opened a payment link the admin sent them (/pay/<id>)
    // rather than booking through the site, so they land back on that page.
    const fromInvite = source === 'invite' && kind === 'privateBooking'
    let amount, description, userId, failurePath, guest = null, bookingPhone = null

    if (kind === 'privateBooking') {
      const { data: booking, error } = await supabase
        .from('private_slot_bookings')
        .select('id, user_id, status, price, guest_name, guest_phone, guest_morning_client_id, player:players(name), slot:private_slots(id, slot_date, time, price)')
        .eq('id', id).single()
      if (error || !booking) { res.status(404).json({ error: 'Booking not found' }); return }
      if (booking.status !== 'pending') { res.status(409).json({ error: 'Booking is not awaiting payment' }); return }
      // booking.price is fixed when the booking is made (personal rate or the slot price)
      amount = Number(booking.price ?? booking.slot.price)
      description = `אימון פרטי — ${booking.player?.name || booking.guest_name || ''} — ${booking.slot.slot_date} ${booking.slot.time}`
      userId = booking.user_id
      if (!userId) guest = booking
      bookingPhone = booking.guest_phone
      failurePath = fromInvite ? `/pay/${booking.id}` : `/private-lessons?slot=${booking.slot.id}`
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

    // A guest (invited by the admin, no account) has no profile — their
    // name/phone live on the booking and their Morning client id is cached there.
    const { data: profile } = guest ? { data: null } : await supabase
      .from('profiles')
      .select('full_name, phone, email, morning_client_id')
      .eq('id', userId)
      .single()

    const clientName = guest ? guest.guest_name : (profile?.full_name || 'תלמיד/ה')
    const clientPhone = normalizePhone(guest ? guest.guest_phone : (profile?.phone || bookingPhone))
    let morningClientId = guest ? guest.guest_morning_client_id : (profile?.morning_client_id || null)
    if (!morningClientId) {
      const newClient = await createClient({ name: clientName, email: profile?.email, phone: clientPhone })
      morningClientId = newClient.id
      if (guest) await supabase.from('private_slot_bookings').update({ guest_morning_client_id: morningClientId }).eq('id', id)
      else await supabase.from('profiles').update({ morning_client_id: morningClientId }).eq('id', userId)
    }

    const origin = req.headers.origin || `https://${req.headers.host}`

    const form = await createPaymentForm({
      amount,
      description,
      client: {
        id: morningClientId,
        name: clientName,
        emails: profile?.email ? [profile.email] : [],
        phone: clientPhone || '',
      },
      custom: id,
      successUrl: fromInvite ? `${origin}/pay/${id}?paid=1` : `${origin}/register/thank-you`,
      failureUrl: `${origin}${failurePath}`,
    })

    res.status(200).json({ url: form.url })
  } catch (err) {
    console.error('private-payment error', err)
    res.status(502).json({ error: 'Payment setup failed' })
  }
}
