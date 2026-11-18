import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  GZ_PREFIX, GZ_NOTE, DAYS_HE, dayKeyOf, dateToISO, shiftISO,
  parseNames, summarize, reportText, buildAttendanceFile,
} from '../lib/givatZeev'

// Givat Zeev groups are ordinary חוגים at the location "גבעת זאב", built the
// same way as Nokdim: a main activity that meets on several days (for those
// registered twice a week) plus one single-day variant per day (for those
// registered once a week). The calendar merges them into one slot per day —
// this tab does the same, and writes attendance to the same table, so both
// views always agree. The children register through the community center, so
// they are never offered on the site's registration page.

const PHONE_KEY = 'gz-report-phone'

const card = { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', padding: '16px 18px' }
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0e7e0', fontSize: '15px', boxSizing: 'border-box', background: '#fff', outline: 'none' }
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#555', fontWeight: '600' }
const btn = (bg, color = '#fff', extra = {}) => ({ background: bg, color, border: 'none', borderRadius: '12px', padding: '12px 16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', ...extra })
const ghostBtn = { background: '#fff', border: '1px solid #e0e7e0', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#555', fontWeight: '600' }

const heSort = (a, b) => a.name.localeCompare(b.name, 'he')
const daysOf = a => (a.days_of_week?.length ? a.days_of_week : [a.day_of_week]).filter(Boolean)
const runsOn = (a, dayKey) => daysOf(a).includes(dayKey)
const daysLabel = a => daysOf(a).map(d => DAYS_HE[d]).join(' ו')
// What the community center calls this group (kept in the description, e.g. "כיתות ג-ד פעמיים בשבוע (2356-1-5)")
const groupLabel = a => a.description || a.age_group || a.name

function toIntlPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('972')) return digits
  return `972${digits.replace(/^0/, '')}`
}

