import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { formatDateISO } from '../lib/billing'

const DEFAULT_TERMS = 'אני מאשר/ת כי קראתי והבנתי את תנאי ההרשמה לאימון הפרטי, לרבות מדיניות התשלום והביטול, ומסכים/ה להם.'
const DEFAULT_PAYMENT_LINK = 'https://mrng.to/yLXsO2hg8s'

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
  fontFamily: 'inherit',
}
const labelStyle = { display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }

const DAYS_HE = { sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת' }
const DAYS_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function formatDateHe(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' })
}

const MAX_WEEK_OFFSET = 1 // browsing/booking is limited to the next two weeks
const MIN_NOTICE_HOURS = 3

function slotDateTime(slotDate, time) {
  const [h, m] = (time || '0:0').split(':').map(Number)
  const d = new Date(slotDate)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

function isTooLateToBook(slotDate, time) {
  return slotDateTime(slotDate, time).getTime() - Date.now() < MIN_NOTICE_HOURS * 60 * 60 * 1000
}

function getWeekDays(weekOffset) {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7)
  return DAYS_ORDER.map((key, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return { key, date: d }
  })
}

export default function PrivateLessons() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const slotId = searchParams.get('slot')
  const buyPackage = searchParams.get('buy') === 'package'

  const [slots, setSlots] = useState([])
  const [closedDays, setClosedDays] = useState({})
  const [locations, setLocations] = useState([])
  const [slot, setSlot] = useState(null)
  const [players, setPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [showNewPlayer, setShowNewPlayer] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBirthYear, setNewBirthYear] = useState('')
  const [balanceByPlayer, setBalanceByPlayer] = useState({})
  const [paymentMethod, setPaymentMethod] = useState('immediate')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsText, setTermsText] = useState(DEFAULT_TERMS)
  const [packageOptions, setPackageOptions] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [bookedActive, setBookedActive] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate(`/login?redirect=${encodeURIComponent('/private-lessons' + (slotId ? `?slot=${slotId}` : buyPackage ? '?buy=package' : ''))}`); return }

    async function load() {
      const settingsRes = await supabase.from('site_settings').select('key, value').in('key', [
        'register_terms_text', 'package_option1_sessions', 'package_option1_price',
        'package_option2_sessions', 'package_option2_price',
      ])
      const s = {}
      settingsRes.data?.forEach(r => { if (r.value) s[r.key] = r.value })
      if (s.register_terms_text) setTermsText(s.register_terms_text)
      const opts = []
      if (s.package_option1_sessions && s.package_option1_price) opts.push({ sessions: Number(s.package_option1_sessions), price: Number(s.package_option1_price) })
      if (s.package_option2_sessions && s.package_option2_price) opts.push({ sessions: Number(s.package_option2_sessions), price: Number(s.package_option2_price) })
      setPackageOptions(opts.length ? opts : [{ sessions: 1, price: 200 }, { sessions: 5, price: 900 }])

      const [playersRes, locRes] = await Promise.all([
        supabase.from('players').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('locations').select('*').order('sort_order'),
      ])
      if (playersRes.data) setPlayers(playersRes.data)
      if (locRes.data) setLocations(locRes.data)

      if (playersRes.data?.length) {
        const { data: packagesData } = await supabase.from('lesson_packages')
          .select('player_id, remaining_sessions').eq('status', 'active').in('player_id', playersRes.data.map(p => p.id))
        const balMap = {}
        packagesData?.forEach(p => { balMap[p.player_id] = (balMap[p.player_id] || 0) + p.remaining_sessions })
        setBalanceByPlayer(balMap)
      }

      if (slotId) {
        const { data: slotData } = await supabase.from('private_slots').select('*').eq('id', slotId).single()
        setSlot(slotData || null)
      } else if (!buyPackage) {
        const todayStr = formatDateISO(new Date())
        const [slotsRes, closedRes] = await Promise.all([
          supabase.from('private_slots').select('*').eq('status', 'open').gte('slot_date', todayStr).order('slot_date').order('time'),
          supabase.from('closed_days').select('date, reason').gte('date', todayStr),
        ])
        setSlots(slotsRes.data || [])
        const closedMap = {}
        closedRes.data?.forEach(c => { closedMap[c.date] = c.reason || '' })
        setClosedDays(closedMap)
      }
      setLoading(false)
    }
    load()
  }, [user, authLoading, navigate, slotId, buyPackage])

  async function handleBookSubmit(e) {
    e.preventDefault()
    setError('')
    if (!termsAccepted) { setError('יש לאשר את תנאי ההרשמה כדי להמשיך'); return }

    setSubmitting(true)
    try {
      let playerId = selectedPlayerId
      if (showNewPlayer || players.length === 0) {
        if (!newName.trim()) { setError('יש להזין שם'); setSubmitting(false); return }
        const year = parseInt(newBirthYear)
        const currentYear = new Date().getFullYear()
        if (!year || year < 1930 || year > currentYear) { setError(`שנת לידה חייבת להיות בין 1930 ל-${currentYear}`); setSubmitting(false); return }
        const { data: newPlayer, error: playerError } = await supabase.from('players')
          .insert({ user_id: user.id, name: newName.trim(), birth_year: year }).select().single()
        if (playerError) throw playerError
        playerId = newPlayer.id
      }
      if (!playerId) { setError('יש לבחור שחקן'); setSubmitting(false); return }

      const { data: booking, error: bookError } = await supabase
        .rpc('book_private_slot', {
          p_player_id: playerId, p_slot_id: slot.id, p_payment_method: paymentMethod,
          p_signature_name: null, p_signature_data: null,
        })
        .select().single()

      if (bookError) {
        if (bookError.message?.includes('SLOT_UNAVAILABLE')) setError('המשבצת הזו כבר לא פנויה')
        else if (bookError.message?.includes('ALREADY_BOOKED')) setError('כבר נרשמת למשבצת זו')
        else if (bookError.message?.includes('NO_BALANCE')) setError('אין יתרת אימונים פעילה לשחקן/ית זה')
        else if (bookError.message?.includes('TOO_LATE')) setError(`ההרשמה למשבצת זו נסגרה — יש להירשם עד ${MIN_NOTICE_HOURS} שעות לפני האימון`)
        else throw bookError
        setSubmitting(false)
        return
      }

      if (paymentMethod === 'balance') {
        setBookedActive(true)
        setSubmitting(false)
        return
      }

      sessionStorage.setItem('ilan_pending_private_booking', JSON.stringify({ id: booking.id, kind: 'privateBooking' }))

      let paymentUrl = slot.payment_link || DEFAULT_PAYMENT_LINK
      try {
        const payRes = await fetch('/api/private-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'privateBooking', id: booking.id }),
        })
        if (payRes.ok) {
          const payData = await payRes.json()
          if (payData.url) paymentUrl = payData.url
        } else {
          console.error('private-payment failed, falling back to static payment link')
        }
      } catch (payErr) {
        console.error('private-payment request failed, falling back to static payment link', payErr)
      }

      window.location.href = paymentUrl
    } catch (err) {
      setError('אירעה שגיאה, נסה שוב')
      console.error(err)
      setSubmitting(false)
    }
  }

  async function handleBuyPackage(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      let playerId = selectedPlayerId
      if (showNewPlayer || players.length === 0) {
        if (!newName.trim()) { setError('יש להזין שם'); setSubmitting(false); return }
        const year = parseInt(newBirthYear)
        const currentYear = new Date().getFullYear()
        if (!year || year < 1930 || year > currentYear) { setError(`שנת לידה חייבת להיות בין 1930 ל-${currentYear}`); setSubmitting(false); return }
        const { data: newPlayer, error: playerError } = await supabase.from('players')
          .insert({ user_id: user.id, name: newName.trim(), birth_year: year }).select().single()
        if (playerError) throw playerError
        playerId = newPlayer.id
      }
      if (!playerId) { setError('יש לבחור שחקן'); setSubmitting(false); return }

      const pkg = packageOptions[selectedPackage]
      const { data: newPackage, error: pkgError } = await supabase.from('lesson_packages')
        .insert({ user_id: user.id, player_id: playerId, session_count: pkg.sessions, remaining_sessions: pkg.sessions, price: pkg.price, status: 'pending' })
        .select().single()
      if (pkgError) throw pkgError

      sessionStorage.setItem('ilan_pending_private_booking', JSON.stringify({ id: newPackage.id, kind: 'package' }))

      let paymentUrl = DEFAULT_PAYMENT_LINK
      try {
        const payRes = await fetch('/api/private-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'package', id: newPackage.id }),
        })
        if (payRes.ok) {
          const payData = await payRes.json()
          if (payData.url) paymentUrl = payData.url
        } else {
          console.error('private-payment failed, falling back to static payment link')
        }
      } catch (payErr) {
        console.error('private-payment request failed, falling back to static payment link', payErr)
      }

      window.location.href = paymentUrl
    } catch (err) {
      setError('אירעה שגיאה, נסה שוב')
      console.error(err)
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>טוען...</p>
      </main>
    )
  }

  const playerPicker = (
    <>
      {players.length > 0 && !showNewPlayer && (
        <div>
          <label style={labelStyle}>מי משתתף באימון?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {players.map(p => (
              <label key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: selectedPlayerId === p.id ? '#e8f5e9' : '#f9f9f9',
                border: `2px solid ${selectedPlayerId === p.id ? '#1a472a' : '#ddd'}`,
                borderRadius: '8px', padding: '12px', cursor: 'pointer',
              }}>
                <input type="radio" name="player" checked={selectedPlayerId === p.id} onChange={() => setSelectedPlayerId(p.id)} />
                <span style={{ fontWeight: '500' }}>{p.name}</span>
                <span style={{ color: '#888', fontSize: '13px' }}>יליד {p.birth_year}</span>
                {balanceByPlayer[p.id] > 0 && (
                  <span style={{ marginRight: 'auto', fontSize: '12px', fontWeight: '700', color: '#0e7490', background: '#ecfeff', borderRadius: '20px', padding: '2px 10px' }}>
                    יתרה: {balanceByPlayer[p.id]} אימונים
                  </span>
                )}
              </label>
            ))}
          </div>
          <button type="button" onClick={() => { setShowNewPlayer(true); setSelectedPlayerId('') }} style={{
            marginTop: '12px', background: 'none', border: '2px dashed #1a472a', color: '#1a472a',
            borderRadius: '8px', padding: '10px', width: '100%', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
          }}>+ הוסף שחקן חדש</button>
        </div>
      )}
      {(showNewPlayer || players.length === 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={labelStyle}>פרטי השחקן</label>
            {players.length > 0 && (
              <button type="button" onClick={() => setShowNewPlayer(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>← חזרה לרשימה</button>
            )}
          </div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="שם מלא" style={inputStyle} />
          <input value={newBirthYear} onChange={e => setNewBirthYear(e.target.value)} placeholder="שנת לידה" type="number" style={inputStyle} />
        </div>
      )}
    </>
  )

  // ── Buy a package ──
  if (buyPackage) {
    return (
      <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)', color: 'white', textAlign: 'center', padding: '52px 24px 44px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px' }}>רכישת חבילת אימונים פרטיים</h1>
          <p style={{ opacity: 0.85, fontSize: '15px', margin: 0 }}>שלמו פעם אחת, השתמשו ביתרה בכל אימון פרטי שתבחרו</p>
        </div>
        <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 20px 60px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <form onSubmit={handleBuyPackage} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>בחר/י חבילה</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {packageOptions.map((pkg, i) => (
                    <label key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                      background: selectedPackage === i ? '#e8f5e9' : '#f9f9f9',
                      border: `2px solid ${selectedPackage === i ? '#1a472a' : '#ddd'}`,
                      borderRadius: '10px', padding: '14px', cursor: 'pointer',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="radio" name="pkg" checked={selectedPackage === i} onChange={() => setSelectedPackage(i)} />
                        <span style={{ fontWeight: '700' }}>{pkg.sessions === 1 ? 'אימון אחד' : `${pkg.sessions} אימונים`}</span>
                      </span>
                      <span style={{ fontWeight: '800', color: '#1a472a' }}>₪{pkg.price}</span>
                    </label>
                  ))}
                </div>
              </div>
              {playerPicker}
              {error && <p style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', margin: 0, fontSize: '14px' }}>{error}</p>}
              <button type="submit" disabled={submitting || (players.length > 0 && !showNewPlayer && !selectedPlayerId)} style={{
                background: '#1a472a', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px',
                fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                opacity: (submitting || (players.length > 0 && !showNewPlayer && !selectedPlayerId)) ? 0.6 : 1,
              }}>{submitting ? 'מעביר לתשלום...' : `לתשלום — ₪${packageOptions[selectedPackage]?.price || ''}`}</button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  // ── Book a specific slot ──
  if (slotId) {
    if (!slot) {
      return (
        <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <p style={{ color: '#c00' }}>המשבצת לא נמצאה או כבר לא פנויה</p>
          <Link to="/private-lessons" style={{ color: '#1a472a' }}>חזרה לרשימת המשבצות</Link>
        </main>
      )
    }
    if (bookedActive) {
      return (
        <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ marginBottom: '16px' }}><Icon name="check" size={44} color="#1a472a" /></div>
            <h2 style={{ color: '#1a472a', marginBottom: '8px' }}>ההרשמה אושרה!</h2>
            <p style={{ color: '#555', marginBottom: '24px' }}>נוכה שיעור אחד מהיתרה שלך. מחכים לראותכם ב-{formatDateHe(slot.slot_date)} בשעה {slot.time}</p>
            <Link to="/" style={{ display: 'inline-block', background: '#1a472a', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '15px' }}>חזרה לעמוד הבית</Link>
          </div>
        </main>
      )
    }
    if (isTooLateToBook(slot.slot_date, slot.time)) {
      return (
        <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <p style={{ color: '#c00' }}>ההרשמה למשבצת זו נסגרה — יש להירשם עד {MIN_NOTICE_HOURS} שעות לפני האימון</p>
          <Link to="/private-lessons" style={{ color: '#1a472a' }}>חזרה ליומן</Link>
        </main>
      )
    }
    const hasBalance = selectedPlayerId && balanceByPlayer[selectedPlayerId] > 0
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ color: '#1a472a', marginBottom: '4px', textAlign: 'center' }}>הרשמה לאימון פרטי</h1>
        <div style={{ background: '#ecfeff', borderRadius: '10px', padding: '16px', marginBottom: '28px' }}>
          <p style={{ margin: '2px 0', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="calendar" size={15} color="#0e7490" />{formatDateHe(slot.slot_date)} בשעה {slot.time}
          </p>
          <p style={{ margin: '2px 0', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="tag" size={15} color="#0e7490" />₪{slot.price}
          </p>
        </div>
        <form onSubmit={handleBookSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {playerPicker}

          {selectedPlayerId && (
            <div>
              <label style={labelStyle}>אופן תשלום</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: paymentMethod === 'immediate' ? '#e8f5e9' : '#f9f9f9',
                  border: `2px solid ${paymentMethod === 'immediate' ? '#1a472a' : '#ddd'}`,
                  borderRadius: '8px', padding: '12px', cursor: 'pointer',
                }}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'immediate'} onChange={() => setPaymentMethod('immediate')} />
                  <span style={{ fontWeight: '500' }}>תשלום מיידי — ₪{slot.price}</span>
                </label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: paymentMethod === 'balance' ? '#e8f5e9' : '#f9f9f9',
                  border: `2px solid ${paymentMethod === 'balance' ? '#1a472a' : '#ddd'}`,
                  borderRadius: '8px', padding: '12px', cursor: 'pointer', opacity: hasBalance ? 1 : 0.5,
                }}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'balance'} disabled={!hasBalance} onChange={() => setPaymentMethod('balance')} />
                  <span style={{ fontWeight: '500' }}>שימוש ביתרה {hasBalance ? `(${balanceByPlayer[selectedPlayerId]} נותרו)` : '(אין יתרה זמינה)'}</span>
                </label>
              </div>
              {!hasBalance && (
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  <Link to="/private-lessons?buy=package" style={{ color: '#0e7490', fontWeight: '700' }}>רכשו חבילת אימונים לקבלת יתרה →</Link>
                </div>
              )}
            </div>
          )}

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
            background: '#f8faf8', border: '1px solid #e0e8e0', borderRadius: '10px', padding: '14px',
          }}>
            <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: '3px', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#444', lineHeight: 1.6 }}>{termsText}</span>
          </label>

          {error && <p style={{ color: '#c00', background: '#fff0f0', padding: '10px', borderRadius: '8px', margin: 0, fontSize: '14px' }}>{error}</p>}

          <button type="submit" disabled={submitting || !termsAccepted || (players.length > 0 && !showNewPlayer && !selectedPlayerId)} style={{
            background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px',
            fontSize: '16px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: (submitting || !termsAccepted || (players.length > 0 && !showNewPlayer && !selectedPlayerId)) ? 0.6 : 1,
          }}>
            {submitting ? 'רושם...' : paymentMethod === 'balance' ? 'אישור הרשמה' : 'המשך לתשלום'}
          </button>
        </form>
      </main>
    )
  }

  // ── Browse open slots, week by week ──
  const weekDays = getWeekDays(weekOffset)
  const weekLabel = (() => {
    const s = weekDays[0].date, e = weekDays[6].date
    return `${s.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })} – ${e.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}`
  })()
  const todayStr = formatDateISO(new Date())

  function weekHasOpenSlots(offset) {
    return getWeekDays(offset).some(({ date }) => {
      const ds = formatDateISO(date)
      if (ds < todayStr || ds in closedDays) return false
      return slots.some(s => s.slot_date === ds && !isTooLateToBook(s.slot_date, s.time))
    })
  }
  const currentWeekHasSlots = weekHasOpenSlots(weekOffset)
  const otherWeekOffset = weekOffset === 0 ? 1 : 0
  const otherWeekHasSlots = otherWeekOffset >= 0 && otherWeekOffset <= MAX_WEEK_OFFSET && weekHasOpenSlots(otherWeekOffset)

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3', padding: '40px 20px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <h1 style={{ color: '#1a472a', fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>אימונים פרטיים</h1>
        <p style={{ color: '#888', marginBottom: '20px', fontSize: '14px' }}>בחרו מועד פנוי להרשמה</p>
        <Link to="/private-lessons?buy=package" style={{
          display: 'block', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '14px',
          padding: '16px 20px', marginBottom: '28px', textDecoration: 'none', color: '#0e7490', fontWeight: '700',
        }}>💳 רכישת חבילת אימונים →</Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button onClick={() => setWeekOffset(w => w - 1)} disabled={weekOffset === 0} style={{
            background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 14px',
            cursor: weekOffset === 0 ? 'default' : 'pointer', fontSize: '13px', color: weekOffset === 0 ? '#ccc' : '#555',
          }}>קודם ▶</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '700', color: '#1a472a', fontSize: '15px' }}>{weekLabel}</div>
            {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} style={{ background: 'none', border: 'none', color: '#999', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', marginTop: '2px' }}>השבוע הנוכחי</button>}
          </div>
          <button onClick={() => setWeekOffset(w => Math.min(w + 1, MAX_WEEK_OFFSET))} disabled={weekOffset === MAX_WEEK_OFFSET} style={{
            background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 14px',
            cursor: weekOffset === MAX_WEEK_OFFSET ? 'default' : 'pointer', fontSize: '13px', color: weekOffset === MAX_WEEK_OFFSET ? '#ccc' : '#555',
          }}>◀ הבא</button>
        </div>
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: '12px', marginTop: '-10px', marginBottom: '18px' }}>
          ניתן להירשם עד שבועיים מראש, ולכל המאוחר {MIN_NOTICE_HOURS} שעות לפני האימון
        </p>

        {!currentWeekHasSlots && otherWeekHasSlots && (
          <button onClick={() => setWeekOffset(otherWeekOffset)} style={{
            display: 'block', width: '100%', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '12px',
            padding: '12px 16px', marginBottom: '16px', color: '#0e7490', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
          }}>
            אין משבצות פנויות השבוע — יש פנויות {otherWeekOffset > weekOffset ? 'בשבוע הבא ◀' : 'בשבוע הקודם ▶'}
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weekDays.map(({ key, date }) => {
            const dateStr = formatDateISO(date)
            if (dateStr < todayStr) return null
            const isClosed = dateStr in closedDays
            const daySlots = isClosed ? [] : slots.filter(s => s.slot_date === dateStr && !isTooLateToBook(s.slot_date, s.time))
            const isToday = dateStr === todayStr
            return (
              <div key={key} style={{
                background: isClosed ? '#fff7ed' : isToday ? '#f0fdf4' : '#fff',
                border: isClosed ? '1px solid #fed7aa' : isToday ? '2px solid #1a472a' : '1px solid #eee',
                borderRadius: '14px', padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: daySlots.length ? '10px' : 0 }}>
                  <div style={{ minWidth: '80px' }}>
                    <div style={{ fontWeight: '700', color: isToday ? '#1a472a' : '#222', fontSize: '14px' }}>יום {DAYS_HE[key]}</div>
                    <div style={{ fontSize: '12px', color: '#bbb' }}>
                      {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                      {isToday && <span style={{ color: '#16a34a', fontWeight: '700' }}> · היום</span>}
                    </div>
                  </div>
                  {isClosed ? (
                    <span style={{ color: '#9a3412', fontSize: '13px', fontWeight: '700' }}>🌴 חופשה{closedDays[dateStr] ? ` — ${closedDays[dateStr]}` : ''}</span>
                  ) : daySlots.length === 0 && <span style={{ color: '#ddd', fontSize: '13px' }}>אין אימונים פנויים</span>}
                </div>
                {daySlots.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {daySlots.map(s => (
                      <button key={s.id} onClick={() => navigate(`/private-lessons?slot=${s.id}`)} style={{
                        background: '#ecfeff', color: '#0e7490', border: '1px solid #a5f3fc',
                        borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', textAlign: 'right',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '700' }}>🕐 {s.time} · ₪{s.price}</div>
                        {s.location_id && locations.find(l => l.id === s.location_id) && (
                          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '1px' }}>📍 {locations.find(l => l.id === s.location_id).name}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
