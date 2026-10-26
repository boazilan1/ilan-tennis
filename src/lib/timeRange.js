// "17:30" + 45 minutes → "17:30 - 18:15", the same style group classes use.
// A time that is already a range (or can't be parsed) is returned as typed.
export function formatTimeRange(time, durationMinutes) {
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  const duration = Number(durationMinutes)
  if (!m || !duration) return time || ''
  const start = Number(m[1]) * 60 + Number(m[2])
  const fmt = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return `${fmt(start)} - ${fmt(start + duration)}`
}
