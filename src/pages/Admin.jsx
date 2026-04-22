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
