import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}
const DAYS_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']


const STATUS_LABELS = {
  pending:   { label: 'ממתין לתשלום', color: '#f59e0b', bg: '#fffbeb' },
  active:    { label: 'שילם ✓',       color: '#16a34a', bg: '#f0fdf4' },
  cancelled: { label: 'בוטל',         color: '#dc2626', bg: '#fef2f2' },
}

const EMPTY_FORM = {
  name: '', description: '', day_of_week: 'sunday',
  time: '', price: '', max_students: '', payment_link: '',
}

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('enrollments')

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate('/')
  }, [user, isAdmin, loading, navigate])

  if (loading) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '1100px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>טוען...</p>
      </main>
    )
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ color: '#1a472a', marginBottom: '24px' }}>פאנל ניהול</h1>

      {/* טאבים */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '2px solid #e0e0e0' }}>
        {[
          { key: 'enrollments', label: 'הרשמות' },
          { key: 'activities',  label: 'ניהול חוגים' },
          { key: 'calendar',    label: 'יומן' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', padding: '10px 20px',
              fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
              color: tab === t.key ? '#1a472a' : '#888',
              borderBottom: tab === t.key ? '3px solid #1a472a' : '3px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'enrollments' && <EnrollmentsTab />}
      {tab === 'activities'  && <ActivitiesTab />}
      {tab === 'calendar'    && <CalendarTab />}
    </main>
  )
}

/* ─── טאב הרשמות ─── */
function EnrollmentsTab() {
  const [enrollments, setEnrollments] = useState([])
  const [activities, setActivities] = useState({})
  const [filter, setFilter] = useState('all')
  const [dataLoading, setDataLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setDataLoading(true)
    const [enrollRes, actRes] = await Promise.all([
      supabase
        .from('enrollments')
        .select(`
          id, status, created_at, activity_id,
          player:players(name, birth_year),
          profile:profiles!enrollments_user_id_fkey(full_name, phone)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('activities').select('*'),
    ])
    if (enrollRes.data) setEnrollments(enrollRes.data)
    if (actRes.data) {
      const map = {}
      actRes.data.forEach(a => { map[a.id] = a })
      setActivities(map)
    }
    setDataLoading(false)
  }

  async function updateStatus(enrollmentId, newStatus) {
    setUpdating(enrollmentId)
    const { error } = await supabase.from('enrollments').update({ status: newStatus }).eq('id', enrollmentId)
    if (!error) setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, status: newStatus } : e))
    setUpdating(null)
  }

  const filtered = filter === 'all' ? enrollments : enrollments.filter(e => e.status === filter)
  const counts = {
    all: enrollments.length,
    pending: enrollments.filter(e => e.status === 'pending').length,
    active: enrollments.filter(e => e.status === 'active').length,
    cancelled: enrollments.filter(e => e.status === 'cancelled').length,
  }

  if (dataLoading) return <p style={{ color: '#888', textAlign: 'center' }}>טוען...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={fetchData} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}>
          רענן
        </button>
      </div>

      {/* סטטיסטיקות */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { key: 'all',       label: 'סה"כ',    color: '#1a472a' },
          { key: 'pending',   label: 'ממתינים', color: '#f59e0b' },
          { key: 'active',    label: 'שילמו',   color: '#16a34a' },
          { key: 'cancelled', label: 'בוטלו',   color: '#dc2626' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              background: filter === key ? color : '#fff',
              color: filter === key ? '#fff' : color,
              border: `2px solid ${color}`,
              borderRadius: '10px', padding: '14px', cursor: 'pointer', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{counts[key]}</div>
            <div style={{ fontSize: '13px', marginTop: '2px' }}>{label}</div>
          </button>
        ))}
      </div>

      {/* רשימת הרשמות */}
      {filtered.length === 0 ? (
        <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>אין הרשמות</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(e => {
            const activity = activities[e.activity_id]
            const st = STATUS_LABELS[e.status] || STATUS_LABELS.pending
            const date = new Date(e.created_at).toLocaleDateString('he-IL')
            return (
              <div key={e.id} style={{
                background: '#fff', borderRadius: '10px', padding: '16px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex',
                alignItems: 'center', gap: '16px', borderRight: `4px solid ${st.color}`,
              }}>
                <div style={{ flex: '1.5' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a1a1a' }}>{e.player?.name || '—'}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>יליד {e.player?.birth_year}</div>
                </div>
                <div style={{ flex: '1.5' }}>
                  <div style={{ fontSize: '14px', color: '#333' }}>{e.profile?.full_name || '—'}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{e.profile?.phone || ''}</div>
                </div>
                <div style={{ flex: '2' }}>
                  {activity ? (
                    <>
                      <div style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>{activity.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>יום {DAYS_HE[activity.day_of_week]} | {activity.time} | ₪{activity.price}</div>
                    </>
                  ) : <span style={{ color: '#aaa', fontSize: '13px' }}>—</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa', minWidth: '70px', textAlign: 'center' }}>{date}</div>
                <div style={{ background: st.bg, color: st.color, borderRadius: '6px', padding: '4px 10px', fontSize: '13px', fontWeight: 'bold', minWidth: '120px', textAlign: 'center' }}>
                  {st.label}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {e.status !== 'active' && (
                    <button onClick={() => updateStatus(e.id, 'active')} disabled={updating === e.id}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', opacity: updating === e.id ? 0.6 : 1 }}>
                      אישור תשלום
                    </button>
                  )}
                  {e.status !== 'cancelled' && (
                    <button onClick={() => updateStatus(e.id, 'cancelled')} disabled={updating === e.id}
                      style={{ background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', opacity: updating === e.id ? 0.6 : 1 }}>
                      ביטול
                    </button>
                  )}
                  {e.status === 'cancelled' && (
                    <button onClick={() => updateStatus(e.id, 'pending')} disabled={updating === e.id}
                      style={{ background: '#fff', color: '#888', border: '1px solid #ccc', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>
                      שחזר
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── טאב ניהול חוגים ─── */
function ActivitiesTab() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // activity object or 'new'
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { fetchActivities() }, [])

  async function fetchActivities() {
    setLoading(true)
    const { data } = await supabase.from('activities').select('*').order('day_of_week')
    if (data) setActivities(data)
    setLoading(false)
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing('new')
    setError('')
  }

  function openEdit(activity) {
    setForm({
      name: activity.name || '',
      description: activity.description || '',
      day_of_week: activity.day_of_week || 'sunday',
      time: activity.time || '',
      price: activity.price != null ? String(activity.price) : '',
      max_students: activity.max_students != null ? String(activity.max_students) : '',
      payment_link: activity.payment_link || '',
    })
    setEditing(activity)
    setError('')
  }

  function closeForm() {
    setEditing(null)
    setError('')
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('יש להזין שם חוג'); return }
    if (!form.time.trim()) { setError('יש להזין שעה'); return }
    if (!form.price || isNaN(Number(form.price))) { setError('יש להזין מחיר תקין'); return }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      day_of_week: form.day_of_week,
      time: form.time.trim(),
      price: Number(form.price),
      max_students: form.max_students ? Number(form.max_students) : null,
      payment_link: form.payment_link.trim() || null,
    }

    let err
    if (editing === 'new') {
      const res = await supabase.from('activities').insert(payload)
      err = res.error
    } else {
      const res = await supabase.from('activities').update(payload).eq('id', editing.id)
      err = res.error
    }

    if (err) {
      setError('שגיאה בשמירה, נסה שוב')
    } else {
      await fetchActivities()
      closeForm()
    }
    setSaving(false)
  }

  async function handleDelete(activity) {
    if (!window.confirm(`למחוק את החוג "${activity.name}"? פעולה זו אינה הפיכה.`)) return
    setDeleting(activity.id)
    await supabase.from('activities').delete().eq('id', activity.id)
    setActivities(prev => prev.filter(a => a.id !== activity.id))
    setDeleting(null)
  }

  if (loading) return <p style={{ color: '#888', textAlign: 'center' }}>טוען...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={openNew}
          style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
        >
          + הוסף חוג חדש
        </button>
      </div>

      {/* טופס הוספה/עריכה */}
      {editing && (
        <div style={{
          background: '#f0fdf4', border: '2px solid #1a472a', borderRadius: '12px',
          padding: '24px', marginBottom: '28px',
        }}>
          <h3 style={{ color: '#1a472a', margin: '0 0 20px' }}>
            {editing === 'new' ? 'הוספת חוג חדש' : `עריכת: ${editing.name}`}
          </h3>

          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* שם */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>שם החוג <span style={{ color: '#c00' }}>*</span></label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="למשל: טניס למתחילים"
                style={inputStyle} />
            </div>

            {/* תיאור */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>תיאור (אופציונלי)</label>
              <input name="description" value={form.description} onChange={handleChange} placeholder="תיאור קצר של החוג"
                style={inputStyle} />
            </div>

            {/* יום */}
            <div>
              <label style={labelStyle}>יום בשבוע <span style={{ color: '#c00' }}>*</span></label>
              <select name="day_of_week" value={form.day_of_week} onChange={handleChange} style={inputStyle}>
                {DAYS_ORDER.map(d => (
                  <option key={d} value={d}>יום {DAYS_HE[d]}</option>
                ))}
              </select>
            </div>

            {/* שעה */}
            <div>
              <label style={labelStyle}>שעה <span style={{ color: '#c00' }}>*</span></label>
              <input name="time" value={form.time} onChange={handleChange} placeholder="למשל: 17:00"
                style={inputStyle} />
            </div>

            {/* מחיר */}
            <div>
              <label style={labelStyle}>מחיר לחודש (₪) <span style={{ color: '#c00' }}>*</span></label>
              <input name="price" value={form.price} onChange={handleChange} type="number" min="0" placeholder="300"
                style={inputStyle} />
            </div>

            {/* מקס תלמידים */}
            <div>
              <label style={labelStyle}>מקסימום תלמידים (אופציונלי)</label>
              <input name="max_students" value={form.max_students} onChange={handleChange} type="number" min="1" placeholder="10"
                style={inputStyle} />
            </div>

            {/* לינק תשלום */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>קישור לתשלום (אופציונלי)</label>
              <input name="payment_link" value={form.payment_link} onChange={handleChange}
                placeholder="https://..."
                style={inputStyle} />
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                אם לא הוגדר קישור, התשלום יישלח לקישור הכללי של האקדמיה
              </p>
            </div>

            {error && (
              <div style={{ gridColumn: '1 / -1', background: '#fff0f0', color: '#c00', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeForm}
                style={{ background: '#fff', color: '#666', border: '1px solid #ccc', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px' }}>
                ביטול
              </button>
              <button type="submit" disabled={saving}
                style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* רשימת חוגים */}
      {activities.length === 0 ? (
        <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>אין חוגים עדיין — לחץ "הוסף חוג חדש" כדי להתחיל</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.map(a => (
            <div key={a.id} style={{
              background: '#fff', borderRadius: '10px', padding: '16px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex',
              alignItems: 'center', gap: '16px', borderRight: '4px solid #1a472a',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a1a1a' }}>{a.name}</div>
                {a.description && <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>{a.description}</div>}
              </div>
              <div style={{ fontSize: '14px', color: '#333', minWidth: '160px' }}>
                <div>📅 יום {DAYS_HE[a.day_of_week]} | 🕐 {a.time}</div>
                <div style={{ marginTop: '2px' }}>💰 ₪{a.price} לחודש{a.max_students ? ` | 👥 עד ${a.max_students}` : ''}</div>
              </div>
              <div style={{ fontSize: '13px', color: a.payment_link ? '#16a34a' : '#aaa', minWidth: '100px' }}>
                {a.payment_link ? '🔗 יש קישור תשלום' : '🔗 אין קישור'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => openEdit(a)}
                  style={{ background: '#fff', color: '#1a472a', border: '1px solid #1a472a', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>
                  עריכה
                </button>
                <button onClick={() => handleDelete(a)} disabled={deleting === a.id}
                  style={{ background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', opacity: deleting === a.id ? 0.5 : 1 }}>
                  מחיקה
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: '500' }
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px', boxSizing: 'border-box', background: '#fff' }

/* ─── טאב יומן ─── */
const EMPTY_EVENT_FORM = { title: '', description: '', is_recurring: false, day_of_week: 'sunday', event_date: '', time: '' }
const STATUS_EVENT = {
  scheduled:  { label: 'מתוכנן',    color: '#f59e0b', bg: '#fffbeb' },
  completed:  { label: 'בוצע ✓',    color: '#16a34a', bg: '#f0fdf4' },
  cancelled:  { label: 'לא התקיים', color: '#dc2626', bg: '#fef2f2' },
}

function eventFormFromData(ev) {
  return {
    title: ev.title || '',
    description: ev.description || '',
    is_recurring: ev.is_recurring || false,
    day_of_week: ev.day_of_week || 'sunday',
    event_date: ev.event_date || '',
    time: ev.time || '',
  }
}

function CalendarTab() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [activities, setActivities] = useState([])
  const [adminEvents, setAdminEvents] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [selected, setSelected] = useState(null) // { type: 'activity'|'event', data, date }
  // activity attendance
  const [enrollments, setEnrollments] = useState([])
  const [attendance, setAttendance] = useState({})
  const [saving, setSaving] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  // event side-panel
  const [eventNotes, setEventNotes] = useState('')
  const [eventStatus, setEventStatus] = useState('scheduled')
  const [savingEvent, setSavingEvent] = useState(false)
  const [showDeleteOptions, setShowDeleteOptions] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState(false)
  // event players (personal training attendees)
  const [eventPlayerMap, setEventPlayerMap] = useState({}) // player_id → present
  const [loadingEventPlayers, setLoadingEventPlayers] = useState(false)
  const [savingEventPlayers, setSavingEventPlayers] = useState(false)
  // add / edit form
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null) // null = new, else event obj
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [actRes, evRes, playerRes] = await Promise.all([
      supabase.from('activities').select('*'),
      supabase.from('admin_events').select('*').order('created_at'),
      supabase.from('players').select('id, name, birth_year').order('name'),
    ])
    if (actRes.data) setActivities(actRes.data)
    if (evRes.data) setAdminEvents(evRes.data)
    if (playerRes.data) setAllPlayers(playerRes.data)
  }

  function formatDate(date) { return date.toISOString().split('T')[0] }
  function isToday(date) { return formatDate(date) === formatDate(new Date()) }

  function getWeekDays() {
    const today = new Date()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7)
    return DAYS_ORDER.map((key, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      return { key, date: d }
    })
  }

  const weekDays = getWeekDays()
  const weekLabel = (() => {
    const s = weekDays[0].date, e = weekDays[6].date
    return `${s.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })} – ${e.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })}`
  })()

  function getEventsForDay(dayKey, date) {
    const dateStr = formatDate(date)
    return adminEvents.filter(ev => {
      if (ev.end_date && dateStr > ev.end_date) return false
      return (ev.is_recurring && ev.day_of_week === dayKey) ||
             (!ev.is_recurring && ev.event_date === dateStr)
    })
  }

  async function openActivity(activity, date) {
    setSelected({ type: 'activity', data: activity, date })
    setShowEventForm(false)
    setLoadingSession(true)
    setEnrollments([]); setAttendance({})
    const dateStr = formatDate(date)
    const [enrollRes, attendRes] = await Promise.all([
      supabase.from('enrollments').select('player_id, player:players(id, name, birth_year)').eq('activity_id', activity.id).eq('status', 'active'),
      supabase.from('attendance').select('player_id, present').eq('activity_id', activity.id).eq('date', dateStr),
    ])
    if (enrollRes.data) setEnrollments(enrollRes.data)
    if (attendRes.data) {
      const map = {}
      attendRes.data.forEach(r => { map[r.player_id] = r.present })
      setAttendance(map)
    }
    setLoadingSession(false)
  }

  async function openAdminEvent(ev, date) {
    setSelected({ type: 'event', data: ev, date })
    setShowEventForm(false)
    setShowDeleteOptions(false)
    setEventNotes(ev.notes || '')
    setEventStatus(ev.status || 'scheduled')
    // טען מתאמנים לאירוע זה + תאריך
    setLoadingEventPlayers(true)
    const { data } = await supabase
      .from('admin_event_players')
      .select('player_id, present')
      .eq('event_id', ev.id)
      .eq('event_date', formatDate(date))
    const map = {}
    if (data) data.forEach(r => { map[r.player_id] = r.present })
    setEventPlayerMap(map)
    setLoadingEventPlayers(false)
  }

  async function toggleAttendance(playerId) {
    const dateStr = formatDate(selected.date)
    const newVal = attendance[playerId] === undefined ? true : !attendance[playerId]
    setAttendance(prev => ({ ...prev, [playerId]: newVal }))
    await supabase.from('attendance').upsert(
      { player_id: playerId, activity_id: selected.data.id, date: dateStr, present: newVal },
      { onConflict: 'player_id,activity_id,date' }
    )
  }

  async function saveAttendance() {
    setSaving(true)
    const dateStr = formatDate(selected.date)
    const rows = enrollments.map(e => ({
      player_id: e.player_id, activity_id: selected.data.id,
      date: dateStr, present: attendance[e.player_id] ?? false,
    }))
    await supabase.from('attendance').upsert(rows, { onConflict: 'player_id,activity_id,date' })
    setSaving(false)
  }

  async function saveEventDetails() {
    setSavingEvent(true)
    await supabase.from('admin_events').update({ notes: eventNotes, status: eventStatus }).eq('id', selected.data.id)
    setAdminEvents(prev => prev.map(ev => ev.id === selected.data.id ? { ...ev, notes: eventNotes, status: eventStatus } : ev))
    setSelected(prev => ({ ...prev, data: { ...prev.data, notes: eventNotes, status: eventStatus } }))
    setSavingEvent(false)
  }

  async function toggleEventPlayer(playerId) {
    const current = eventPlayerMap[playerId]
    const newVal = current === undefined ? true : !current
    setEventPlayerMap(prev => ({ ...prev, [playerId]: newVal }))
    await supabase.from('admin_event_players').upsert(
      { event_id: selected.data.id, player_id: playerId, event_date: formatDate(selected.date), present: newVal },
      { onConflict: 'event_id,player_id,event_date' }
    )
  }

  async function saveEventPlayers() {
    setSavingEventPlayers(true)
    const dateStr = formatDate(selected.date)
    const rows = Object.entries(eventPlayerMap).map(([player_id, present]) => ({
      event_id: selected.data.id, player_id, event_date: dateStr, present,
    }))
    if (rows.length) await supabase.from('admin_event_players').upsert(rows, { onConflict: 'event_id,player_id,event_date' })
    setSavingEventPlayers(false)
  }

  // מחיקה - כל המופעים
  async function deleteEventAll() {
    setDeletingEvent(true)
    await supabase.from('admin_events').delete().eq('id', selected.data.id)
    setAdminEvents(prev => prev.filter(ev => ev.id !== selected.data.id))
    setSelected(null)
    setDeletingEvent(false)
  }

  // מחיקה - מהיום והלאה (שומר היסטוריה)
  async function deleteEventFromNow() {
    setDeletingEvent(true)
    const yesterday = new Date(selected.date)
    yesterday.setDate(yesterday.getDate() - 1)
    const endDate = formatDate(yesterday)
    await supabase.from('admin_events').update({ end_date: endDate }).eq('id', selected.data.id)
    setAdminEvents(prev => prev.map(ev => ev.id === selected.data.id ? { ...ev, end_date: endDate } : ev))
    setSelected(null)
    setDeletingEvent(false)
  }

  function openAddForm() {
    setEditingEvent(null)
    setEventForm(EMPTY_EVENT_FORM)
    setShowEventForm(true)
    setSelected(null)
  }

  function openEditForm(ev) {
    setEditingEvent(ev)
    setEventForm(eventFormFromData(ev))
    setShowEventForm(true)
  }

  async function submitEventForm(e) {
    e.preventDefault()
    if (!eventForm.title.trim()) return
    const payload = {
      title: eventForm.title.trim(),
      description: eventForm.description.trim() || null,
      is_recurring: eventForm.is_recurring,
      day_of_week: eventForm.is_recurring ? eventForm.day_of_week : null,
      event_date: !eventForm.is_recurring ? eventForm.event_date || null : null,
      time: eventForm.time.trim() || null,
    }
    if (editingEvent) {
      await supabase.from('admin_events').update(payload).eq('id', editingEvent.id)
      setAdminEvents(prev => prev.map(ev => ev.id === editingEvent.id ? { ...ev, ...payload } : ev))
      if (selected?.data?.id === editingEvent.id) {
        setSelected(prev => ({ ...prev, data: { ...prev.data, ...payload } }))
      }
    } else {
      const { data } = await supabase.from('admin_events').insert({ ...payload, status: 'scheduled' }).select().single()
      if (data) setAdminEvents(prev => [...prev, data])
    }
    setShowEventForm(false)
    setEditingEvent(null)
    setEventForm(EMPTY_EVENT_FORM)
  }

  const presentCount = selected?.type === 'activity'
    ? enrollments.filter(e => attendance[e.player_id] === true).length : 0
  const eventPresentCount = Object.values(eventPlayerMap).filter(v => v === true).length

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {/* עמודת יומן */}
      <div style={{ flex: 1 }}>
        {/* ניווט שבוע */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button onClick={() => { setWeekOffset(w => w - 1); setSelected(null) }} style={navBtn}>◀ קודם</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', color: '#1a472a', fontSize: '16px' }}>{weekLabel}</div>
            {weekOffset !== 0 && (
              <button onClick={() => { setWeekOffset(0); setSelected(null) }}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', marginTop: '2px' }}>
                השבוע
              </button>
            )}
          </div>
          <button onClick={() => { setWeekOffset(w => w + 1); setSelected(null) }} style={navBtn}>הבא ▶</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button onClick={openAddForm}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            + הוסף אירוע אישי
          </button>
        </div>

        {/* טופס הוספה / עריכה */}
        {showEventForm && (
          <form onSubmit={submitEventForm} style={{ background: '#faf5ff', border: '2px solid #7c3aed', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: '#7c3aed', margin: '0 0 16px' }}>
              {editingEvent ? `עריכה: ${editingEvent.title}` : 'אירוע אישי חדש'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>שם האירוע *</label>
                <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                  placeholder='למשל: אימון עצמי, פגישת מאמנים...' style={inputStyle} required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>תיאור (אופציונלי)</label>
                <input value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  placeholder='פרטים נוספים' style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={eventForm.is_recurring}
                    onChange={e => setEventForm(f => ({ ...f, is_recurring: e.target.checked }))} />
                  פעילות שבועית חוזרת
                </label>
              </div>
              {eventForm.is_recurring ? (
                <div>
                  <label style={labelStyle}>יום בשבוע</label>
                  <select value={eventForm.day_of_week} onChange={e => setEventForm(f => ({ ...f, day_of_week: e.target.value }))} style={inputStyle}>
                    {DAYS_ORDER.map(d => <option key={d} value={d}>יום {DAYS_HE[d]}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>תאריך</label>
                  <input type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>שעה (אופציונלי)</label>
                <input value={eventForm.time} onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))} placeholder="09:00" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => { setShowEventForm(false); setEditingEvent(null) }}
                style={{ background: '#fff', color: '#666', border: '1px solid #ccc', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer' }}>
                ביטול
              </button>
              <button type="submit"
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontWeight: 'bold' }}>
                {editingEvent ? 'שמור שינויים' : 'הוסף'}
              </button>
            </div>
          </form>
        )}

        {/* ימי השבוע */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weekDays.map(({ key, date }) => {
            const dayActivities = activities.filter(a => a.day_of_week === key)
            const dayEvents = getEventsForDay(key, date)
            const today = isToday(date)
            const hasAnything = dayActivities.length > 0 || dayEvents.length > 0
            return (
              <div key={key} style={{
                background: today ? '#f0fdf4' : '#fff',
                border: today ? '2px solid #1a472a' : '1px solid #e5e5e5',
                borderRadius: '10px', padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: hasAnything ? '10px' : 0 }}>
                  <div style={{ minWidth: '80px' }}>
                    <div style={{ fontWeight: 'bold', color: today ? '#1a472a' : '#333', fontSize: '15px' }}>יום {DAYS_HE[key]}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                      {today && <span style={{ color: '#1a472a', fontWeight: 'bold' }}> • היום</span>}
                    </div>
                  </div>
                  {!hasAnything && <span style={{ color: '#ccc', fontSize: '13px' }}>אין פעילויות</span>}
                </div>
                {hasAnything && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {dayActivities.map(act => {
                      const isSel = selected?.type === 'activity' && selected.data.id === act.id && formatDate(selected.date) === formatDate(date)
                      return (
                        <button key={act.id} onClick={() => openActivity(act, date)} style={{
                          background: isSel ? '#1a472a' : '#e8f5e9', color: isSel ? '#fff' : '#1a472a',
                          border: 'none', borderRadius: '8px', padding: '8px 14px',
                          cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textAlign: 'right',
                        }}>
                          <div>{act.name}</div>
                          {act.time && <div style={{ fontWeight: 'normal', fontSize: '12px', opacity: 0.85 }}>🕐 {act.time}</div>}
                        </button>
                      )
                    })}
                    {dayEvents.map(ev => {
                      const isSel = selected?.type === 'event' && selected.data.id === ev.id && formatDate(selected.date) === formatDate(date)
                      const st = STATUS_EVENT[ev.status] || STATUS_EVENT.scheduled
                      return (
                        <button key={ev.id} onClick={() => openAdminEvent(ev, date)} style={{
                          background: isSel ? '#7c3aed' : '#f5f3ff', color: isSel ? '#fff' : '#7c3aed',
                          border: `1px solid ${isSel ? '#7c3aed' : '#c4b5fd'}`,
                          borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textAlign: 'right',
                        }}>
                          <div>{ev.title}</div>
                          <div style={{ fontWeight: 'normal', fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                            {ev.time && `🕐 ${ev.time}  `}
                            <span style={{ color: isSel ? '#fff' : st.color }}>{st.label}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* פאנל צד */}
      {selected && (
        <div style={{
          width: '310px', flexShrink: 0, background: '#fff', borderRadius: '12px',
          border: `2px solid ${selected.type === 'event' ? '#7c3aed' : '#1a472a'}`,
          padding: '20px', alignSelf: 'flex-start', position: 'sticky', top: '20px',
          maxHeight: '85vh', overflowY: 'auto',
        }}>
          {/* כותרת */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: selected.type === 'event' ? '#7c3aed' : '#1a472a', fontSize: '16px' }}>
                {selected.type === 'event' ? selected.data.title : selected.data.name}
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                {selected.date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {selected.type === 'event' && selected.data.is_recurring && (
                <div style={{ fontSize: '11px', color: '#9333ea', marginTop: '2px' }}>🔁 חוזר שבועי</div>
              )}
            </div>
            <button onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888', lineHeight: 1 }}>✕</button>
          </div>

          {/* ── פאנל חוג: נוכחות ── */}
          {selected.type === 'activity' && (
            loadingSession ? <p style={{ color: '#888', textAlign: 'center' }}>טוען...</p> :
            enrollments.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', fontSize: '14px' }}>אין תלמידים פעילים רשומים</p> : (
              <>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>
                  נוכחים: <strong style={{ color: '#16a34a' }}>{presentCount}</strong> / {enrollments.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
                  {enrollments.map(e => {
                    const present = attendance[e.player_id]
                    return (
                      <button key={e.player_id} onClick={() => toggleAttendance(e.player_id)} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: present === true ? '#f0fdf4' : present === false ? '#fef2f2' : '#f9f9f9',
                        border: `1px solid ${present === true ? '#16a34a' : present === false ? '#dc2626' : '#ddd'}`,
                        borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', textAlign: 'right', width: '100%',
                      }}>
                        <span style={{ fontSize: '18px', minWidth: '22px' }}>
                          {present === true ? '✅' : present === false ? '❌' : '⬜'}
                        </span>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>{e.player?.name}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>יליד {e.player?.birth_year}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <button onClick={saveAttendance} disabled={saving}
                  style={{ width: '100%', background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'שומר...' : 'שמור נוכחות'}
                </button>
              </>
            )
          )}

          {/* ── פאנל אירוע אישי ── */}
          {selected.type === 'event' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selected.data.description && (
                <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{selected.data.description}</p>
              )}

              {/* כפתור עריכה */}
              <button onClick={() => openEditForm(selected.data)}
                style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                ✏️ עריכת פרטי האירוע
              </button>

              {/* סטטוס */}
              <div>
                <label style={labelStyle}>סטטוס</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {Object.entries(STATUS_EVENT).map(([key, val]) => (
                    <label key={key} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: eventStatus === key ? val.bg : '#f9f9f9',
                      border: `1px solid ${eventStatus === key ? val.color : '#ddd'}`,
                      borderRadius: '8px', padding: '7px 12px', cursor: 'pointer',
                    }}>
                      <input type="radio" name="evstatus" value={key} checked={eventStatus === key} onChange={() => setEventStatus(key)} />
                      <span style={{ color: val.color, fontWeight: '500', fontSize: '14px' }}>{val.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* הערות */}
              <div>
                <label style={labelStyle}>הערות</label>
                <textarea value={eventNotes} onChange={e => setEventNotes(e.target.value)}
                  placeholder="הוסף הערות..." rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <button onClick={saveEventDetails} disabled={savingEvent}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', opacity: savingEvent ? 0.6 : 1 }}>
                {savingEvent ? 'שומר...' : 'שמור'}
              </button>

              {/* מתאמנים */}
              <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '14px' }}>
                <label style={{ ...labelStyle, marginBottom: '10px' }}>
                  מתאמנים ({eventPresentCount} נוכחים)
                </label>
                {loadingEventPlayers ? (
                  <p style={{ color: '#888', fontSize: '13px' }}>טוען...</p>
                ) : allPlayers.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: '13px' }}>אין שחקנים במערכת</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                      {allPlayers.map(p => {
                        const present = eventPlayerMap[p.id]
                        return (
                          <button key={p.id} onClick={() => toggleEventPlayer(p.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: present === true ? '#f0fdf4' : '#f9f9f9',
                            border: `1px solid ${present === true ? '#16a34a' : '#ddd'}`,
                            borderRadius: '7px', padding: '7px 10px', cursor: 'pointer', textAlign: 'right', width: '100%',
                          }}>
                            <span style={{ fontSize: '16px', minWidth: '20px' }}>
                              {present === true ? '✅' : '⬜'}
                            </span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '500' }}>{p.name}</div>
                              <div style={{ fontSize: '11px', color: '#888' }}>יליד {p.birth_year}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <button onClick={saveEventPlayers} disabled={savingEventPlayers}
                      style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', opacity: savingEventPlayers ? 0.6 : 1 }}>
                      {savingEventPlayers ? 'שומר...' : 'שמור נוכחות מתאמנים'}
                    </button>
                  </>
                )}
              </div>

              {/* מחיקה */}
              <div style={{ borderTop: '1px solid #fee2e2', paddingTop: '12px' }}>
                {!showDeleteOptions ? (
                  <button onClick={() => setShowDeleteOptions(true)}
                    style={{ width: '100%', background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '8px', padding: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    מחק אירוע...
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#dc2626', fontWeight: 'bold' }}>אשר מחיקה:</p>
                    {selected.data.is_recurring && (
                      <button onClick={deleteEventFromNow} disabled={deletingEvent}
                        style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '8px', padding: '8px', fontSize: '13px', cursor: 'pointer', textAlign: 'right' }}>
                        מהיום והלאה (שומר היסטוריה)
                      </button>
                    )}
                    <button onClick={deleteEventAll} disabled={deletingEvent}
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px', fontSize: '13px', cursor: 'pointer', textAlign: 'right' }}>
                      מחק הכל לחלוטין
                    </button>
                    <button onClick={() => setShowDeleteOptions(false)}
                      style={{ background: '#f9f9f9', color: '#666', border: '1px solid #ddd', borderRadius: '8px', padding: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      ביטול
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: '#fff', border: '1px solid #ddd', borderRadius: '8px',
  padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#333',
}