function downloadFile(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Everything the tab needs for one date. Returns data (or an error message); sets no state.
async function fetchGivatZeev(iso) {
  const locRes = await supabase.from('locations').select('id').eq('name', GZ_PREFIX).maybeSingle()
  if (locRes.error) return { error: 'שגיאה בטעינת המיקום' }
  if (!locRes.data) return { activities: [], enrollments: [], marks: {}, known: {} }

  const actRes = await supabase.from('activities').select('*').eq('location_id', locRes.data.id)
  if (actRes.error) return { error: 'שגיאה בטעינת החוגים' }
  const activities = (actRes.data || []).sort((a, b) => (a.time || '').localeCompare(b.time || '') || (a.sort_order || 0) - (b.sort_order || 0))
  const ids = activities.map(a => a.id)
  if (!ids.length) return { activities, enrollments: [], marks: {}, known: {} }

  const [e, m, k] = await Promise.all([
    supabase.from('enrollments').select('id, activity_id, player_id, status, player:players(id, name)').in('activity_id', ids).in('status', ['active', 'pending']),
    supabase.from('attendance').select('player_id, activity_id, present').in('activity_id', ids).eq('date', iso),
    supabase.from('players').select('id, name').eq('notes', GZ_NOTE),
  ])
  if (e.error || m.error) return { error: 'שגיאה בטעינת הרשימות' }

  const marks = {}
  ;(m.data || []).forEach(r => { marks[r.player_id] = r.present })
  const known = {}
  ;(k.data || []).forEach(p => { known[p.name.toLowerCase()] = p.id })
  const enrollments = (e.data || []).map(r => ({ id: r.id, activity_id: r.activity_id, player_id: r.player_id, status: r.status, name: r.player?.name || '—' }))
  return { activities, enrollments, marks, known }
}

export default function AdminGivatZeev({ onOpenActivities }) {
  const { user } = useAuth()
  const [date, setDate] = useState(() => dateToISO(new Date()))
  const [activities, setActivities] = useState([])
  const [enrollments, setEnrollments] = useState([]) // { id, activity_id, player_id, status, name }
  const [marks, setMarks] = useState({})             // playerId -> true|false for the selected date
  const [knownKids, setKnownKids] = useState({})     // lowercase name -> playerId, for children already created
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [openIds, setOpenIds] = useState(() => new Set())
  const [excluded, setExcluded] = useState(() => new Set())
  const [manage, setManage] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  // Fetching is kept apart from setting state: it only returns data.
  useEffect(() => {
    let stale = false // another date was picked (or a newer reload started) before this one answered
    fetchGivatZeev(date).then(res => {
      if (stale) return
      if (res.error) { setError(res.error); setLoading(false); return }
      setActivities(res.activities); setEnrollments(res.enrollments)
      setMarks(res.marks); setKnownKids(res.known)
      setError(''); setLoading(false)
    })
    return () => { stale = true }
  }, [date, reloadKey])

  const dayKey = dayKeyOf(date)

  // One slot per main activity that meets on this weekday: the main activity's
  // children (twice a week) together with this weekday's variant (once a week).
  const sessions = useMemo(() => {
    const parents = activities.filter(a => !a.parent_activity_id && runsOn(a, dayKey))
    return parents.map(p => {
      const members = [p, ...activities.filter(a => a.parent_activity_id === p.id && runsOn(a, dayKey))]
      const groups = members.map(a => ({
        activity: a,
        label: groupLabel(a),
        kids: enrollments.filter(e => e.activity_id === a.id).map(e => ({ id: e.player_id, name: e.name, activityId: a.id, present: marks[e.player_id] })).sort(heSort),
      }))
      return { id: p.id, title: p.age_group || p.name, time: p.time || '', groups }
    }).sort((a, b) => a.time.localeCompare(b.time))
  }, [activities, enrollments, marks, dayKey])

  // What goes into the Excel: one entry per community-center group, as they know them
  const reportGroups = useMemo(() => sessions
    .filter(s => !excluded.has(s.id))
    .flatMap(s => s.groups.filter(g => g.kids.length > 0).map(g => ({
      id: g.activity.id, name: g.label, time: s.time,
      kids: g.kids.map(k => ({ id: k.id, name: k.name, present: k.present })),
    }))),
  [sessions, excluded])

  function changeDate(iso) { setDate(iso); setExcluded(new Set()) }

  async function setMark(kid, value) {
    setMarks(prev => { const next = { ...prev }; if (value === undefined) delete next[kid.id]; else next[kid.id] = value; return next })
    const res = value === undefined
      ? await supabase.from('attendance').delete().eq('player_id', kid.id).eq('activity_id', kid.activityId).eq('date', date)
      : await supabase.from('attendance').upsert({ player_id: kid.id, activity_id: kid.activityId, date, present: value }, { onConflict: 'player_id,activity_id,date' })
    if (res.error) { setError('השמירה נכשלה — בדוק חיבור ונסה שוב'); reload() }
  }

  async function markAllPresent(session) {
    const pending = session.groups.flatMap(g => g.kids).filter(k => k.present === undefined)
    if (!pending.length) return
    setMarks(prev => ({ ...prev, ...Object.fromEntries(pending.map(k => [k.id, true])) }))
    const { error: err } = await supabase.from('attendance')
      .upsert(pending.map(k => ({ player_id: k.id, activity_id: k.activityId, date, present: true })), { onConflict: 'player_id,activity_id,date' })
    if (err) { setError('השמירה נכשלה — בדוק חיבור ונסה שוב'); reload() }
  }

  async function addKids(activity, text) {
    const all = parseNames(text)
    const have = new Set(enrollments.filter(e => e.activity_id === activity.id).map(e => e.name.toLowerCase()))
    const fresh = all.filter(n => !have.has(n.toLowerCase()))
    if (fresh.length) {
      // a child who is already in another group keeps their single record
      const toCreate = fresh.filter(n => !knownKids[n.toLowerCase()])
      const ids = {}
      fresh.forEach(n => { if (knownKids[n.toLowerCase()]) ids[n.toLowerCase()] = knownKids[n.toLowerCase()] })
      if (toCreate.length) {
        const year = new Date().getFullYear() // birth_year is required by the table; these children's ages aren't tracked
        const created = await supabase.from('players').insert(toCreate.map(name => ({ name, birth_year: year, notes: GZ_NOTE, user_id: user.id }))).select('id, name')
        if (created.error) { setError('הוספת הילדים נכשלה'); return }
        created.data.forEach(p => { ids[p.name.toLowerCase()] = p.id })
      }
      const linked = await supabase.from('enrollments').insert(fresh.map(n => ({ activity_id: activity.id, player_id: ids[n.toLowerCase()], user_id: user.id, status: 'active' })))
      if (linked.error) { setError('הוספת הילדים לחוג נכשלה'); return }
      reload()
    }
    const skipped = all.length - fresh.length
    setNotice(`נוספו ${fresh.length} ילדים${skipped ? ` (${skipped} כבר היו ברשימה)` : ''}`)
  }

  async function removeKid(enrollment) {
    if (!window.confirm(`להסיר את ${enrollment.name} מהחוג?\nהנוכחות שלו בימים קודמים תישמר.`)) return
    const { error: err } = await supabase.from('enrollments').delete().eq('id', enrollment.id)
    if (err) { setError('ההסרה נכשלה'); return }
    reload()
  }

  const isToday = date === dateToISO(new Date())

  if (loading) return <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>טוען...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', margin: '0 auto' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#1a472a', fontWeight: '800' }}>גבעת זאב — נוכחות</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#888', lineHeight: 1.5 }}>
          הילדים נרשמים דרך המתנ״ס. כאן מסמנים מי הגיע (גם ביומן רואים את אותה נוכחות), ובסוף היום שולחים להם אקסל בוואטסאפ.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <span>{error}</span><button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* date */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => changeDate(shiftISO(date, -1))} style={{ ...ghostBtn, padding: '10px', fontSize: '12px', flexShrink: 0 }}>יום קודם</button>
          <input type="date" value={date} onChange={e => e.target.value && changeDate(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '9px 6px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }} />
          <button onClick={() => changeDate(shiftISO(date, 1))} style={{ ...ghostBtn, padding: '10px', fontSize: '12px', flexShrink: 0 }}>יום הבא</button>
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '8px', textAlign: 'center' }}>
          יום {DAYS_HE[dayKey]}{isToday ? ' · היום' : ''}
          {!isToday && <button onClick={() => changeDate(dateToISO(new Date()))} style={{ background: 'none', border: 'none', color: '#1a472a', fontWeight: '700', cursor: 'pointer', fontSize: '12px', marginRight: '10px', textDecoration: 'underline' }}>חזרה להיום</button>}
        </div>
      </div>

      {/* slots of the day */}
      {activities.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#666', fontSize: '14px', lineHeight: 1.6 }}>
          עדיין אין חוגים במיקום ״גבעת זאב״.<br />
          {onOpenActivities && <button onClick={onOpenActivities} style={{ ...btn('#1a472a'), marginTop: '12px' }}>לניהול החוגים</button>}
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#888', fontSize: '14px' }}>אין חוגים של גבעת זאב ביום {DAYS_HE[dayKey]}.</div>
      ) : (
        sessions.map(s => {
          const kids = s.groups.flatMap(g => g.kids.map(k => ({ ...k, group: g.label }))).sort(heSort)
          const present = kids.filter(k => k.present === true).length
          const unmarked = kids.filter(k => k.present === undefined).length
          const open = openIds.has(s.id) || (openIds.size === 0 && sessions.length === 1)
          const mixed = s.groups.filter(g => g.kids.length > 0).length > 1
          return (
            <div key={s.id} style={card}>
              <button
                onClick={() => setOpenIds(prev => { const next = new Set(prev); if (open) next.delete(s.id); else next.add(s.id); return next })}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'right' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#111' }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{s.time}</div>
                </div>
                <span style={{ background: unmarked === 0 && kids.length ? '#dcfce7' : '#f3f4f6', color: unmarked === 0 && kids.length ? '#16a34a' : '#555', borderRadius: '10px', padding: '4px 12px', fontSize: '14px', fontWeight: '700' }}>{present}/{kids.length}</span>
                <span style={{ color: '#aaa', fontSize: '14px' }}>{open ? '▲' : '▼'}</span>
              </button>

              {open && (kids.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', margin: '14px 0 0' }}>אין ילדים רשומים. אפשר להוסיף בניהול למטה.</p>
              ) : (
                <div style={{ marginTop: '14px' }}>
                  {unmarked > 0 && (
                    <button onClick={() => markAllPresent(s)} style={{ ...btn('#16a34a', '#fff', { width: '100%', marginBottom: '10px', padding: '11px' }) }}>✅ כולם הגיעו ({unmarked} שלא סומנו)</button>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {kids.map(k => {
                      const v = k.present
                      const next = v === undefined ? true : v === true ? false : undefined
                      return (
                        <button key={`${k.id}-${k.activityId}`} onClick={() => setMark(k, next)} style={{
                          display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'right', cursor: 'pointer',
                          background: v === true ? '#f0fdf4' : v === false ? '#fef2f2' : '#fafafa',
                          border: `2px solid ${v === true ? '#bbf7d0' : v === false ? '#fecaca' : '#eee'}`,
                          borderRadius: '12px', padding: '12px 14px',
                        }}>
                          <span style={{ fontSize: '22px', minWidth: '26px' }}>{v === true ? '✅' : v === false ? '❌' : '⬜'}</span>
                          <span>
                            <span style={{ display: 'block', fontWeight: '600', fontSize: '15px', color: '#111' }}>{k.name}</span>
                            {mixed && <span style={{ display: 'block', fontSize: '11px', color: '#999' }}>{k.group}</span>}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#aaa' }}>לחיצה: הגיע ← לא הגיע ← בלי סימון. נשמר מיד.</p>
                </div>
              ))}
            </div>
          )
        })
      )}

      {/* send */}
      {sessions.length > 0 && (
        <SendReport
          date={date}
          groups={reportGroups}
          candidates={sessions.map(s => ({ id: s.id, name: `${s.title} · ${s.time}` }))}
          excluded={excluded}
          toggleExcluded={id => setExcluded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })}
        />
      )}

      {/* manage */}
      {activities.length > 0 && (
        <div style={card}>
          <button onClick={() => setManage(m => !m)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '15px', fontWeight: '800', color: '#1a472a' }}>
            <span>⚙️ ניהול הילדים בכל חוג</span><span style={{ color: '#aaa' }}>{manage ? '▲' : '▼'}</span>
          </button>
          {manage && (
            <Manager
              activities={activities}
              enrollments={enrollments}
              notice={notice}
              onAddKids={addKids}
              onRemoveKid={removeKid}
              onOpenActivities={onOpenActivities}
            />
          )}
        </div>
      )}
    </div>
  )
}

