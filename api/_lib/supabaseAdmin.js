import { createClient } from '@supabase/supabase-js'

let cachedClient = null

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  cachedClient = createClient(url, serviceKey, { auth: { persistSession: false } })
  return cachedClient
}
