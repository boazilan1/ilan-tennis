import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TournamentsTab from './AdminTournaments'
import AdminSections from './AdminSections'
import AdminContact from './AdminContact'
import AdminPages from './AdminPages'
import AdminSettings from './AdminSettings'
import AdminLocations from './AdminLocations'

const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}
const DAYS_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function formatDays(a) {
  const days = a.days_of_week?.length ? a.days_of_week : (a.day_of_week ? [a.day_of_week] : [])
  return days.map(d => DAYS_HE[d]).filter(Boolean).join(', ') || '—'
}

const STATUS_LABELS = {
  pending:   { label: 'ממתין לתשלום', color: '#d97706', bg: '#fef3c7' },
  active:    { label: 'שילם ✓',       color: '#16a34a', bg: '#dcfce7' },
  cancelled: { label: 'בוטל',         color: '#dc2626', bg: '#fee2e2' },
}

const EMPTY_FORM = {
  name: '', description: '', days_of_week: [], age_group: '', location_id: '',
  time: '', price: '', max_students: '', payment_link: '', image_url: '',
}

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('calendar')

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate('/')
  }, [user, isAdmin, loading, navigate])

  if (loading) {
    return (
      <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
          <div style={{ color: '#888', fontSize: '15px' }}>טוען...</div>
        </div>
      </main>
    )
  }

  const TABS = [
    { key: 'enrollments', label: 'הרשמות' },
    { key: 'trainees',    label: 'מתאמנים' },
    { key: 'activities',  label: 'חוגים' },
    { key: 'locations',   label: 'מיקומים' },
    { key: 'calendar',    label: 'יומן' },
    { key: 'tournaments', label: 'תחרויות' },
    { key: 'sections',    label: 'תוכן' },
    { key: 'pages',       label: 'דפים' },
    { key: 'contact',     label: 'פניות' },
    { key: 'settings',    label: 'הגדרות' },
  ]

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
        padding: '0',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 28px 0' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '3px', marginBottom: '8px' }}>
            TENNIS ACADEMY
          </div>
          <h1 style={{ color: '#fff', margin: '0 0 28px', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            פאנל ניהול
          </h1>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: 'transparent',
                color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.5)',
                border: 'none',
                borderBottom: tab === t.key ? '3px solid #4ade80' : '3px solid transparent',
                padding: '12px 22px',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                letterSpacing: '0.2px', transition: 'color 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 28px' }}>
        {tab === 'enrollments' && <EnrollmentsTab />}
        {tab === 'trainees'    && <TraineesTab />}
        {tab === 'activities'  && <ActivitiesTab />}
        {tab === 'locations'   && <AdminLocations />}
        {tab === 'calendar'    && <CalendarTab />}
        {tab === 'tournaments' && <TournamentsTab />}
        {tab === 'sections'    && <AdminSections />}
        {tab === 'pages'       && <AdminPages />}
        {tab === 'contact'     && <AdminContact />}
        {tab === 'settings'    && <AdminSettings />}
      </div>
    </main>
  )
}

