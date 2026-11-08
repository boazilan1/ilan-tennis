import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}

function formatDays(a) {
  const days = a.days_of_week?.length ? a.days_of_week : (a.day_of_week ? [a.day_of_week] : [])
  return days.map(d => DAYS_HE[d]).filter(Boolean).join(', ') || '—'
}

const money = n => `₪${(Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 1 })}`
const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dateLabel = iso => new Date(`${iso}T00:00:00`).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })

const card = { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }
const navBtn = {
  background: '#fff', border: '1px solid #e8ece8', borderRadius: '10px',
  padding: '8px 16px', cursor: 'pointer', fontSize: '13px', color: '#555', fontWeight: '500',
}

function Pill({ label, color, bg }) {
  return <span style={{ background: bg, color, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>{label}</span>
}

function Stat({ label, value, sub, color = '#1a472a' }) {
  return (
    <div style={{ ...card, padding: '16px 18px', flex: '1 1 160px' }}>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '800', color }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children, total }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '28px 0 12px', paddingBottom: '8px', borderBottom: '2px solid #e8ece8' }}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1a472a' }}>{children}</h3>
      {total != null && <span style={{ fontWeight: '800', color: '#1a472a' }}>{money(total)}</span>}
    </div>
  )
}

const SUB_BADGE = {
  active: { label: 'הוראת קבע פעילה', color: '#16a34a', bg: '#dcfce7' },
  pending_first_payment: { label: 'ממתין לתשלום ראשון', color: '#d97706', bg: '#fef3c7' },
  failed: { label: 'חיוב נכשל', color: '#dc2626', bg: '#fee2e2' },
}
// A cancelled or paused standing order no longer brings money in.
const COUNTED_SUB_STATUSES = ['active', 'pending_first_payment', 'failed']

