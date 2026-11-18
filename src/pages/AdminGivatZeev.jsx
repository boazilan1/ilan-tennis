import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  GZ_PREFIX, GZ_NOTE, DAYS_HE, DAYS_ORDER, groupName, groupTitle, dayKeyOf, dmy, dateToISO, shiftISO,
  meetsOn, parseNames, summarize, reportText, buildAttendanceFile,
} from '../lib/givatZeev'

const PHONE_KEY = 'gz-report-phone'

const card = { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', padding: '16px 18px' }
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0e7e0', fontSize: '15px', boxSizing: 'border-box', background: '#fff', outline: 'none' }
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#555', fontWeight: '600' }
const btn = (bg, color = '#fff', extra = {}) => ({ background: bg, color, border: 'none', borderRadius: '12px', padding: '12px 16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', ...extra })
const ghostBtn = { background: '#fff', border: '1px solid #e0e7e0', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#555', fontWeight: '600' }

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

const heSort = (a, b) => a.name.localeCompare(b.name, 'he')

export default function AdminGivatZeev() {
  const { user } = useAuth()
  const [date, setDate] = useState(() => dateToISO(new Date()))
  const [events, setEvents] = useState([])
  const [roster, setRoster] = useState({})   // eventId -> [{ id, name }]
  const [marks, setMarks] = useState({})     // eventId -> { playerId: true|false } for the selected date
  const [names, setNames] = useState({})     // playerId -> name, also for kids no longer on a roster but marked
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [openIds, setOpenIds] = useState(() => new Set())
  const [excluded, setExcluded] = useState(() => new Set())
  const [manage, setManage] = useState(false)
  const reqRef = useRef(0)

  const load = useCallback(async iso => {
    const mine = ++reqRef.current
    const fail = msg => { if (mine === reqRef.current) { setError(msg); setLoading(false) } }

    const evRes = await supabase.from('admin_events').select('*').like('title', `${GZ_PREFIX}%`)
    if (evRes.error) return fail('שגיאה בטעינת הקבוצות')
    const evs = (evRes.data || []).sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.title.localeCompare(b.title, 'he'))
    const ids = evs.map(e => e.id)

    let rosterRows = [], markRows = []
    if (ids.length) {
      const [r, m] = await Promise.all([
        supabase.from('admin_event_roster').select('event_id, player_id').in('event_id', ids),
        supabase.from('admin_event_players').select('event_id, player_id, present').in('event_id', ids).eq('event_date', iso),
      ])
      if (r.error || m.error) return fail('שגיאה בטעינת הרשימות')
      rosterRows = r.data || []; markRows = m.data || []
    }

    // names: all Givat Zeev kids, plus anyone else the groups reference
    const nameMap = {}
    const tagged = await supabase.from('players').select('id, name').eq('notes', GZ_NOTE)
    ;(tagged.data || []).forEach(p => { nameMap[p.id] = p.name })
    const missing = [...new Set([...rosterRows, ...markRows].map(r => r.player_id))].filter(id => !(id in nameMap))
    if (missing.length) {
      const extra = await supabase.from('players').select('id, name').in('id', missing)
      ;(extra.data || []).forEach(p => { nameMap[p.id] = p.name })
    }

    const rosterMap = {}, markMap = {}
    evs.forEach(e => { rosterMap[e.id] = []; markMap[e.id] = {} })
    rosterRows.forEach(r => rosterMap[r.event_id]?.push({ id: r.player_id, name: nameMap[r.player_id] || '—' }))
    Object.values(rosterMap).forEach(list => list.sort(heSort))
    markRows.forEach(r => { if (markMap[r.event_id]) markMap[r.event_id][r.player_id] = r.present })

    if (mine !== reqRef.current) return // a newer request (another date) superseded this one
    setEvents(evs); setRoster(rosterMap); setMarks(markMap); setNames(nameMap)
    setError(''); setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  // everyone who belongs on the sheet for this group today: the roster plus anyone marked today
  function kidsFor(ev) {
    const list = [...(roster[ev.id] || [])]
    const have = new Set(list.map(k => k.id))
    Object.keys(marks[ev.id] || {}).forEach(pid => { if (!have.has(pid)) list.push({ id: pid, name: names[pid] || '—' }) })
    return list.sort(heSort)
  }

  const meeting = events.filter(ev => meetsOn(ev, date) || Object.keys(marks[ev.id] || {}).length > 0)
  const shown = showAll ? events : meeting

  const reportGroups = useMemo(() => meeting
    .filter(ev => !excluded.has(ev.id))
    .map(ev => ({
      id: ev.id,
      name: groupName(ev.title),
      time: ev.time || '',
      kids: kidsFor(ev).map(k => ({ id: k.id, name: k.name, present: marks[ev.id]?.[k.id] })),
    }))
    .filter(g => g.kids.length > 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [events, roster, marks, names, date, excluded])

  function changeDate(iso) {
    setDate(iso); setExcluded(new Set()); setNotice('')
  }

  async function setMark(ev, playerId, value) {
    setMarks(prev => {
      const forEvent = { ...(prev[ev.id] || {}) }
      if (value === undefined) delete forEvent[playerId]; else forEvent[playerId] = value
      return { ...prev, [ev.id]: forEvent }
    })
    const res = value === undefined
      ? await supabase.from('admin_event_players').delete().eq('event_id', ev.id).eq('player_id', playerId).eq('event_date', date)
      : await supabase.from('admin_event_players').upsert({ event_id: ev.id, player_id: playerId, event_date: date, present: value }, { onConflict: 'event_id,player_id,event_date' })
    if (res.error) { setError('השמירה נכשלה — בדוק חיבור ונסה שוב'); load(date) }
  }

  async function markAllPresent(ev) {
    const pending = kidsFor(ev).filter(k => marks[ev.id]?.[k.id] === undefined)
    if (!pending.length) return
    setMarks(prev => ({ ...prev, [ev.id]: { ...(prev[ev.id] || {}), ...Object.fromEntries(pending.map(k => [k.id, true])) } }))
    const { error: err } = await supabase.from('admin_event_players')
      .upsert(pending.map(k => ({ event_id: ev.id, player_id: k.id, event_date: date, present: true })), { onConflict: 'event_id,player_id,event_date' })
    if (err) { setError('השמירה נכשלה — בדוק חיבור ונסה שוב'); load(date) }
  }

  // A group that meets on several days is one calendar event per day, all with the same title and the same children.
  const sessionsOf = ev => events.filter(e => e.title === ev.title)

  async function createGroup({ name, days, time }) {
    if (events.some(e => e.title === groupTitle(name))) { setError('כבר יש קבוצה בשם הזה'); return false }
    const { error: err } = await supabase.from('admin_events').insert(days.map(day => ({
      title: groupTitle(name), is_recurring: true, day_of_week: day, time: time.trim() || null, status: 'scheduled',
    })))
    if (err) { setError('יצירת הקבוצה נכשלה'); return false }
    await load(date)
    return true
  }

  async function addKids(ev, text) {
    const all = parseNames(text)
    const have = new Set(kidsFor(ev).map(k => k.name.toLowerCase()))
    const fresh = all.filter(n => !have.has(n.toLowerCase()))
    if (fresh.length) {
      const year = new Date().getFullYear() // birth_year is required by the table; these kids' ages aren't tracked
      const created = await supabase.from('players').insert(fresh.map(name => ({ name, birth_year: year, notes: GZ_NOTE, user_id: user.id }))).select('id')
      if (created.error) { setError('הוספת הילדים נכשלה'); return }
      const linked = await supabase.from('admin_event_roster').insert(sessionsOf(ev).flatMap(e => created.data.map(p => ({ event_id: e.id, player_id: p.id }))))
      if (linked.error) { setError('הוספת הילדים לקבוצה נכשלה'); return }
      await load(date)
    }
    const skipped = all.length - fresh.length
    setNotice(`נוספו ${fresh.length} ילדים${skipped ? ` (${skipped} כבר היו ברשימה)` : ''}`)
  }

  async function removeKid(ev, kid) {
    if (!window.confirm(`להסיר את ${kid.name} מהקבוצה?\nהנוכחות שלו בימים קודמים תישמר.`)) return
    const ids = sessionsOf(ev).map(e => e.id)
    await supabase.from('admin_event_roster').delete().in('event_id', ids).eq('player_id', kid.id)
    await supabase.from('admin_event_players').delete().in('event_id', ids).eq('player_id', kid.id).eq('event_date', date)
    await load(date)
  }

  async function deleteGroup(ev) {
    if (!window.confirm(`למחוק את הקבוצה "${groupName(ev.title)}"?\nגם כל הנוכחות ההיסטורית שלה תימחק, ואי אפשר לשחזר.`)) return
    const orphans = (roster[ev.id] || []).map(k => k.id)
    const { error: err } = await supabase.from('admin_events').delete().eq('title', ev.title)
    if (err) { setError('המחיקה נכשלה'); return }
    // children who are in no other group are no longer needed
    const stillUsed = new Set(events.filter(e => e.title !== ev.title).flatMap(e => (roster[e.id] || []).map(k => k.id)))
    const unused = orphans.filter(id => !stillUsed.has(id))
    if (unused.length) await supabase.from('players').delete().in('id', unused).eq('notes', GZ_NOTE)
    await load(date)
  }

  const isToday = date === dateToISO(new Date())

  if (loading) return <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>טוען...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', margin: '0 auto' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#1a472a', fontWeight: '800' }}>גבעת זאב — נוכחות</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#888', lineHeight: 1.5 }}>
          הילדים נרשמים דרך המתנ״ס. כאן מסמנים מי הגיע, ובסוף היום שולחים להם אקסל בוואטסאפ.
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
          יום {DAYS_HE[dayKeyOf(date)]}{isToday ? ' · היום' : ''}
          {!isToday && <button onClick={() => changeDate(dateToISO(new Date()))} style={{ background: 'none', border: 'none', color: '#1a472a', fontWeight: '700', cursor: 'pointer', fontSize: '12px', marginRight: '10px', textDecoration: 'underline' }}>חזרה להיום</button>}
        </div>
      </div>

      {/* groups of the day */}
      {events.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#666', fontSize: '14px', lineHeight: 1.6 }}>
          עדיין אין קבוצות של גבעת זאב.<br />
          <button onClick={() => setManage(true)} style={{ ...btn('#1a472a'), marginTop: '12px' }}>+ יצירת קבוצה ראשונה</button>
        </div>
      ) : shown.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#888', fontSize: '14px' }}>
          אין קבוצות של גבעת זאב ביום {DAYS_HE[dayKeyOf(date)]}.
          <div><button onClick={() => setShowAll(true)} style={{ ...ghostBtn, marginTop: '10px' }}>הצג את כל הקבוצות</button></div>
        </div>
      ) : (
        shown.map(ev => {
          const kids = kidsFor(ev)
          const present = kids.filter(k => marks[ev.id]?.[k.id] === true).length
          const unmarked = kids.filter(k => marks[ev.id]?.[k.id] === undefined).length
          const open = openIds.has(ev.id) || (openIds.size === 0 && shown.length === 1)
          return (
            <div key={ev.id} style={card}>
              <button
                onClick={() => setOpenIds(prev => { const next = new Set(prev); if (open) next.delete(ev.id); else next.add(ev.id); return next })}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'right' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#111' }}>{groupName(ev.title)}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{ev.time || ''}{ev.is_recurring && ev.day_of_week ? ` · כל יום ${DAYS_HE[ev.day_of_week]}` : ''}</div>
                </div>
                <span style={{ background: unmarked === 0 && kids.length ? '#dcfce7' : '#f3f4f6', color: unmarked === 0 && kids.length ? '#16a34a' : '#555', borderRadius: '10px', padding: '4px 12px', fontSize: '14px', fontWeight: '700' }}>{present}/{kids.length}</span>
                <span style={{ color: '#aaa', fontSize: '14px' }}>{open ? '▲' : '▼'}</span>
              </button>

              {open && (kids.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', margin: '14px 0 0' }}>אין ילדים בקבוצה. אפשר להוסיף בניהול למטה.</p>
              ) : (
                <div style={{ marginTop: '14px' }}>
                  {unmarked > 0 && (
                    <button onClick={() => markAllPresent(ev)} style={{ ...btn('#16a34a', '#fff', { width: '100%', marginBottom: '10px', padding: '11px' }) }}>✅ כולם הגיעו ({unmarked} שלא סומנו)</button>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {kids.map(k => {
                      const v = marks[ev.id]?.[k.id]
                      const next = v === undefined ? true : v === true ? false : undefined
                      return (
                        <button key={k.id} onClick={() => setMark(ev, k.id, next)} style={{
                          display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'right', cursor: 'pointer',
                          background: v === true ? '#f0fdf4' : v === false ? '#fef2f2' : '#fafafa',
                          border: `2px solid ${v === true ? '#bbf7d0' : v === false ? '#fecaca' : '#eee'}`,
                          borderRadius: '12px', padding: '12px 14px',
                        }}>
                          <span style={{ fontSize: '22px', minWidth: '26px' }}>{v === true ? '✅' : v === false ? '❌' : '⬜'}</span>
                          <span style={{ fontWeight: '600', fontSize: '15px', color: '#111' }}>{k.name}</span>
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

      {events.length > 0 && !showAll && meeting.length < events.length && (
        <button onClick={() => setShowAll(true)} style={{ ...ghostBtn, alignSelf: 'center' }}>הצג גם קבוצות שלא נפגשות ביום הזה</button>
      )}
      {showAll && <button onClick={() => setShowAll(false)} style={{ ...ghostBtn, alignSelf: 'center' }}>הצג רק קבוצות של היום</button>}

      {/* send */}
      {meeting.length > 0 && (
        <SendReport
          date={date}
          groups={reportGroups}
          candidates={meeting.map(ev => ({ id: ev.id, name: groupName(ev.title) }))}
          excluded={excluded}
          toggleExcluded={id => setExcluded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })}
        />
      )}

      {/* manage */}
      <div style={card}>
        <button onClick={() => setManage(m => !m)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '15px', fontWeight: '800', color: '#1a472a' }}>
          <span>⚙️ ניהול קבוצות וילדים</span><span style={{ color: '#aaa' }}>{manage ? '▲' : '▼'}</span>
        </button>
        {manage && (
          <Manager
            events={events}
            kidsFor={kidsFor}
            notice={notice}
            onCreate={createGroup}
            onAddKids={addKids}
            onRemoveKid={removeKid}
            onDeleteGroup={deleteGroup}
          />
        )}
      </div>
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
        <p style={{ color: '#888', fontSize: '13px', margin: '8px 0 0' }}>אין ילדים ברשימות של הקבוצות שנבחרו.</p>
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

function Manager({ events, kidsFor, notice, onCreate, onAddKids, onRemoveKid, onDeleteGroup }) {
  const [form, setForm] = useState({ name: '', days: [], time: '' })
  const [creating, setCreating] = useState(events.length === 0)
  const [pasteFor, setPasteFor] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(null)

  async function submitGroup(e) {
    e.preventDefault()
    if (!form.name.trim() || form.days.length === 0) return
    setBusy(true)
    const ok = await onCreate(form)
    setBusy(false)
    if (ok) { setForm({ name: '', days: form.days, time: '' }); setCreating(false) }
  }

  async function submitKids(ev) {
    setBusy(true)
    await onAddKids(ev, pasteText)
    setBusy(false)
    setPasteText(''); setPasteFor(null)
  }

  return (
    <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {notice && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '10px', padding: '8px 12px', fontSize: '13px' }}>{notice}</div>}

      {[...new Map([...events].sort((a, b) => DAYS_ORDER.indexOf(a.day_of_week) - DAYS_ORDER.indexOf(b.day_of_week)).map(e => [e.title, e])).values()].map(ev => {
        const kids = kidsFor(ev)
        const sessions = events.filter(e => e.title === ev.title)
        const when = sessions.map(e => (e.is_recurring && e.day_of_week ? DAYS_HE[e.day_of_week] : e.event_date ? dmy(e.event_date) : '')).filter(Boolean).join(' ו')
        return (
          <div key={ev.id} style={{ border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 140px' }}>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>{groupName(ev.title)}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>{when ? `יום ${when}` : ''}{ev.time ? ` · ${ev.time}` : ''} · {kids.length} ילדים</div>
              </div>
              <button onClick={() => { setPasteFor(pasteFor === ev.id ? null : ev.id); setPasteText('') }} style={{ ...ghostBtn, color: '#1a472a', borderColor: '#1a472a' }}>+ הוסף ילדים</button>
              <button onClick={() => setExpanded(expanded === ev.id ? null : ev.id)} style={ghostBtn}>{expanded === ev.id ? 'סגור רשימה' : 'הרשימה'}</button>
            </div>

            {pasteFor === ev.id && (
              <div style={{ marginTop: '10px' }}>
                <label style={labelStyle}>שמות הילדים — שם בכל שורה (אפשר להדביק רשימה מהמתנ״ס או מאקסל)</label>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={6} placeholder={'דני כהן\nנועה לוי\nיובל ברק'} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} autoFocus />
                <button onClick={() => submitKids(ev)} disabled={busy || !pasteText.trim()} style={{ ...btn('#1a472a', '#fff', { width: '100%', marginTop: '8px', opacity: busy || !pasteText.trim() ? 0.6 : 1 }) }}>
                  {busy ? 'מוסיף...' : `הוסף ${parseNames(pasteText).length || ''} ילדים לקבוצה`}
                </button>
              </div>
            )}

            {expanded === ev.id && (
              <div style={{ marginTop: '10px' }}>
                {kids.length === 0 ? <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>אין ילדים בקבוצה</p> : kids.map(k => (
                  <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: '14px' }}>
                    <span>{k.name}</span>
                    <button onClick={() => onRemoveKid(ev, k)} aria-label={`הסר את ${k.name}`} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px' }}>הסר</button>
                  </div>
                ))}
                <button onClick={() => onDeleteGroup(ev)} style={{ ...ghostBtn, color: '#dc2626', borderColor: '#fecaca', marginTop: '12px' }}>🗑 מחק את הקבוצה</button>
              </div>
            )}
          </div>
        )
      })}

      {creating ? (
        <form onSubmit={submitGroup} style={{ border: '1px dashed #bbb', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={labelStyle}>שם הקבוצה</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="כיתות א-ב" style={inputStyle} required autoFocus />
          </div>
          <div>
            <label style={labelStyle}>ימים (אפשר יותר מאחד)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {DAYS_ORDER.slice(0, 6).map(d => {
                const on = form.days.includes(d)
                return (
                  <button type="button" key={d} onClick={() => setForm(f => ({ ...f, days: on ? f.days.filter(x => x !== d) : [...f.days, d] }))} style={{
                    padding: '8px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                    background: on ? '#1a472a' : '#fff', color: on ? '#fff' : '#1a472a', border: '1px solid #1a472a',
                  }}>{DAYS_HE[d]}</button>
                )
              })}
            </div>
          </div>
          <div>
            <label style={labelStyle}>שעה</label>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={busy || form.days.length === 0} style={{ ...btn('#1a472a'), flex: 1, opacity: busy || form.days.length === 0 ? 0.6 : 1 }}>{busy ? 'יוצר...' : 'צור קבוצה'}</button>
            <button type="button" onClick={() => setCreating(false)} style={ghostBtn}>ביטול</button>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#aaa' }}>הקבוצה תופיע גם ביומן, כל שבוע בימים שנבחרו.</p>
        </form>
      ) : (
        <button onClick={() => setCreating(true)} style={{ ...ghostBtn, padding: '11px', fontSize: '14px', borderStyle: 'dashed' }}>+ קבוצה חדשה</button>
      )}
    </div>
  )
}