/* ─── Enrollment Tab ─── */
function EnrollmentsTab() {
  const [enrollments, setEnrollments] = useState([])
  const [activities, setActivities] = useState({})
  const [locations, setLocations] = useState([])
  const [filter, setFilter] = useState('all')
  const [dataLoading, setDataLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setDataLoading(true)
    const [enrollRes, actRes, locRes] = await Promise.all([
      supabase.from('enrollments').select(`
        id, status, created_at, activity_id, payment_redirect_at,
        player:players(name, birth_year),
        profile:profiles!enrollments_user_id_fkey(full_name, phone, email)
      `).order('created_at', { ascending: false }),
      supabase.from('activities').select('*'),
      supabase.from('locations').select('*').order('sort_order'),
    ])
    if (enrollRes.data) setEnrollments(enrollRes.data)
    if (actRes.data) {
      const map = {}
      actRes.data.forEach(a => { map[a.id] = a })
      setActivities(map)
    }
    if (locRes.data) setLocations(locRes.data)
    setDataLoading(false)
  }

  async function updateStatus(enrollment, activity, newStatus) {
    const id = enrollment.id
    setUpdating(id)
    await supabase.from('enrollments').update({ status: newStatus }).eq('id', id)
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e))
    setUpdating(null)

    if (newStatus === 'active' && enrollment.profile?.email) {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment_confirmed',
          registrantEmail: enrollment.profile.email,
          playerName: enrollment.player?.name || '',
          activityName: activity?.name || '',
        }),
      }).catch(err => console.error('notify email failed', err))
    }
  }

  async function deleteEnrollment(id, playerName) {
    if (!window.confirm(`למחוק לצמיתות את ההרשמה של ${playerName || 'התלמיד'}?`)) return
    setUpdating(id)
    await supabase.from('enrollments').delete().eq('id', id)
    setEnrollments(prev => prev.filter(e => e.id !== id))
    setUpdating(null)
  }

  const filtered = filter === 'all' ? enrollments : enrollments.filter(e => e.status === filter)
  const counts = {
    all: enrollments.length,
    pending: enrollments.filter(e => e.status === 'pending').length,
    active: enrollments.filter(e => e.status === 'active').length,
    cancelled: enrollments.filter(e => e.status === 'cancelled').length,
  }

  const locationOrder = {}
  locations.forEach((l, i) => { locationOrder[l.id] = i })

  const activityGroupsMap = {}
  filtered.forEach(e => {
    const key = e.activity_id || 'none'
    if (!activityGroupsMap[key]) activityGroupsMap[key] = []
    activityGroupsMap[key].push(e)
  })
  const activityGroups = Object.entries(activityGroupsMap).map(([activityId, items]) => {
    const activity = activities[activityId]
    const location = activity?.location_id ? locations.find(l => l.id === activity.location_id) : null
    return { activityId, activity, location, items }
  })

  const locationSectionsMap = {}
  activityGroups.forEach(g => {
    const locKey = g.location?.id || 'none'
    if (!locationSectionsMap[locKey]) locationSectionsMap[locKey] = { location: g.location, groups: [] }
    locationSectionsMap[locKey].groups.push(g)
  })
  const locationSections = Object.values(locationSectionsMap).sort((a, b) => {
    const oa = a.location ? (locationOrder[a.location.id] ?? 999) : 1000
    const ob = b.location ? (locationOrder[b.location.id] ?? 999) : 1000
    return oa - ob
  })
  locationSections.forEach(section => {
    section.groups.sort((a, b) => (a.activity?.name || '').localeCompare(b.activity?.name || '', 'he'))
  })

  if (dataLoading) return <LoadingSpinner />

  return (
    <div>
      <SectionHeader title="הרשמות" action={{ label: 'רענן', onClick: fetchData }} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { key: 'all',       label: 'סה"כ',    color: '#1a472a' },
          { key: 'pending',   label: 'ממתינים', color: '#d97706' },
          { key: 'active',    label: 'שילמו',   color: '#16a34a' },
          { key: 'cancelled', label: 'בוטלו',   color: '#dc2626' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            background: filter === key ? color : '#fff',
            border: `1px solid ${filter === key ? color : '#e8ece8'}`,
            borderRadius: '16px', padding: '20px',
            cursor: 'pointer', textAlign: 'right',
            boxShadow: filter === key ? `0 6px 20px ${color}35` : '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '34px', fontWeight: '800', color: filter === key ? '#fff' : color, lineHeight: 1 }}>{counts[key]}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: filter === key ? 'rgba(255,255,255,0.75)' : '#999', marginTop: '6px' }}>{label}</div>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="אין הרשמות" />
      ) : (
        <div>
          {locationSections.map(section => (
            <div key={section.location?.id || 'none'} style={{ marginBottom: '28px' }}>
              <div style={{
                fontSize: '13px', fontWeight: '800', color: '#1a472a',
                marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e8ece8',
              }}>
                📍 {section.location?.name || 'ללא מיקום'}
              </div>
              {section.groups.map(g => (
                <div key={g.activityId} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: '#111' }}>{g.activity?.name || 'ללא חוג'}</span>
                      {g.activity && (
                        <span style={{ fontSize: '12px', color: '#aaa', marginRight: '8px' }}>
                          יום {formatDays(g.activity)} · {g.activity.time} · ₪{g.activity.price}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '12px', fontWeight: '700', color: '#1a472a', background: '#eef5ee',
                      borderRadius: '20px', padding: '3px 12px', whiteSpace: 'nowrap',
                    }}>{g.items.length} נרשמים</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {g.items.map(e => {
                      const st = STATUS_LABELS[e.status] || STATUS_LABELS.pending
                      const date = new Date(e.created_at).toLocaleDateString('he-IL')
                      return (
                        <div key={e.id} style={{
                          background: '#fff', borderRadius: '16px', padding: '16px 20px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex',
                          alignItems: 'center', gap: '16px', border: '1px solid #f0f0f0',
                          borderRight: `4px solid ${st.color}`,
                        }}>
                          <div style={{ flex: '1.5' }}>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#111' }}>{e.player?.name || '—'}</div>
                            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>יליד {e.player?.birth_year}</div>
                          </div>
                          <div style={{ flex: '1.5' }}>
                            <div style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>{e.profile?.full_name || '—'}</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>{e.profile?.phone || ''}</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>{e.profile?.email || ''}</div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#bbb', minWidth: '70px', textAlign: 'center' }}>{date}</div>
                          {e.status === 'pending' && e.payment_redirect_at && (
                            <span title={`חזר מהתשלום ב-${new Date(e.payment_redirect_at).toLocaleString('he-IL')}`} style={{
                              fontSize: '11px', fontWeight: '700', color: '#b45309', background: '#fffbeb',
                              border: '1px solid #fde68a', borderRadius: '20px', padding: '4px 10px', whiteSpace: 'nowrap',
                            }}>חזר מתשלום ✓</span>
                          )}
                          <StatusPill label={st.label} color={st.color} bg={st.bg} />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {e.status !== 'active' && (
                              <ActionBtn label="אשר תשלום" color="#16a34a" onClick={() => updateStatus(e, g.activity, 'active')} disabled={updating === e.id} />
                            )}
                            {e.status !== 'cancelled' && (
                              <ActionBtn label="ביטול" color="#dc2626" outline onClick={() => updateStatus(e, g.activity, 'cancelled')} disabled={updating === e.id} />
                            )}
                            {e.status === 'cancelled' && (
                              <ActionBtn label="שחזר" color="#888" outline onClick={() => updateStatus(e, g.activity, 'pending')} disabled={updating === e.id} />
                            )}
                            <ActionBtn label="מחק" color="#dc2626" outline onClick={() => deleteEnrollment(e.id, e.player?.name)} disabled={updating === e.id} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Trainees Tab ─── */
const STATUS_TRAINEE = {
  active:    { label: 'פעיל',          color: '#16a34a', bg: '#dcfce7' },
  pending:   { label: 'ממתין לתשלום', color: '#d97706', bg: '#fef3c7' },
  cancelled: { label: 'בוטל',          color: '#dc2626', bg: '#fee2e2' },
  none:      { label: 'לא רשום',       color: '#9ca3af', bg: '#f3f4f6' },
}

function overallStatus(enrollments) {
  if (!enrollments || enrollments.length === 0) return 'none'
  if (enrollments.some(e => e.status === 'active')) return 'active'
  if (enrollments.some(e => e.status === 'pending')) return 'pending'
  return 'cancelled'
}

function TraineesTab() {
  const { user } = useAuth()
  const [players, setPlayers] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', birth_year: '', notes: '' })
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', birth_year: '', notes: '' })

  useEffect(() => { fetchPlayers() }, [])

  async function fetchPlayers() {
    setLoading(true)
    const [playerRes, profileRes, locRes] = await Promise.all([
      supabase.from('players').select(`
        id, name, birth_year, notes, user_id,
        enrollments(status, activity:activities(id, name, location_id, days_of_week, day_of_week, time, price))
      `).order('name'),
      supabase.from('profiles').select('id, full_name, phone'),
      supabase.from('locations').select('*').order('sort_order'),
    ])
    if (playerRes.data && profileRes.data) {
      const profileMap = {}
      profileRes.data.forEach(p => { profileMap[p.id] = p })
      setPlayers(playerRes.data.map(p => ({ ...p, profile: profileMap[p.user_id] || null })))
    }
    if (locRes.data) setLocations(locRes.data)
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setAddError('')
    if (!addForm.name.trim()) { setAddError('יש להזין שם'); return }
    const year = parseInt(addForm.birth_year)
    if (!year || year < 1940 || year > new Date().getFullYear()) { setAddError('שנת לידה לא תקינה'); return }
    setAdding(true)
    const { data, error } = await supabase.from('players')
      .insert({ name: addForm.name.trim(), birth_year: year, notes: addForm.notes.trim() || null, user_id: user.id })
      .select().single()
    if (error) { setAddError('שגיאה בהוספה'); setAdding(false); return }
    setPlayers(prev => [...prev, { ...data, enrollments: [], profile: null }].sort((a, b) => a.name.localeCompare('he', b.name)))
    setAddForm({ name: '', birth_year: '', notes: '' })
    setShowAddForm(false)
    setAdding(false)
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditForm({ name: p.name, birth_year: String(p.birth_year), notes: p.notes || '' })
    setShowAddForm(false)
  }

  async function saveEdit(playerId) {
    const year = parseInt(editForm.birth_year)
    if (!editForm.name.trim() || !year) return
    await supabase.from('players').update({
      name: editForm.name.trim(), birth_year: year, notes: editForm.notes.trim() || null,
    }).eq('id', playerId)
    setPlayers(prev => prev.map(p => p.id === playerId
      ? { ...p, name: editForm.name.trim(), birth_year: year, notes: editForm.notes.trim() || null } : p))
    setEditingId(null)
  }

  function matchesSearch(p) {
    return !search || p.name.includes(search) || p.profile?.full_name?.includes(search) || p.profile?.phone?.includes(search)
  }

  const counts = {
    all: players.length,
    active: players.filter(p => overallStatus(p.enrollments) === 'active').length,
    pending: players.filter(p => overallStatus(p.enrollments) === 'pending').length,
    cancelled: players.filter(p => overallStatus(p.enrollments) === 'cancelled').length,
    none: players.filter(p => overallStatus(p.enrollments) === 'none').length,
  }

  const entries = []
  players.filter(matchesSearch).forEach(p => {
    const relevant = (p.enrollments || []).filter(e => filterStatus === 'all' || e.status === filterStatus)
    if (relevant.length > 0) {
      relevant.forEach(e => entries.push({ player: p, enrollment: e }))
    } else if ((filterStatus === 'all' || filterStatus === 'none') && (!p.enrollments || p.enrollments.length === 0)) {
      entries.push({ player: p, enrollment: null })
    }
  })

  const locationOrder = {}
  locations.forEach((l, i) => { locationOrder[l.id] = i })

  const activityGroupsMap = {}
  entries.forEach(entry => {
    const key = entry.enrollment?.activity?.id || 'none'
    if (!activityGroupsMap[key]) activityGroupsMap[key] = []
    activityGroupsMap[key].push(entry)
  })
  const activityGroups = Object.entries(activityGroupsMap).map(([activityId, items]) => {
    const activity = items[0].enrollment?.activity || null
    const location = activity?.location_id ? locations.find(l => l.id === activity.location_id) : null
    return { activityId, activity, location, items }
  })

  const locationSectionsMap = {}
  activityGroups.forEach(g => {
    const locKey = g.location?.id || 'none'
    if (!locationSectionsMap[locKey]) locationSectionsMap[locKey] = { location: g.location, groups: [] }
    locationSectionsMap[locKey].groups.push(g)
  })
  const locationSections = Object.values(locationSectionsMap).sort((a, b) => {
    const oa = a.location ? (locationOrder[a.location.id] ?? 999) : 1000
    const ob = b.location ? (locationOrder[b.location.id] ?? 999) : 1000
    return oa - ob
  })
  locationSections.forEach(section => {
    section.groups.sort((a, b) => (a.activity?.name || '').localeCompare(b.activity?.name || '', 'he'))
  })

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <SectionHeader
        title={`מתאמנים · ${players.length}`}
        action={{ label: showAddForm ? 'סגור' : '+ הוסף מתאמן', onClick: () => { setShowAddForm(f => !f); setAddError('') } }}
      />

      {/* Add Form */}
      {showAddForm && (
        <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 16px rgba(26,71,42,0.08)' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a472a', marginBottom: '16px' }}>הוספת מתאמן חדש</div>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>שם מלא *</label>
              <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="שם פרטי ושם משפחה" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>שנת לידה *</label>
              <input type="number" value={addForm.birth_year} onChange={e => setAddForm(f => ({ ...f, birth_year: e.target.value }))} placeholder="2015" min="1940" max={new Date().getFullYear()} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>הערות (אופציונלי)</label>
              <input value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="רמה, בעיות בריאות וכו'" style={inputStyle} />
            </div>
            {addError && <div style={{ gridColumn: '1 / -1', color: '#dc2626', fontSize: '13px' }}>{addError}</div>}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={outlineBtn}>ביטול</button>
              <button type="submit" disabled={adding} style={{ ...primaryBtn, opacity: adding ? 0.6 : 1 }}>{adding ? 'מוסיף...' : 'הוסף'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'הכל', color: '#1a472a' },
          { key: 'active', label: 'פעילים', color: '#16a34a' },
          { key: 'pending', label: 'ממתינים', color: '#d97706' },
          { key: 'cancelled', label: 'בוטלו', color: '#dc2626' },
          { key: 'none', label: 'לא רשומים', color: '#9ca3af' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilterStatus(key)} style={{
            background: filterStatus === key ? color : '#fff',
            color: filterStatus === key ? '#fff' : color,
            border: `1px solid ${filterStatus === key ? color : '#ddd'}`,
            borderRadius: '20px', padding: '5px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
          }}>{label} ({counts[key]})</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '15px' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, הורה או טלפון..."
          style={{ ...inputStyle, paddingRight: '38px' }} />
      </div>

      {entries.length === 0 ? <EmptyState text="לא נמצאו מתאמנים" /> : (
        <div>
          {locationSections.map(section => (
            <div key={section.location?.id || 'none'} style={{ marginBottom: '28px' }}>
              <div style={{
                fontSize: '13px', fontWeight: '800', color: '#1a472a',
                marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e8ece8',
              }}>
                📍 {section.location?.name || 'ללא מיקום'}
              </div>
              {section.groups.map(g => (
                <div key={g.activityId} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: '#111' }}>{g.activity?.name || 'ללא חוג'}</span>
                      {g.activity && (
                        <span style={{ fontSize: '12px', color: '#aaa', marginRight: '8px' }}>
                          יום {formatDays(g.activity)} · {g.activity.time} · ₪{g.activity.price}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '12px', fontWeight: '700', color: '#1a472a', background: '#eef5ee',
                      borderRadius: '20px', padding: '3px 12px', whiteSpace: 'nowrap',
                    }}>{g.items.length} מתאמנים</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {g.items.map(({ player: p, enrollment }) => {
                      const stInfo = STATUS_TRAINEE[enrollment?.status || 'none']
                      return (
                        <div key={`${p.id}-${enrollment?.activity?.id || 'none'}`} style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', borderRight: `4px solid ${stInfo.color}`, overflow: 'hidden' }}>
                          {editingId !== p.id ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr auto auto', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '15px', color: '#111' }}>{p.name}</div>
                                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>יליד {p.birth_year}</div>
                                {p.notes && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '3px' }}>📝 {p.notes}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', color: '#444', fontWeight: '500' }}>{p.profile?.full_name || '—'}</div>
                                <div style={{ fontSize: '12px', color: '#aaa' }}>{p.profile?.phone || ''}</div>
                              </div>
                              <StatusPill label={stInfo.label} color={stInfo.color} bg={stInfo.bg} />
                              <button onClick={() => startEdit(p)} style={outlineBtn}>עריכה</button>
                            </div>
                          ) : (
                            <div style={{ padding: '16px 20px', background: '#f9fdf9' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                <div><label style={labelStyle}>שם מלא</label><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} /></div>
                                <div><label style={labelStyle}>שנת לידה</label><input type="number" value={editForm.birth_year} onChange={e => setEditForm(f => ({ ...f, birth_year: e.target.value }))} style={inputStyle} /></div>
                                <div><label style={labelStyle}>הערות</label><input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} /></div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditingId(null)} style={outlineBtn}>ביטול</button>
                                <button onClick={() => saveEdit(p.id)} style={primaryBtn}>שמור</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Activities Tab ─── */
function ActivitiesTab() {
  const [activities, setActivities] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { fetchActivities() }, [])

  async function fetchActivities() {
    setLoading(true)
    const [actRes, locRes] = await Promise.all([
      supabase.from('activities').select('*').order('sort_order').order('time'),
      supabase.from('locations').select('*').order('sort_order'),
    ])
    if (actRes.data) setActivities(actRes.data)
    if (locRes.data) setLocations(locRes.data)
    setLoading(false)
  }

  function toggleDay(day) {
    setForm(f => ({ ...f, days_of_week: f.days_of_week.includes(day) ? f.days_of_week.filter(d => d !== day) : [...f.days_of_week, day] }))
  }

  async function moveActivity(id, dir) {
    const idx = activities.findIndex(a => a.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= activities.length) return
    const a = activities[idx], b = activities[swapIdx]
    await Promise.all([
      supabase.from('activities').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('activities').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetchActivities()
  }

  function openNew() { setForm(EMPTY_FORM); setEditing('new'); setError('') }
  function openEdit(a) {
    setForm({
      name: a.name || '', description: a.description || '',
      days_of_week: a.days_of_week?.length ? a.days_of_week : (a.day_of_week ? [a.day_of_week] : []),
      age_group: a.age_group || '', location_id: a.location_id || '',
      time: a.time || '', price: a.price != null ? String(a.price) : '', max_students: a.max_students != null ? String(a.max_students) : '', payment_link: a.payment_link || '', image_url: a.image_url || '',
    })
    setEditing(a); setError('')
  }
  function closeForm() { setEditing(null); setError('') }
  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('יש להזין שם חוג'); return }
    if (form.days_of_week.length === 0) { setError('יש לבחור לפחות יום אחד'); return }
    if (!form.time.trim()) { setError('יש להזין שעה'); return }
    if (!form.price || isNaN(Number(form.price))) { setError('יש להזין מחיר תקין'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(), description: form.description.trim() || null,
      days_of_week: form.days_of_week, day_of_week: form.days_of_week[0] || null,
      age_group: form.age_group.trim() || null, location_id: form.location_id || null,
      time: form.time.trim(), price: Number(form.price), max_students: form.max_students ? Number(form.max_students) : null, payment_link: form.payment_link.trim() || null, image_url: form.image_url.trim() || null,
    }
    const maxOrder = activities.length ? Math.max(...activities.map(a => a.sort_order || 0)) : 0
    const res = editing === 'new' ? await supabase.from('activities').insert({ ...payload, sort_order: maxOrder + 1 }) : await supabase.from('activities').update(payload).eq('id', editing.id)
    if (res.error) { setError('שגיאה בשמירה') } else { await fetchActivities(); closeForm() }
    setSaving(false)
  }

  async function handleDelete(a) {
    if (!window.confirm(`למחוק את "${a.name}"?`)) return
    setDeleting(a.id)
    await supabase.from('activities').delete().eq('id', a.id)
    setActivities(prev => prev.filter(x => x.id !== a.id))
    setDeleting(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <SectionHeader title="ניהול חוגים" action={{ label: '+ חוג חדש', onClick: openNew }} />

      {editing && (
        <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 16px rgba(26,71,42,0.08)' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a472a', marginBottom: '20px' }}>
            {editing === 'new' ? 'חוג חדש' : `עריכה: ${editing.name}`}
          </div>
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>שם החוג *</label><input name="name" value={form.name} onChange={handleChange} placeholder="טניס למתחילים" style={inputStyle} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>תיאור</label><input name="description" value={form.description} onChange={handleChange} placeholder="תיאור קצר" style={inputStyle} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>ימים בשבוע * (אפשר לבחור כמה)</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {DAYS_ORDER.map(d => {
                  const active = form.days_of_week.includes(d)
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)} style={{
                      background: active ? '#1a472a' : '#fff', color: active ? '#fff' : '#555',
                      border: `1px solid ${active ? '#1a472a' : '#ddd'}`, borderRadius: '20px',
                      padding: '7px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '700' : '400',
                    }}>{DAYS_HE[d]}</button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={labelStyle}>מיקום</label>
              <select name="location_id" value={form.location_id} onChange={handleChange} style={inputStyle}>
                <option value="">— ללא מיקום —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>שעה *</label><input name="time" value={form.time} onChange={handleChange} placeholder="17:00" style={inputStyle} /></div>
            <div><label style={labelStyle}>קבוצת גיל</label><input name="age_group" value={form.age_group} onChange={handleChange} placeholder="8-12 / מבוגרים" style={inputStyle} /></div>
            <div><label style={labelStyle}>מחיר לחודש (₪) *</label><input name="price" value={form.price} onChange={handleChange} type="number" min="0" placeholder="300" style={inputStyle} /></div>
            <div><label style={labelStyle}>מקסימום תלמידים</label><input name="max_students" value={form.max_students} onChange={handleChange} type="number" min="1" placeholder="10" style={inputStyle} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>קישור לתשלום</label>
              <input name="payment_link" value={form.payment_link} onChange={handleChange} placeholder="https://..." style={inputStyle} />
              <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>ריק = קישור כללי של האקדמיה</div>
            </div>
            {error && <div style={{ gridColumn: '1 / -1', background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>{error}</div>}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeForm} style={outlineBtn}>ביטול</button>
              <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'שומר...' : 'שמור'}</button>
            </div>
          </form>
        </div>
      )}

      {activities.length === 0 ? (
        <EmptyState text='אין חוגים עדיין — לחץ "+ חוג חדש" להתחיל' />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.map(a => (
            <div key={a.id} style={{ background: '#fff', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #f0f0f0', borderRight: '4px solid #1a472a' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#111' }}>{a.name}</div>
                {a.description && <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{a.description}</div>}
              </div>
              <div style={{ fontSize: '13px', color: '#555', minWidth: '180px' }}>
                <div style={{ fontWeight: '500' }}>📅 {formatDays(a)} · 🕐 {a.time}{a.age_group ? ` · 🎯 ${a.age_group}` : ''}</div>
                <div style={{ marginTop: '3px', color: '#888' }}>
                  💰 ₪{a.price} לחודש{a.max_students ? ` · 👥 עד ${a.max_students}` : ''}
                  {a.location_id && locations.find(l => l.id === a.location_id) ? ` · 📍 ${locations.find(l => l.id === a.location_id).name}` : ''}
                </div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: a.payment_link ? '#16a34a' : '#ccc' }}>
                {a.payment_link ? '🔗 קישור תשלום' : '🔗 ללא קישור'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <button onClick={() => moveActivity(a.id, -1)} disabled={activities.indexOf(a) === 0} style={{ background: '#f5f5f5', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px', opacity: activities.indexOf(a) === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => moveActivity(a.id, 1)} disabled={activities.indexOf(a) === activities.length - 1} style={{ background: '#f5f5f5', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px', opacity: activities.indexOf(a) === activities.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => openEdit(a)} style={outlineBtn}>עריכה</button>
                <button onClick={() => handleDelete(a)} disabled={deleting === a.id} style={{ ...outlineBtn, color: '#dc2626', borderColor: '#dc2626', opacity: deleting === a.id ? 0.5 : 1 }}>מחיקה</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Shared styles ─── */
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#555', fontWeight: '600' }
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0e7e0', fontSize: '14px', boxSizing: 'border-box', background: '#fff', outline: 'none' }
const primaryBtn = { background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }
const outlineBtn = { background: '#fff', color: '#444', border: '1px solid #ddd', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }

/* ─── Calendar Tab ─── */
const EMPTY_EVENT_FORM = { title: '', description: '', is_recurring: false, day_of_week: 'sunday', event_date: '', time: '' }
const STATUS_EVENT = {
  scheduled: { label: 'מתוכנן',    color: '#d97706', bg: '#fef3c7' },
  completed: { label: 'בוצע ✓',    color: '#16a34a', bg: '#dcfce7' },
  cancelled: { label: 'לא התקיים', color: '#dc2626', bg: '#fee2e2' },
}

function eventFormFromData(ev) {
  return { title: ev.title || '', description: ev.description || '', is_recurring: ev.is_recurring || false, day_of_week: ev.day_of_week || 'sunday', event_date: ev.event_date || '', time: ev.time || '' }
}

function CalendarTab() {
  const [viewMode, setViewMode] = useState('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [activities, setActivities] = useState([])
  const [adminEvents, setAdminEvents] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [selected, setSelected] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [attendance, setAttendance] = useState({})
  const [saving, setSaving] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [activitySession, setActivitySession] = useState({ status: 'scheduled', notes: '' })
  const [savingSession, setSavingSession] = useState(false)
const [addPlayerSearch, setAddPlayerSearch] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [eventNotes, setEventNotes] = useState('')
  const [eventStatus, setEventStatus] = useState('scheduled')
  const [savingEvent, setSavingEvent] = useState(false)
  const [showDeleteOptions, setShowDeleteOptions] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState(false)
  const [eventPlayerMap, setEventPlayerMap] = useState({})
  const [loadingEventPlayers, setLoadingEventPlayers] = useState(false)
  const [savingEventPlayers, setSavingEventPlayers] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [eventRoster, setEventRoster] = useState(new Set())
  const [rosterForm, setRosterForm] = useState({})
  const [rosterSearch, setRosterSearch] = useState('')
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [actRes, evRes, playerRes] = await Promise.all([
      supabase.from('activities').select('*'),
      supabase.from('admin_events').select('*').order('created_at'),
      supabase.from('players').select('id, name, birth_year, user_id').order('name'),
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

  function getMonthBase() {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  }

  function getMonthDays() {
    const base = getMonthBase()
    const year = base.getFullYear(), month = base.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay()
    const days = []
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(firstDay); d.setDate(d.getDate() - (i + 1)); days.push({ date: d, inMonth: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), inMonth: true })
    const remaining = (7 - days.length % 7) % 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(lastDay); d.setDate(lastDay.getDate() + i); days.push({ date: d, inMonth: false })
    }
    const weeks = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
    return weeks
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
      return (ev.is_recurring && ev.day_of_week === dayKey) || (!ev.is_recurring && ev.event_date === dateStr)
    })
  }

  async function openActivity(activity, date) {
    setSelected({ type: 'activity', data: activity, date })
    setShowEventForm(false); setShowAddPlayer(false); setAddPlayerSearch('')
    setLoadingSession(true); setEnrollments([]); setAttendance({})
    setActivitySession({ status: 'scheduled', notes: '' })
    const dateStr = formatDate(date)
    const [enrollRes, attendRes, sessionRes] = await Promise.all([
      supabase.from('enrollments').select('player_id, player:players(id, name, birth_year)').eq('activity_id', activity.id).eq('status', 'active'),
      supabase.from('attendance').select('player_id, present').eq('activity_id', activity.id).eq('date', dateStr),
      supabase.from('activity_sessions').select('status, notes').eq('activity_id', activity.id).eq('session_date', dateStr).maybeSingle(),
    ])
    if (enrollRes.data) setEnrollments(enrollRes.data)
    if (attendRes.data) { const map = {}; attendRes.data.forEach(r => { map[r.player_id] = r.present }); setAttendance(map) }
    if (sessionRes.data) setActivitySession({ status: sessionRes.data.status || 'scheduled', notes: sessionRes.data.notes || '' })
    setLoadingSession(false)
  }

  async function openAdminEvent(ev, date) {
    setSelected({ type: 'event', data: ev, date })
    setShowEventForm(false); setShowDeleteOptions(false)
    setEventNotes(ev.notes || ''); setEventStatus(ev.status || 'scheduled')
    setLoadingEventPlayers(true)
    const [rosterRes, attendRes] = await Promise.all([
      supabase.from('admin_event_roster').select('player_id').eq('event_id', ev.id),
      supabase.from('admin_event_players').select('player_id, present').eq('event_id', ev.id).eq('event_date', formatDate(date)),
    ])
    setEventRoster(new Set((rosterRes.data || []).map(r => r.player_id)))
    const map = {}; if (attendRes.data) attendRes.data.forEach(r => { map[r.player_id] = r.present }); setEventPlayerMap(map)
    setLoadingEventPlayers(false)
  }

  async function toggleAttendance(playerId) {
    const dateStr = formatDate(selected.date)
    const newVal = attendance[playerId] === undefined ? true : !attendance[playerId]
    setAttendance(prev => ({ ...prev, [playerId]: newVal }))
    await supabase.from('attendance').upsert({ player_id: playerId, activity_id: selected.data.id, date: dateStr, present: newVal }, { onConflict: 'player_id,activity_id,date' })
  }

  async function saveAttendance() {
    setSaving(true)
    const rows = enrollments.map(e => ({ player_id: e.player_id, activity_id: selected.data.id, date: formatDate(selected.date), present: attendance[e.player_id] ?? false }))
    await supabase.from('attendance').upsert(rows, { onConflict: 'player_id,activity_id,date' })
    setSaving(false)
  }

  async function saveActivitySession() {
    setSavingSession(true)
    await supabase.from('activity_sessions').upsert({ activity_id: selected.data.id, session_date: formatDate(selected.date), status: activitySession.status, notes: activitySession.notes || null }, { onConflict: 'activity_id,session_date' })
    setSavingSession(false)
  }

  async function addPlayerToActivity(playerId) {
    setAddingPlayer(true)
    const player = allPlayers.find(p => p.id === playerId)
    const { data: existing } = await supabase.from('enrollments').select('id, status').eq('activity_id', selected.data.id).eq('player_id', playerId).maybeSingle()
    if (existing) { if (existing.status !== 'active') await supabase.from('enrollments').update({ status: 'active' }).eq('id', existing.id) }
    else await supabase.from('enrollments').insert({ activity_id: selected.data.id, player_id: playerId, user_id: player?.user_id || null, status: 'active' })
    const { data } = await supabase.from('enrollments').select('player_id, player:players(id, name, birth_year)').eq('activity_id', selected.data.id).eq('status', 'active')
    if (data) setEnrollments(data)
    setShowAddPlayer(false); setAddPlayerSearch(''); setAddingPlayer(false)
  }

  async function saveEventDetails() {
    setSavingEvent(true)
    await supabase.from('admin_events').update({ notes: eventNotes, status: eventStatus }).eq('id', selected.data.id)
    setAdminEvents(prev => prev.map(ev => ev.id === selected.data.id ? { ...ev, notes: eventNotes, status: eventStatus } : ev))
    setSelected(prev => ({ ...prev, data: { ...prev.data, notes: eventNotes, status: eventStatus } }))
    setSavingEvent(false)
  }

  async function toggleEventPlayer(playerId) {
    const newVal = eventPlayerMap[playerId] === undefined ? true : !eventPlayerMap[playerId]
    setEventPlayerMap(prev => ({ ...prev, [playerId]: newVal }))
    await supabase.from('admin_event_players').upsert({ event_id: selected.data.id, player_id: playerId, event_date: formatDate(selected.date), present: newVal }, { onConflict: 'event_id,player_id,event_date' })
  }

  async function saveEventPlayers() {
    setSavingEventPlayers(true)
    const rows = Object.entries(eventPlayerMap).map(([player_id, present]) => ({ event_id: selected.data.id, player_id, event_date: formatDate(selected.date), present }))
    if (rows.length) await supabase.from('admin_event_players').upsert(rows, { onConflict: 'event_id,player_id,event_date' })
    setSavingEventPlayers(false)
  }

  async function deleteEventAll() {
    setDeletingEvent(true)
    await supabase.from('admin_events').delete().eq('id', selected.data.id)
    setAdminEvents(prev => prev.filter(ev => ev.id !== selected.data.id))
    setSelected(null); setDeletingEvent(false)
  }

  async function deleteEventFromNow() {
    setDeletingEvent(true)
    const yesterday = new Date(selected.date); yesterday.setDate(yesterday.getDate() - 1)
    const endDate = formatDate(yesterday)
    await supabase.from('admin_events').update({ end_date: endDate }).eq('id', selected.data.id)
    setAdminEvents(prev => prev.map(ev => ev.id === selected.data.id ? { ...ev, end_date: endDate } : ev))
    setSelected(null); setDeletingEvent(false)
  }

  async function openEditForm(ev) {
    setEditingEvent(ev); setEventForm(eventFormFromData(ev)); setShowEventForm(true)
    const { data } = await supabase.from('admin_event_roster').select('player_id').eq('event_id', ev.id)
    const map = {}; if (data) data.forEach(r => { map[r.player_id] = true }); setRosterForm(map)
  }

  function openAddForm() {
    setEditingEvent(null); setEventForm(EMPTY_EVENT_FORM); setRosterForm({})
    setShowEventForm(true); setSelected(null)
  }

  async function submitEventForm(e) {
    e.preventDefault()
    if (!eventForm.title.trim()) return
    const payload = { title: eventForm.title.trim(), description: eventForm.description.trim() || null, is_recurring: eventForm.is_recurring, day_of_week: eventForm.is_recurring ? eventForm.day_of_week : null, event_date: !eventForm.is_recurring ? eventForm.event_date || null : null, time: eventForm.time.trim() || null }
    const selectedPlayerIds = Object.entries(rosterForm).filter(([, v]) => v).map(([id]) => id)
    let eventId
    if (editingEvent) {
      await supabase.from('admin_events').update(payload).eq('id', editingEvent.id)
      setAdminEvents(prev => prev.map(ev => ev.id === editingEvent.id ? { ...ev, ...payload } : ev))
      if (selected?.data?.id === editingEvent.id) setSelected(prev => ({ ...prev, data: { ...prev.data, ...payload } }))
      eventId = editingEvent.id
    } else {
      const { data } = await supabase.from('admin_events').insert({ ...payload, status: 'scheduled' }).select().single()
      if (data) { setAdminEvents(prev => [...prev, data]); eventId = data.id }
    }
    if (eventId) {
      await supabase.from('admin_event_roster').delete().eq('event_id', eventId)
      if (selectedPlayerIds.length > 0) await supabase.from('admin_event_roster').insert(selectedPlayerIds.map(pid => ({ event_id: eventId, player_id: pid })))
    }
    setShowEventForm(false); setEditingEvent(null); setEventForm(EMPTY_EVENT_FORM); setRosterForm({})
  }

  const presentCount = enrollments.filter(e => attendance[e.player_id] === true).length
  const eventPresentCount = Object.values(eventPlayerMap).filter(v => v === true).length

  return (
    <div>
    <style>{`
      .cal-layout { display: flex; gap: 24px; }
      .side-panel-wrap {
        width: 320px; flex-shrink: 0;
      }
      .side-panel-inner {
        background: #fff; border-radius: 16px;
        padding: 22px; align-self: flex-start;
        position: sticky; top: 20px;
        max-height: 85vh; overflow-y: auto;
      }
      .panel-backdrop { display: none; }
      @media (max-width: 768px) {
        .cal-layout { flex-direction: column; }
        .side-panel-wrap {
          width: 100% !important;
          position: fixed !important;
          bottom: 0; left: 0; right: 0;
          z-index: 200;
          max-height: 75vh;
          overflow-y: auto;
          border-radius: 20px 20px 0 0;
          background: #fff;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
          padding: 0 0 env(safe-area-inset-bottom) 0;
        }
        .side-panel-inner {
          position: static !important;
          max-height: none !important;
          border-radius: 0 !important;
          border: none !important;
          box-shadow: none !important;
          padding-top: 8px !important;
        }
        .panel-backdrop {
          display: block;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 199;
        }
        .panel-handle {
          width: 40px; height: 4px;
          background: #ddd; border-radius: 2px;
          margin: 10px auto 6px;
        }
      }
    `}</style>
    <div className="cal-layout">
      {/* ── Calendar column ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: '2px', background: '#e8ece8', borderRadius: '10px', padding: '3px' }}>
            {[['week', 'שבועי'], ['month', 'חודשי']].map(([mode, label]) => (
              <button key={mode} onClick={() => { setViewMode(mode); setSelected(null) }} style={{
                background: viewMode === mode ? '#1a472a' : 'transparent',
                color: viewMode === mode ? '#fff' : '#666',
                border: 'none', borderRadius: '7px', padding: '6px 16px',
                cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              }}>{label}</button>
            ))}
          </div>
          <button onClick={openAddForm} style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>+ אירוע אישי</button>
        </div>

        {/* Event form */}
        {showEventForm && (
          <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(124,58,237,0.1)' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#7c3aed', marginBottom: '16px' }}>
              {editingEvent ? `עריכה: ${editingEvent.title}` : 'אירוע אישי חדש'}
            </div>
            <form onSubmit={submitEventForm} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>שם האירוע *</label>
                <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="אימון עצמי, פגישת מאמנים..." style={inputStyle} required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>תיאור</label>
                <input value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="פרטים נוספים" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={eventForm.is_recurring} onChange={e => setEventForm(f => ({ ...f, is_recurring: e.target.checked }))} />
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
                <label style={labelStyle}>שעה</label>
                <input value={eventForm.time} onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))} placeholder="09:00" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #ede9fe', paddingTop: '14px' }}>
                <label style={{ ...labelStyle, color: '#7c3aed' }}>מתאמנים באירוע ({Object.values(rosterForm).filter(Boolean).length} נבחרו)</label>
                <input value={rosterSearch} onChange={e => setRosterSearch(e.target.value)} placeholder="חיפוש שם..." style={{ ...inputStyle, marginBottom: '8px' }} />
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {allPlayers.filter(p => !rosterSearch || p.name.includes(rosterSearch)).map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: rosterForm[p.id] ? '#f5f3ff' : '#fafafa', border: `1px solid ${rosterForm[p.id] ? '#c4b5fd' : '#eee'}`, borderRadius: '8px', padding: '7px 10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!rosterForm[p.id]} onChange={e => setRosterForm(f => ({ ...f, [p.id]: e.target.checked }))} />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{p.name}</span>
                      <span style={{ fontSize: '11px', color: '#bbb' }}>יליד {p.birth_year}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowEventForm(false); setEditingEvent(null) }} style={outlineBtn}>ביטול</button>
                <button type="submit" style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                  {editingEvent ? 'שמור שינויים' : 'הוסף'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Week View ── */}
        {viewMode === 'week' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button onClick={() => { setWeekOffset(w => w - 1); setSelected(null) }} style={navBtn}>קודם ▶</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '700', color: '#1a472a', fontSize: '15px' }}>{weekLabel}</div>
                {weekOffset !== 0 && <button onClick={() => { setWeekOffset(0); setSelected(null) }} style={{ background: 'none', border: 'none', color: '#999', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', marginTop: '2px' }}>היום</button>}
              </div>
              <button onClick={() => { setWeekOffset(w => w + 1); setSelected(null) }} style={navBtn}>◀ הבא</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {weekDays.map(({ key, date }) => {
                const dayActivities = activities.filter(a => (a.days_of_week?.length ? a.days_of_week : [a.day_of_week]).includes(key))
                const dayEvents = getEventsForDay(key, date)
                const today = isToday(date)
                const hasItems = dayActivities.length > 0 || dayEvents.length > 0
                return (
                  <div key={key} style={{
                    background: today ? '#f0fdf4' : '#fff',
                    border: today ? '2px solid #1a472a' : '1px solid #eee',
                    borderRadius: '14px', padding: '14px 18px',
                    boxShadow: today ? '0 4px 14px rgba(26,71,42,0.1)' : '0 2px 6px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: hasItems ? '10px' : 0 }}>
                      <div style={{ minWidth: '80px' }}>
                        <div style={{ fontWeight: '700', color: today ? '#1a472a' : '#222', fontSize: '14px' }}>יום {DAYS_HE[key]}</div>
                        <div style={{ fontSize: '12px', color: '#bbb' }}>
                          {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                          {today && <span style={{ color: '#16a34a', fontWeight: '700' }}> · היום</span>}
                        </div>
                      </div>
                      {!hasItems && <span style={{ color: '#ddd', fontSize: '13px' }}>אין פעילויות</span>}
                    </div>
                    {hasItems && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {dayActivities.map(act => {
                          const isSel = selected?.type === 'activity' && selected.data.id === act.id && formatDate(selected.date) === formatDate(date)
                          return (
                            <button key={act.id} onClick={() => openActivity(act, date)} style={{
                              background: isSel ? '#1a472a' : '#f0f7f0', color: isSel ? '#fff' : '#1a472a',
                              border: isSel ? 'none' : '1px solid #c5ddc5',
                              borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', textAlign: 'right',
                              boxShadow: isSel ? '0 4px 12px rgba(26,71,42,0.25)' : 'none',
                            }}>
                              <div style={{ fontSize: '13px', fontWeight: '700' }}>{act.name}</div>
                              {act.time && <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '1px' }}>🕐 {act.time}</div>}
                            </button>
                          )
                        })}
                        {dayEvents.map(ev => {
                          const isSel = selected?.type === 'event' && selected.data.id === ev.id && formatDate(selected.date) === formatDate(date)
                          const st = STATUS_EVENT[ev.status] || STATUS_EVENT.scheduled
                          return (
                            <button key={ev.id} onClick={() => openAdminEvent(ev, date)} style={{
                              background: isSel ? '#7c3aed' : '#f5f3ff', color: isSel ? '#fff' : '#7c3aed',
                              border: isSel ? 'none' : '1px solid #ddd9fe',
                              borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', textAlign: 'right',
                              boxShadow: isSel ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                            }}>
                              <div style={{ fontSize: '13px', fontWeight: '700' }}>{ev.title}</div>
                              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '1px' }}>
                                {ev.time && `🕐 ${ev.time}  `}
                                <span style={{ color: isSel ? 'rgba(255,255,255,0.85)' : st.color }}>{st.label}</span>
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
          </>
        )}

        {/* ── Month View ── */}
        {viewMode === 'month' && (() => {
          const base = getMonthBase()
          const mLabel = base.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
          const weeks = getMonthDays()
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <button onClick={() => { setMonthOffset(m => m - 1); setSelected(null) }} style={navBtn}>קודם ▶</button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '700', color: '#1a472a', fontSize: '15px' }}>{mLabel}</div>
                  {monthOffset !== 0 && <button onClick={() => { setMonthOffset(0); setSelected(null) }} style={{ background: 'none', border: 'none', color: '#999', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>החודש</button>}
                </div>
                <button onClick={() => { setMonthOffset(m => m + 1); setSelected(null) }} style={navBtn}>◀ הבא</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
                {DAYS_ORDER.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: '#aaa', fontWeight: '700', padding: '4px' }}>{DAYS_HE[d]}</div>)}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
                  {week.map(({ date, inMonth }, di) => {
                    const dayKey = DAYS_ORDER[date.getDay()]
                    const dayActivities = inMonth ? activities.filter(a => (a.days_of_week?.length ? a.days_of_week : [a.day_of_week]).includes(dayKey)) : []
                    const dayEvents = inMonth ? getEventsForDay(dayKey, date) : []
                    const allItems = [...dayActivities.map(a => ({ type: 'activity', item: a })), ...dayEvents.map(ev => ({ type: 'event', item: ev }))]
                    const today = isToday(date)
                    return (
                      <div key={di} style={{
                        minHeight: '74px', background: today ? '#f0fdf4' : inMonth ? '#fff' : '#fafafa',
                        border: today ? '2px solid #1a472a' : '1px solid #eee',
                        borderRadius: '8px', padding: '5px', overflow: 'hidden',
                        boxShadow: today ? '0 2px 8px rgba(26,71,42,0.1)' : 'none',
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: today ? '#1a472a' : inMonth ? '#333' : '#ccc', marginBottom: '3px' }}>{date.getDate()}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {allItems.slice(0, 3).map(({ type, item }) => {
                            const isSel = selected?.type === type && selected.data.id === item.id && formatDate(selected.date) === formatDate(date)
                            const isAct = type === 'activity'
                            return (
                              <button key={item.id} onClick={() => isAct ? openActivity(item, date) : openAdminEvent(item, date)} style={{
                                background: isSel ? (isAct ? '#1a472a' : '#7c3aed') : (isAct ? '#f0f7f0' : '#f5f3ff'),
                                color: isSel ? '#fff' : (isAct ? '#1a472a' : '#7c3aed'),
                                border: 'none', borderRadius: '4px', padding: '2px 5px',
                                fontSize: '10px', cursor: 'pointer', textAlign: 'right',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
                              }}>{item.name || item.title}</button>
                            )
                          })}
                          {allItems.length > 3 && <div style={{ fontSize: '9px', color: '#bbb', textAlign: 'center' }}>+{allItems.length - 3}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </>
          )
        })()}
      </div>

      {/* ── Side Panel ── */}
      {selected && <div className="panel-backdrop" onClick={() => setSelected(null)} />}
      {selected && (
        <div className="side-panel-wrap">
        <div className="side-panel-inner" style={{
          border: `1px solid ${selected.type === 'event' ? '#ede9fe' : '#e8ece8'}`,
          boxShadow: `0 8px 30px ${selected.type === 'event' ? 'rgba(124,58,237,0.12)' : 'rgba(26,71,42,0.1)'}`,
        }}>
        <div className="panel-handle" />
          {/* Panel header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div>
              <div style={{ fontWeight: '800', color: selected.type === 'event' ? '#7c3aed' : '#1a472a', fontSize: '17px' }}>
                {selected.type === 'event' ? selected.data.title : selected.data.name}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '3px' }}>
                {selected.date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {selected.type === 'event' && selected.data.is_recurring && (
                <div style={{ fontSize: '11px', color: '#9333ea', marginTop: '3px', fontWeight: '600' }}>🔁 חוזר שבועי</div>
              )}
            </div>
            <button onClick={() => setSelected(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', color: '#888', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* ── Activity panel ── */}
          {selected.type === 'activity' && (
            loadingSession ? <LoadingSpinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* 1. Attendance — FIRST */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1a472a' }}>נוכחות</div>
                    <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '8px', padding: '3px 10px', fontSize: '14px', fontWeight: '700' }}>{presentCount}/{enrollments.length}</div>
                  </div>
                  {enrollments.length === 0 ? (
                    <p style={{ color: '#ccc', textAlign: 'center', fontSize: '13px' }}>אין תלמידים רשומים</p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                        {enrollments.map(e => {
                          const present = attendance[e.player_id]
                          return (
                            <button key={e.player_id} onClick={() => toggleAttendance(e.player_id)} style={{
                              display: 'flex', alignItems: 'center', gap: '12px',
                              background: present === true ? '#f0fdf4' : present === false ? '#fef2f2' : '#fafafa',
                              border: `2px solid ${present === true ? '#bbf7d0' : present === false ? '#fecaca' : '#eee'}`,
                              borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', textAlign: 'right', width: '100%',
                            }}>
                              <span style={{ fontSize: '22px', minWidth: '26px' }}>{present === true ? '✅' : present === false ? '❌' : '⬜'}</span>
                              <div style={{ fontWeight: '600', fontSize: '15px', color: '#111' }}>{e.player?.name}</div>
                            </button>
                          )
                        })}
                      </div>
                      <button onClick={saveAttendance} disabled={saving} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'שומר...' : '💾 שמור נוכחות'}
                      </button>
                    </>
                  )}
                </div>

                {/* 2. Add player from full list — always visible */}
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#555', marginBottom: '8px' }}>+ הוסף מתאמן לחוג</div>
                  <input value={addPlayerSearch} onChange={e => setAddPlayerSearch(e.target.value)} placeholder="חיפוש שם..." style={{ ...inputStyle, fontSize: '14px', marginBottom: '8px' }} />
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {allPlayers.filter(p => !enrollments.some(en => en.player_id === p.id) && (!addPlayerSearch || p.name.includes(addPlayerSearch))).map(p => (
                      <button key={p.id} onClick={() => addPlayerToActivity(p.id)} disabled={addingPlayer} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', background: '#f0f7f0', border: '1px solid #c5ddc5',
                        borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', textAlign: 'right', width: '100%', opacity: addingPlayer ? 0.6 : 1,
                        color: '#1a472a', fontWeight: '600', fontSize: '14px',
                      }}>
                        <span>+</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                    {allPlayers.filter(p => !enrollments.some(en => en.player_id === p.id) && (!addPlayerSearch || p.name.includes(addPlayerSearch))).length === 0 && (
                      <p style={{ color: '#bbb', fontSize: '13px', textAlign: 'center', margin: '8px 0' }}>כל המתאמנים כבר רשומים</p>
                    )}
                  </div>
                </div>

                {/* 3. Session details — last */}
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#aaa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>סטטוס מפגש</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {Object.entries(STATUS_EVENT).map(([key, val]) => (
                      <button key={key} onClick={() => setActivitySession(s => ({ ...s, status: key }))} style={{
                        background: activitySession.status === key ? val.color : '#fff',
                        color: activitySession.status === key ? '#fff' : val.color,
                        border: `1px solid ${activitySession.status === key ? val.color : '#ddd'}`,
                        borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                      }}>{val.label}</button>
                    ))}
                  </div>
                  <textarea value={activitySession.notes} onChange={e => setActivitySession(s => ({ ...s, notes: e.target.value }))}
                    placeholder="הערות מפגש..." rows={2}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: '13px', marginBottom: '8px' }} />
                  <button onClick={saveActivitySession} disabled={savingSession} style={{ ...primaryBtn, width: '100%', opacity: savingSession ? 0.6 : 1, fontSize: '13px' }}>
                    {savingSession ? 'שומר...' : 'שמור פרטי מפגש'}
                  </button>
                </div>

              </div>
            )
          )}

          {/* ── Event panel ── */}
          {selected.type === 'event' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 1. Attendance — FIRST */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#7c3aed' }}>נוכחות</div>
                  {eventPresentCount > 0 && <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '8px', padding: '3px 10px', fontSize: '14px', fontWeight: '700' }}>{eventPresentCount}/{eventRoster.size}</div>}
                </div>
                {loadingEventPlayers ? <p style={{ color: '#bbb', fontSize: '13px' }}>טוען...</p> : (() => {
                  const rosterPlayers = allPlayers.filter(p => eventRoster.has(p.id) && (!playerSearch || p.name.includes(playerSearch)))
                  return rosterPlayers.length === 0
                    ? <p style={{ color: '#ccc', fontSize: '13px', textAlign: 'center' }}>אין מתאמנים ברשימה עדיין</p>
                    : (
                      <>
                        <input value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} placeholder="חיפוש..." style={{ ...inputStyle, fontSize: '14px', marginBottom: '8px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                          {rosterPlayers.map(p => {
                            const present = eventPlayerMap[p.id]
                            return (
                              <button key={p.id} onClick={() => toggleEventPlayer(p.id)} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                background: present === true ? '#f0fdf4' : present === false ? '#fef2f2' : '#fafafa',
                                border: `2px solid ${present === true ? '#bbf7d0' : present === false ? '#fecaca' : '#eee'}`,
                                borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', textAlign: 'right', width: '100%',
                              }}>
                                <span style={{ fontSize: '22px', minWidth: '26px' }}>{present === true ? '✅' : present === false ? '❌' : '⬜'}</span>
                                <div style={{ fontWeight: '600', fontSize: '15px', color: '#111' }}>{p.name}</div>
                              </button>
                            )
                          })}
                        </div>
                        <button onClick={saveEventPlayers} disabled={savingEventPlayers} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: savingEventPlayers ? 0.6 : 1 }}>
                          {savingEventPlayers ? 'שומר...' : '💾 שמור נוכחות'}
                        </button>
                      </>
                    )
                })()}
              </div>

              {/* 2. Add to roster from full list — always visible */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#555', marginBottom: '8px' }}>+ הוסף לרשימת האירוע</div>
                <input value={addPlayerSearch} onChange={e => setAddPlayerSearch(e.target.value)} placeholder="חיפוש שם..." style={{ ...inputStyle, fontSize: '14px', marginBottom: '8px' }} />
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {allPlayers.filter(p => !eventRoster.has(p.id) && (!addPlayerSearch || p.name.includes(addPlayerSearch))).map(p => (
                    <button key={p.id} onClick={async () => {
                      await supabase.from('admin_event_roster').insert({ event_id: selected.data.id, player_id: p.id })
                      setEventRoster(prev => new Set([...prev, p.id]))
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', border: '1px solid #ddd9fe',
                      borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', textAlign: 'right', width: '100%',
                      color: '#7c3aed', fontWeight: '600', fontSize: '14px',
                    }}>
                      <span>+</span><span>{p.name}</span>
                    </button>
                  ))}
                  {allPlayers.filter(p => !eventRoster.has(p.id) && (!addPlayerSearch || p.name.includes(addPlayerSearch))).length === 0 && (
                    <p style={{ color: '#bbb', fontSize: '13px', textAlign: 'center', margin: '8px 0' }}>כולם כבר ברשימה</p>
                  )}
                </div>
              </div>

              {/* 3. Event details — last */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '14px' }}>
                {selected.data.description && <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#666', lineHeight: 1.5 }}>{selected.data.description}</p>}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {Object.entries(STATUS_EVENT).map(([key, val]) => (
                    <button key={key} onClick={() => setEventStatus(key)} style={{
                      background: eventStatus === key ? val.color : '#fff',
                      color: eventStatus === key ? '#fff' : val.color,
                      border: `1px solid ${eventStatus === key ? val.color : '#ddd'}`,
                      borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                    }}>{val.label}</button>
                  ))}
                </div>
                <textarea value={eventNotes} onChange={e => setEventNotes(e.target.value)} placeholder="הערות..." rows={2}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: '13px', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button onClick={saveEventDetails} disabled={savingEvent} style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: savingEvent ? 0.6 : 1 }}>
                    {savingEvent ? 'שומר...' : 'שמור'}
                  </button>
                  <button onClick={() => openEditForm(selected.data)} style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd9fe', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                    ✏️
                  </button>
                </div>
              </div>

              {/* Delete */}
              <div style={{ borderTop: '1px solid #fee2e2', paddingTop: '14px' }}>
                {!showDeleteOptions ? (
                  <button onClick={() => setShowDeleteOptions(true)} style={{ width: '100%', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    מחק אירוע...
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '700', marginBottom: '2px' }}>אשר מחיקה:</div>
                    {selected.data.is_recurring && (
                      <button onClick={deleteEventFromNow} disabled={deletingEvent} style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '10px', padding: '9px', fontSize: '13px', cursor: 'pointer' }}>
                        מהיום והלאה (שומר היסטוריה)
                      </button>
                    )}
                    <button onClick={deleteEventAll} disabled={deletingEvent} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '9px', fontSize: '13px', cursor: 'pointer' }}>
                      מחק הכל לחלוטין
                    </button>
                    <button onClick={() => setShowDeleteOptions(false)} style={{ background: '#fafafa', color: '#888', border: '1px solid #eee', borderRadius: '10px', padding: '7px', fontSize: '12px', cursor: 'pointer' }}>
                      ביטול
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
    </div>
  )
}

/* ─── Shared UI components ─── */
function SectionHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111' }}>{title}</h2>
      {action && (
        <button onClick={action.onClick} style={primaryBtn}>{action.label}</button>
      )}
    </div>
  )
}

function StatusPill({ label, color, bg }) {
  return (
    <div style={{ background: bg, color, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>{label}</div>
  )
}

function ActionBtn({ label, color, outline, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: outline ? '#fff' : color, color: outline ? color : '#fff',
      border: `1px solid ${color}`, borderRadius: '8px', padding: '6px 14px',
      cursor: 'pointer', fontSize: '13px', fontWeight: '500', opacity: disabled ? 0.5 : 1,
    }}>{label}</button>
  )
}

function LoadingSpinner() {
  return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb', fontSize: '14px' }}>טוען...</div>
}

function EmptyState({ text }) {
  return <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc', fontSize: '14px' }}>{text}</div>
}

const navBtn = {
  background: '#fff', border: '1px solid #e8ece8', borderRadius: '10px',
  padding: '8px 16px', cursor: 'pointer', fontSize: '13px', color: '#555', fontWeight: '500',
  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
}