export default function AdminPayments() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState({})
  const [locations, setLocations] = useState({})
  const [enrollments, setEnrollments] = useState([])
  const [subs, setSubs] = useState({})
  const [firstPayments, setFirstPayments] = useState([])
  const [bookings, setBookings] = useState([])
  const [packages, setPackages] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [actRes, locRes, enrRes, subRes, chargeRes, bookRes, pkgRes] = await Promise.all([
      supabase.from('activities').select('id, name, time, price, day_of_week, days_of_week, location_id'),
      supabase.from('locations').select('id, name'),
      supabase.from('enrollments').select(`
        id, status, activity_id,
        player:players(name),
        profile:profiles!enrollments_user_id_fkey(full_name)
      `).in('status', ['active', 'pending']),
      supabase.from('billing_subscriptions').select('enrollment_id, monthly_amount, status'),
      supabase.from('billing_charges').select('amount, status, attempted_at').eq('charge_type', 'initial').eq('status', 'success'),
      supabase.from('private_slot_bookings').select(`
        id, status, payment_method, price, program, guest_name,
        player:players(name),
        profile:profiles!private_slot_bookings_user_id_fkey(full_name),
        slot:private_slots(slot_date, time, price)
      `).neq('status', 'cancelled'),
      supabase.from('lesson_packages').select('id, session_count, price, status, created_at, player:players(name)').in('status', ['pending', 'active', 'depleted']),
    ])
    const actMap = {}
    actRes.data?.forEach(a => { actMap[a.id] = a })
    setActivities(actMap)
    const locMap = {}
    locRes.data?.forEach(l => { locMap[l.id] = l.name })
    setLocations(locMap)
    setEnrollments(enrRes.data || [])
    const subMap = {}
    subRes.data?.forEach(s => { subMap[s.enrollment_id] = s })
    setSubs(subMap)
    setFirstPayments(chargeRes.data || [])
    setBookings(bookRes.data || [])
    setPackages(pkgRes.data || [])
    setLoading(false)
  }

  function shiftMonth(delta) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb', fontSize: '14px' }}>טוען...</div>

  const key = monthKey(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  const isPast = new Date(year, month + 1, 1) <= new Date(now.getFullYear(), now.getMonth(), 1)
  const today = todayISO()

  // ── Group classes: what the standing orders bring in each month ──
  const groupRows = enrollments.map(e => {
    const act = activities[e.activity_id]
    const sub = subs[e.id]
    const counted = e.status === 'active' && (!sub || COUNTED_SUB_STATUSES.includes(sub.status))
    const amount = sub ? Number(sub.monthly_amount) : Number(act?.price || 0)
    return { enrollment: e, act, sub, amount, counted }
  })
  const groupTotal = groupRows.filter(r => r.counted).reduce((s, r) => s + r.amount, 0)
  const groupCount = groupRows.filter(r => r.counted).length
  const pendingGroupTotal = groupRows.filter(r => r.enrollment.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const groupsByActivity = {}
  groupRows.forEach(r => {
    const k = r.enrollment.activity_id
    if (!groupsByActivity[k]) groupsByActivity[k] = { act: r.act, rows: [] }
    groupsByActivity[k].rows.push(r)
  })
  const activityBlocks = Object.values(groupsByActivity)
    .sort((a, b) => (a.act ? formatDays(a.act) : '').localeCompare(b.act ? formatDays(b.act) : '', 'he') || (a.act?.time || '').localeCompare(b.act?.time || ''))

  const firstPaymentsThisMonth = firstPayments.filter(c => (c.attempted_at || '').slice(0, 7) === key)
  const firstPaymentsTotal = firstPaymentsThisMonth.reduce((s, c) => s + Number(c.amount), 0)

  // ── Private lessons in the chosen month ──
  const monthBookings = bookings
    .filter(b => b.slot?.slot_date?.slice(0, 7) === key)
    .sort((a, b) => a.slot.slot_date.localeCompare(b.slot.slot_date) || a.slot.time.localeCompare(b.slot.time))
  const priceOf = b => Number(b.price ?? b.slot?.price ?? 0)
  const paidLessons = monthBookings.filter(b => b.status === 'active' && b.payment_method === 'immediate')
  const pendingLessons = monthBookings.filter(b => b.status === 'pending')
  const programLessons = monthBookings.filter(b => b.payment_method === 'program')
  const packageLessons = monthBookings.filter(b => b.payment_method === 'balance')
  const manualLessons = monthBookings.filter(b => b.payment_method === 'manual')
  const sum = list => list.reduce((s, b) => s + priceOf(b), 0)
  const programs = {}
  programLessons.forEach(b => {
    if (!programs[b.program]) programs[b.program] = { count: 0, total: 0 }
    programs[b.program].count += 1
    programs[b.program].total += priceOf(b)
  })

  // ── Lesson packages bought in the chosen month ──
  const monthPackages = packages.filter(p => (p.created_at || '').slice(0, 7) === key)
  const packagesPaid = monthPackages.filter(p => p.status !== 'pending').reduce((s, p) => s + Number(p.price), 0)
  const packagesPending = monthPackages.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.price), 0)

  const privateExpected = sum(paidLessons) + sum(pendingLessons) + sum(programLessons)
  const total = (isPast ? 0 : groupTotal) + privateExpected + packagesPaid + packagesPending

  const personName = b => b.player?.name || b.guest_name || b.profile?.full_name || '—'
  const lessonStatus = b => {
    if (b.payment_method === 'program') return { label: `תוכנית: ${b.program}`, color: '#7c3aed', bg: '#ede9fe' }
    if (b.payment_method === 'manual') return { label: 'נרשם ידנית', color: '#888', bg: '#f3f4f6' }
    if (b.payment_method === 'balance') return { label: 'מחבילה', color: '#0e7490', bg: '#cffafe' }
    if (b.status === 'pending') {
      return b.slot.slot_date < today
        ? { label: 'לא שולם — עבר התאריך', color: '#dc2626', bg: '#fee2e2' }
        : { label: 'ממתין לתשלום', color: '#d97706', bg: '#fef3c7' }
    }
    return { label: 'שולם ✓', color: '#16a34a', bg: '#dcfce7' }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111' }}>כמה אני אמור לקבל</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => shiftMonth(-1)} style={navBtn}>→</button>
          <span style={{ fontWeight: '700', minWidth: '110px', textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} style={navBtn}>←</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Stat label={`סה״כ צפוי ב${monthLabel}`} value={money(total)}
          sub={isPast ? 'לא כולל חוגים (הם לפי המחזור הנוכחי)' : 'חוגים + אימונים פרטיים + חבילות'} />
        <Stat label="חוגים — הוראות קבע" value={isPast ? '—' : money(groupTotal)} sub={`${groupCount} מתאמנים פעילים`} />
        <Stat label="אימונים פרטיים" value={money(privateExpected)}
          sub={`שולם ${money(sum(paidLessons))} · ממתין ${money(sum(pendingLessons))} · תוכניות ${money(sum(programLessons))}`} />
        {(packagesPaid > 0 || packagesPending > 0) && (
          <Stat label="חבילות אימונים" value={money(packagesPaid + packagesPending)} sub={`שולם ${money(packagesPaid)} · ממתין ${money(packagesPending)}`} />
        )}
      </div>

      {/* ── Private lessons ── */}
      <SectionTitle total={privateExpected}>אימונים פרטיים — {monthLabel}</SectionTitle>
      {Object.keys(programs).length > 0 && (
        <div style={{ ...card, padding: '14px 18px', marginBottom: '12px', borderRight: '4px solid #7c3aed' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#7c3aed', marginBottom: '8px' }}>מגיע מתוכניות (לא המתאמן משלם)</div>
          {Object.entries(programs).map(([name, p]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '3px 0' }}>
              <span>{name} · {p.count} אימונים</span>
              <b>{money(p.total)}</b>
            </div>
          ))}
        </div>
      )}
      {monthBookings.length === 0 ? (
        <div style={{ ...card, padding: '24px', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>אין אימונים פרטיים בחודש הזה</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {monthBookings.map(b => {
            const st = lessonStatus(b)
            const hasAmount = b.payment_method !== 'balance' && priceOf(b) > 0
            return (
              <div key={b.id} style={{ ...card, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>{personName(b)}</span>
                  <span style={{ fontSize: '12px', color: '#999', marginRight: '8px' }}>{dateLabel(b.slot.slot_date)} · {b.slot.time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Pill {...st} />
                  <span style={{ fontWeight: '700', minWidth: '56px', textAlign: 'left' }}>{hasAmount ? money(priceOf(b)) : '—'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {(packageLessons.length > 0 || manualLessons.length > 0) && (
        <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
          {packageLessons.length > 0 && `${packageLessons.length} אימונים ירדו מחבילה (שולמו כשנקנתה החבילה). `}
          {manualLessons.length > 0 && `${manualLessons.length} אימונים נרשמו ידנית ואינם נספרים בסכום.`}
        </div>
      )}

      {/* ── Packages ── */}
      {monthPackages.length > 0 && (
        <>
          <SectionTitle total={packagesPaid + packagesPending}>חבילות שנקנו ב{monthLabel}</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {monthPackages.map(p => (
              <div key={p.id} style={{ ...card, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{p.player?.name || '—'} · {p.session_count} אימונים</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {p.status === 'pending' ? <Pill label="ממתין לתשלום" color="#d97706" bg="#fef3c7" /> : <Pill label="שולם ✓" color="#16a34a" bg="#dcfce7" />}
                  <b>{money(p.price)}</b>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Group classes ── */}
      <SectionTitle total={isPast ? null : groupTotal}>חוגים — הוראות קבע חודשיות</SectionTitle>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px', lineHeight: 1.6 }}>
        הסכום החודשי לכל מתאמן לפי הוראת הקבע שלו (כולל הנחת אחים). מי שאין לו הוראת קבע במערכת מחושב לפי מחיר החוג.
        {firstPaymentsThisMonth.length > 0 && ` תשלומים ראשונים (יחסיים) שנקלטו ב${monthLabel}: ${money(firstPaymentsTotal)} מ-${firstPaymentsThisMonth.length} מתאמנים.`}
      </div>
      {activityBlocks.map(({ act, rows }) => {
        const blockTotal = rows.filter(r => r.counted).reduce((s, r) => s + r.amount, 0)
        return (
          <div key={act?.id || 'none'} style={{ ...card, marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#f6faf6', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div>
                <span style={{ fontWeight: '800', fontSize: '14px', color: '#1a472a' }}>{act ? `יום ${formatDays(act)} · ${act.time}` : 'חוג לא ידוע'}</span>
                {act?.location_id && locations[act.location_id] && <span style={{ fontSize: '12px', color: '#888', marginRight: '8px' }}>📍 {locations[act.location_id]}</span>}
              </div>
              <span style={{ fontWeight: '800', color: '#1a472a' }}>{money(blockTotal)}</span>
            </div>
            {rows.map(r => {
              const badge = r.enrollment.status === 'pending'
                ? { label: 'ממתין לאישור', color: '#d97706', bg: '#fef3c7' }
                : r.sub ? (SUB_BADGE[r.sub.status] || { label: 'הוראת קבע לא פעילה', color: '#888', bg: '#f3f4f6' })
                  : { label: 'ללא הוראת קבע במערכת', color: '#888', bg: '#f3f4f6' }
              return (
                <div key={r.enrollment.id} style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', opacity: r.counted ? 1 : 0.6 }}>
                  <div>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{r.enrollment.player?.name || '—'}</span>
                    {r.enrollment.profile?.full_name && <span style={{ fontSize: '12px', color: '#aaa', marginRight: '8px' }}>{r.enrollment.profile.full_name}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Pill {...badge} />
                    <span style={{ fontWeight: '700', minWidth: '56px', textAlign: 'left' }}>{money(r.amount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
      {pendingGroupTotal > 0 && (
        <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
          עוד {money(pendingGroupTotal)} בחודש אם ההרשמות הממתינות יאושרו (לא נכלל בסכום).
        </div>
      )}
    </div>
  )
}
