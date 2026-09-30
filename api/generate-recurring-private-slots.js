import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'

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
    const { error } = await supabase.rpc('ensure_recurring_private_slots')
    if (error) {
      console.error('generate-recurring-private-slots: rpc failed', error)
      res.status(500).json({ error: 'Failed to generate slots' })
      return
    }
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('generate-recurring-private-slots error', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
