import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import SignaturePad from '../components/SignaturePad'

const DEFAULT_TERMS = 'אני מאשר/ת כי קראתי והבנתי את תנאי ההרשמה לאימון הפרטי, לרבות מדיניות התשלום והביטול, ומסכים/ה להם.'
const DEFAULT_PAYMENT_LINK = 'https://mrng.to/yLXsO2hg8s'

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
  fontFamily: 'inherit',
}
const labelStyle = { display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }

function formatDateHe(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' })
}

export default function PrivateLessons() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const slotId = searchParams.get('slot')
  const buyPackage = searchParams.get('buy') === 'package'

  const [slots, setSlots] = useState([])
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
  const [signatureName, setSignatureName] = useState('')
  const [signatureData, setSignatureData] = useState('')
  const [packageOptions, setPackageOptions] = useState([])
  const [packagePaymentLink, setPackagePaymentLink] = useState('')
  const [selectedPackage, setSelectedPackage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [bookedActive, setBookedActive] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate(`/login?redirect=${encodeURIComponent('/private-lessons' + (slotId ? `?slot=${slotId}` : buyPackage ? '?buy=package' : ''))}`); return }

    async function load() {
      const settingsRes = await supabase.from('site_settings').select('key, value').in('key', [
        'register_terms_text', 'package_option1_sessions', 'package_option1_price',
        'package_option2_sessions', 'package_option2_price', 'package_payment_link',
      ])
      const s = {}
      settingsRes.data?.forEach(r => { if (r.value) s[r.key] = r.value })
      if (s.register_terms_text) setTermsText(s.register_terms_text)
      setPackagePaymentLink(s.package_payment_link || '')
      const opts = []
      if (s.package_option1_sessions && s.package_option1_price) opts.push({ sessions: Number(s.package_option1_sessions), price: Number(s.package_option1_price) })
      if (s.package_option2_sessions && s.package_option2_price) opts.push({ sessions: Number(s.package_option2_sessions), price: Number(s.package_option2_price) })
      setPackageOptions(opts.length ? opts : [{ sessions: 5, price: 600 }, { sessions: 10, price: 1100 }])

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
        const todayStr = new Date().toISOString().split('T')[0]
        const { data: slotsData } = await supabase.from('private_slots').select('*').eq('status', 'open').gte('slot_date', todayStr).order('slot_date').order('time')
        setSlots(slotsData || [])
      }
      setLoading(false)
    }
    load()
  }, [user, authLoading, navigate, slotId, buyPackage])

  async function handleBookSubmit(e) {
    e.preventDefault()
    setError('')
    if (!termsAccepted) { setError('יש לאשר את תנאי ההרשמה כדי להמשיך'); return }
    if (!signatureData) { setError('יש לחתום בעזרת האצבע או העכבר'); return }

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
          p_signature_name: signatureName.trim(), p_signature_data: signatureData,
        })
        .select().single()

      if (bookError) {
        if (bookError.message?.includes('SLOT_UNAVAILABLE')) setError('המשבצת הזו כבר לא פנויה')
        else if (bookError.message?.includes('ALREADY_BOOKED')) setError('כבר נרשמת למשבצת זו')
        else if (bookError.message?.includes('NO_BALANCE')) setError('אין יתרת אימונים פעילה לשחקן/ית זה')
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
      window.location.href = slot.payment_link || DEFAULT_PAYMENT_LINK
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
      window.location.href = packagePaymentLink || DEFAULT_PAYMENT_LINK
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
                        <span style={{ fontWeight: '700' }}>{pkg.sessions} אימונים</span>
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

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#333' }}>שם מלא לחתימה (רשות)</label>
            <input type="text" value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="הקלד/י את שמך המלא"
              style={{ ...inputStyle, marginBottom: '10px' }} />
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#333' }}>חתימה <span style={{ color: '#c00' }}>*</span></label>
            <SignaturePad onChange={setSignatureData} />
          </div>

          {error && <p style={{ color: '#c00', background: '#fff0f0', padding: '10px', borderRadius: '8px', margin: 0, fontSize: '14px' }}>{error}</p>}

          <button type="submit" disabled={submitting || !termsAccepted || !signatureData || (players.length > 0 && !showNewPlayer && !selectedPlayerId)} style={{
            background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px',
            fontSize: '16px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: (submitting || !termsAccepted || !signatureData || (players.length > 0 && !showNewPlayer && !selectedPlayerId)) ? 0.6 : 1,
          }}>
            {submitting ? 'רושם...' : paymentMethod === 'balance' ? 'אישור הרשמה' : 'המשך לתשלום'}
          </button>
        </form>
      </main>
    )
  }

  // ── Browse open slots ──
  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3', padding: '40px 20px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <h1 style={{ color: '#1a472a', fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>אימונים פרטיים</h1>
        <p style={{ color: '#888', marginBottom: '20px', fontSize: '14px' }}>בחרו מועד פנוי להרשמה</p>
        <Link to="/private-lessons?buy=package" style={{
          display: 'block', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '14px',
          padding: '16px 20px', marginBottom: '28px', textDecoration: 'none', color: '#0e7490', fontWeight: '700',
        }}>💳 רכישת חבילת אימונים →</Link>

        {slots.length === 0 ? (
          <p style={{ color: '#bbb', textAlign: 'center', padding: '24px 0' }}>אין משבצות פנויות כרגע</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {slots.map(s => (
              <button key={s.id} onClick={() => navigate(`/private-lessons?slot=${s.id}`)} style={{
                background: 'white', border: '1px solid #e8ece8', borderRight: '4px solid #0e7490',
                borderRadius: '14px', padding: '16px 20px', cursor: 'pointer', textAlign: 'right',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
              }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#0e7490' }}>{formatDateHe(s.slot_date)}</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                    🕐 {s.time}
                    {s.location_id && locations.find(l => l.id === s.location_id) && ` · 📍 ${locations.find(l => l.id === s.location_id).name}`}
                  </div>
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#1a472a' }}>₪{s.price}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