function SendReport({ date, groups, candidates, excluded, toggleExcluded }) {
  const [phone, setPhone] = useState(() => { try { return localStorage.getItem(PHONE_KEY) || '' } catch { return '' } })
  const [built, setBuilt] = useState(null) // { key, file }
  const [msg, setMsg] = useState('')

  const key = useMemo(() => `${date}|${JSON.stringify(groups)}`, [date, groups])
  const text = useMemo(() => reportText(date, groups), [date, groups])
  const stats = useMemo(() => summarize(groups), [groups])

  // The file is prepared ahead of the tap: phones only allow sharing straight
  // from a tap, so there can't be any waiting between the tap and the share.
  useEffect(() => {
    let cancelled = false
    if (groups.length === 0) return undefined
    buildAttendanceFile(date, groups)
      .then(file => { if (!cancelled) setBuilt({ key, file }) })
      .catch(() => { if (!cancelled) setBuilt({ key, file: null }) })
    return () => { cancelled = true }
  }, [key, date, groups])

  const ready = built?.key === key
  const file = ready ? built.file : null
  const failed = ready && !built.file

  function savePhone(v) {
    setPhone(v)
    try { localStorage.setItem(PHONE_KEY, v) } catch { /* private mode */ }
  }

  async function sendWhatsApp() {
    if (!file) return
    setMsg('')
    // Phones: the share sheet takes the actual Excel file, and WhatsApp is one tap away in it.
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }) } catch (e) { if (e?.name !== 'AbortError') setMsg('השיתוף נכשל. אפשר להוריד את הקובץ ולשלוח אותו ידנית.') }
      return
    }
    // Computers can't attach a file from a link: download it, and open WhatsApp with the summary ready.
    downloadFile(file)
    window.open(`https://wa.me/${toIntlPhone(phone)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    setMsg('הקובץ ירד למחשב — צרף אותו להודעה בוואטסאפ שנפתחה.')
  }

  return (
    <div style={{ ...card, border: '1px solid #bbf7d0', background: '#f7fdf9' }}>
      <div style={{ fontWeight: '800', fontSize: '16px', color: '#166534', marginBottom: '4px' }}>📤 שליחה למתנ״ס</div>

      {candidates.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', margin: '8px 0' }}>
          {candidates.map(c => (
            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={!excluded.has(c.id)} onChange={() => toggleExcluded(c.id)} />{c.name}
            </label>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <p style={{ color: '#888', fontSize: '13px', margin: '8px 0 0' }}>אין ילדים ברשימות של החוגים שנבחרו.</p>
      ) : (
        <>
          <div style={{ fontSize: '14px', color: '#374151', margin: '6px 0 12px', lineHeight: 1.6 }}>
            {stats.present} נוכחים מתוך {stats.total} · {groups.length} {groups.length === 1 ? 'קבוצה' : 'קבוצות'}
            {stats.unmarked > 0 && <div style={{ color: '#b45309', fontWeight: '600' }}>⚠️ {stats.unmarked} ילדים עדיין לא סומנו — באקסל הם יופיעו כ״לא סומן״</div>}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={sendWhatsApp} disabled={!file} style={{ ...btn('#25d366', '#fff', { flex: '1 1 200px', opacity: file ? 1 : 0.6 }) }}>
              {file ? '💬 שלח בוואטסאפ' : failed ? 'שגיאה ביצירת הקובץ' : 'מכין קובץ...'}
            </button>
            <button onClick={() => file && downloadFile(file)} disabled={!file} style={{ ...ghostBtn, padding: '12px 16px', fontSize: '14px', opacity: file ? 1 : 0.6 }}>⬇️ הורד אקסל</button>
          </div>
          {msg && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#b45309' }}>{msg}</p>}
          <details style={{ marginTop: '12px' }}>
            <summary style={{ fontSize: '12px', color: '#777', cursor: 'pointer' }}>איש קשר ברירת מחדל (למחשב)</summary>
            <input type="tel" value={phone} onChange={e => savePhone(e.target.value)} placeholder="050-1234567" style={{ ...inputStyle, marginTop: '8px' }} />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#aaa' }}>בטלפון בוחרים את איש הקשר בחלון השיתוף. המספר הזה משמש רק כשפותחים וואטסאפ מהמחשב, ונשמר במכשיר הזה בלבד.</p>
          </details>
        </>
      )}
    </div>
  )
}

function Manager({ activities, enrollments, notice, onAddKids, onRemoveKid, onOpenActivities }) {
  const [pasteFor, setPasteFor] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(null)

  async function submitKids(activity) {
    setBusy(true)
    await onAddKids(activity, pasteText)
    setBusy(false)
    setPasteText(''); setPasteFor(null)
  }

  // main activities first, each followed by its single-day variants
  const ordered = activities.filter(a => !a.parent_activity_id).flatMap(p => [p, ...activities.filter(a => a.parent_activity_id === p.id)])

  return (
    <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {notice && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '10px', padding: '8px 12px', fontSize: '13px' }}>{notice}</div>}

      {ordered.map(a => {
        const kids = enrollments.filter(e => e.activity_id === a.id).sort(heSort)
        const isVariant = !!a.parent_activity_id
        return (
          <div key={a.id} style={{ border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px', marginRight: isVariant ? '18px' : 0, background: isVariant ? '#fafcfa' : '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 140px' }}>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>{groupLabel(a)}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>יום {daysLabel(a)} · {a.time} · {kids.length} ילדים</div>
              </div>
              <button onClick={() => { setPasteFor(pasteFor === a.id ? null : a.id); setPasteText('') }} style={{ ...ghostBtn, color: '#1a472a', borderColor: '#1a472a' }}>+ הוסף ילדים</button>
              <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} style={ghostBtn}>{expanded === a.id ? 'סגור' : 'הרשימה'}</button>
            </div>

            {pasteFor === a.id && (
              <div style={{ marginTop: '10px' }}>
                <label style={labelStyle}>שמות הילדים — שם בכל שורה (אפשר להדביק רשימה מהמתנ״ס או מאקסל)</label>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={6} placeholder={'דני כהן\nנועה לוי\nיובל ברק'} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} autoFocus />
                <button onClick={() => submitKids(a)} disabled={busy || !pasteText.trim()} style={{ ...btn('#1a472a', '#fff', { width: '100%', marginTop: '8px', opacity: busy || !pasteText.trim() ? 0.6 : 1 }) }}>
                  {busy ? 'מוסיף...' : `הוסף ${parseNames(pasteText).length || ''} ילדים לחוג`}
                </button>
              </div>
            )}

            {expanded === a.id && (
              <div style={{ marginTop: '10px' }}>
                {kids.length === 0 ? <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>אין ילדים בחוג</p> : kids.map(k => (
                  <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: '14px' }}>
                    <span>{k.name}</span>
                    <button onClick={() => onRemoveKid(k)} aria-label={`הסר את ${k.name}`} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px' }}>הסר</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {onOpenActivities && (
        <button onClick={onOpenActivities} style={{ ...ghostBtn, padding: '11px', fontSize: '14px', borderStyle: 'dashed' }}>להוספה / עריכה של חוגים — לשונית ״חוגים״</button>
      )}
    </div>
  )
}
