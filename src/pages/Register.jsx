import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import SignaturePad from '../components/SignaturePad'

const DEFAULT_TERMS = 'אני מאשר/ת כי קראתי והבנתי את תנאי ההרשמה לחוג, לרבות מדיניות התשלום והביטול, ומסכים/ה להם.'

const DAYS_HE = {
  sunday: 'ראשון',
  monday: 'שני',
  tuesday: 'שלישי',
  wednesday: 'רביעי',
  thursday: 'חמישי',
  friday: 'שישי',
  saturday: 'שבת',
}

function formatDays(a) {
  const days = a.days_of_week?.length ? a.days_of_week : (a.day_of_week ? [a.day_of_week] : [])
  return days.map(d => DAYS_HE[d]).filter(Boolean).join(', ')
}

export default function Register() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const activityId = searchParams.get('activity')

  const [allActivities, setAllActivities] = useState([])
  const [locations, setLocations] = useState([])
  const [activity, setActivity] = useState(null)
  const [players, setPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [showNewPlayer, setShowNewPlayer] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBirthYear, setNewBirthYear] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsText, setTermsText] = useState(DEFAULT_TERMS)
  const [termsFileUrl, setTermsFileUrl] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [signatureData, setSignatureData] = useState('')

  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', ['register_terms_text', 'register_terms_file_url'])
      .then(({ data }) => {
        data?.forEach(r => {
          if (r.key === 'register_terms_text' && r.value) setTermsText(r.value)
          if (r.key === 'register_terms_file_url') setTermsFileUrl(r.value || '')
        })
      })
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    if (!activityId) {
      Promise.all([
        supabase.from('activities').select('*').order('time'),
        supabase.from('locations').select('*').order('sort_order'),
      ]).then(([actRes, locRes]) => {
        if (actRes.data) setAllActivities(actRes.data)
        if (locRes.data) setLocations(locRes.data)
        setLoading(false)
      })
      return
    }
    async function fetchData() {
      const [activityRes, playersRes] = await Promise.all([
        supabase.from('activities').select('*').eq('id', activityId).single(),
        supabase.from('players').select('*').eq('user_id', user.id).order('created_at'),
      ])
      if (activityRes.data) setActivity(activityRes.data)
      if (playersRes.data) setPlayers(playersRes.data)
      setLoading(false)
    }
    fetchData()
  }, [user, authLoading, activityId, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!termsAccepted) {
      setError('יש לאשר את תנאי ההרשמה כדי להמשיך')
      return
    }

    if (!signatureName.trim()) {
      setError('יש להזין שם מלא לחתימה')
      return
    }

    if (!signatureData) {
      setError('יש לחתום בעזרת האצבע או העכבר')
      return
    }

    setSubmitting(true)

    try {
      let playerId = selectedPlayerId

      // אם נוסף שחקן חדש
      if (showNewPlayer || players.length === 0) {
        if (!newName.trim()) {
          setError('יש להזין שם')
          setSubmitting(false)
          return
        }
        const year = parseInt(newBirthYear)
        const currentYear = new Date().getFullYear()
        if (!year || year < 1930 || year > currentYear) {
          setError(`שנת לידה חייבת להיות בין 1930 ל-${currentYear}`)
          setSubmitting(false)
          return
        }

        const { data: newPlayer, error: playerError } = await supabase
          .from('players')
          .insert({ user_id: user.id, name: newName.trim(), birth_year: year, notes: newNotes.trim() || null })
          .select()
          .single()

        if (playerError) throw playerError
        playerId = newPlayer.id
      }

      if (!playerId) {
        setError('יש לבחור שחקן')
        setSubmitting(false)
        return
      }

      const { data: newEnrollment, error: enrollError } = await supabase
        .rpc('upsert_registration', { p_player_id: playerId, p_activity_id: activityId, p_signature_name: signatureName.trim(), p_signature_data: signatureData })
        .select()
        .single()

      if (enrollError) {
        if (enrollError.message?.includes('ALREADY_ACTIVE')) {
          setError('השחקן כבר רשום ופעיל בחוג זה')
        } else {
          throw enrollError
        }
        setSubmitting(false)
        return
      }

      // מעבר לתשלום
      sessionStorage.setItem('ilan_pending_enrollment', JSON.stringify({
        id: newEnrollment.id, activityName: activity.name,
      }))
      const paymentUrl = activity.payment_link || 'https://mrng.to/yLXsO2hg8s'
      window.location.href = paymentUrl
    } catch (err) {
      setError('אירעה שגיאה, נסה שוב')
      console.error(err)
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>טוען...</p>
      </main>
    )
  }

  if (!activityId) {
    const groups = locations.map(l => ({ location: l, items: allActivities.filter(a => a.location_id === l.id) })).filter(g => g.items.length > 0)
    const unassigned = allActivities.filter(a => !locations.some(l => l.id === a.location_id))
    if (unassigned.length > 0) groups.push({ location: null, items: unassigned })

    return (
      <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3', padding: '40px 20px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <h1 style={{ color: '#1a472a', fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>הרשמה לחוג</h1>
          <p style={{ color: '#888', marginBottom: '28px', fontSize: '14px' }}>בחרו חוג להרשמה</p>

          {groups.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {groups.map((group, gi) => (
                <div key={group.location?.id || 'other'}>
                  <h2 style={{ color: '#1a472a', fontSize: '17px', fontWeight: '800', marginBottom: '10px' }}>
                    {group.location?.name || 'כללי'}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {group.items.map(a => (
                      <button key={a.id} onClick={() => navigate(`/register?activity=${a.id}`)} style={{
                        background: 'white', border: '1px solid #e8ece8', borderRight: '4px solid #1a472a',
                        borderRadius: '14px', padding: '18px 20px', cursor: 'pointer', textAlign: 'right',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '6px',
                      }}>
                        <div style={{ fontWeight: '800', fontSize: '17px', color: '#1a472a' }}>{a.name}</div>
                        {a.description && <div style={{ fontSize: '13px', color: '#666' }}>{a.description}</div>}
                        <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: '#555', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Icon name="calendar" size={14} color="var(--sand)" />{formatDays(a)}</span>
                          {a.time && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Icon name="clock" size={14} color="var(--sand)" />{a.time}</span>}
                          {a.age_group && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Icon name="users" size={14} color="var(--sand)" />{a.age_group}</span>}
                          {a.price && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Icon name="tag" size={14} color="var(--sand)" />₪{a.price} לחודש</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#bbb', textAlign: 'center', padding: '24px 0' }}>אין חוגים זמינים כרגע</p>
          )}
        </div>
      </main>
    )
  }

  if (!activity) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ color: '#c00' }}>החוג לא נמצא</p>
      </main>
    )
  }

  if (success) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '16px' }}><Icon name="check" size={44} color="#1a472a" /></div>
          <h2 style={{ color: '#1a472a', marginBottom: '8px' }}>ההרשמה בוצעה בהצלחה!</h2>
          <p style={{ color: '#555', marginBottom: '24px' }}>נרשמת לחוג <strong>{activity.name}</strong></p>
          <button
            onClick={() => navigate('/')}
            style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '15px', cursor: 'pointer' }}
          >
            חזרה לעמוד הבית
          </button>
        </div>
      </main>
    )
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: currentYear - 1929 }, (_, i) => currentYear - i)

  return (
    <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ color: '#1a472a', marginBottom: '4px', textAlign: 'center' }}>הרשמה לחוג</h1>

      {/* פרטי החוג */}
      <div style={{ background: '#e8f5e9', borderRadius: '10px', padding: '16px', marginBottom: '28px' }}>
        <h3 style={{ margin: '0 0 8px', color: '#1a472a' }}>{activity.name}</h3>
        <p style={{ margin: '2px 0', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="calendar" size={15} color="var(--sand)" />{formatDays(activity)} בשעה {activity.time}</p>
        <p style={{ margin: '2px 0', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="tag" size={15} color="var(--sand)" />₪{activity.price} לחודש</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* בחירת שחקן קיים */}
        {players.length > 0 && !showNewPlayer && (
          <div>
            <label style={{ fontWeight: 'bold', color: '#1a472a', display: 'block', marginBottom: '8px' }}>
              מי נרשם לחוג?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map(p => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: selectedPlayerId === p.id ? '#e8f5e9' : '#f9f9f9',
                  border: `2px solid ${selectedPlayerId === p.id ? '#1a472a' : '#ddd'}`,
                  borderRadius: '8px', padding: '12px', cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="player"
                    value={p.id}
                    checked={selectedPlayerId === p.id}
                    onChange={() => setSelectedPlayerId(p.id)}
                  />
                  <span style={{ fontWeight: '500' }}>{p.name}</span>
                  <span style={{ color: '#888', fontSize: '13px' }}>יליד {p.birth_year}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { setShowNewPlayer(true); setSelectedPlayerId('') }}
              style={{
                marginTop: '12px', background: 'none', border: '2px dashed #1a472a',
                color: '#1a472a', borderRadius: '8px', padding: '10px', width: '100%',
                cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
              }}
            >
              + הוסף שחקן חדש
            </button>
          </div>
        )}

        {/* טופס שחקן חדש */}
        {(showNewPlayer || players.length === 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', color: '#1a472a' }}>פרטי השחקן</label>
              {players.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewPlayer(false)}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}
                >
                  ← חזרה לרשימה
                </button>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#333' }}>
                שם מלא <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="שם פרטי ושם משפחה"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#333' }}>
                שנת לידה <span style={{ color: '#c00' }}>*</span>
              </label>
              <select
                value={newBirthYear}
                onChange={e => setNewBirthYear(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px', boxSizing: 'border-box' }}
              >
                <option value="">בחר שנה</option>
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#333' }}>
                הערות (אופציונלי)
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="למשל: בעיות בריאותיות, רמה וכו'"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
          background: '#f8faf8', border: '1px solid #e0e8e0', borderRadius: '10px', padding: '14px',
        }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            style={{ marginTop: '3px', flexShrink: 0 }}
          />
          <span style={{ fontSize: '13px', color: '#444', lineHeight: 1.6 }}>
            {termsText}
            {termsFileUrl && (
              <>
                {' '}
                <a href={termsFileUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#1a472a', fontWeight: '700' }}>
                  לצפייה בתנאים המלאים
                </a>
              </>
            )}
          </span>
        </label>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#333' }}>
            חתימה — שם מלא <span style={{ color: '#c00' }}>*</span>
          </label>
          <input
            type="text"
            value={signatureName}
            onChange={e => setSignatureName(e.target.value)}
            placeholder="הקלד/י את שמך המלא"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px', boxSizing: 'border-box', marginBottom: '10px' }}
          />
          <SignaturePad onChange={setSignatureData} />
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>השם והחתימה מהווים אישור דיגיטלי להרשמה ולתנאיה</div>
        </div>

        {error && (
          <p style={{ color: '#c00', background: '#fff0f0', padding: '10px', borderRadius: '8px', margin: 0, fontSize: '14px' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !termsAccepted || !signatureName.trim() || !signatureData || (players.length > 0 && !showNewPlayer && !selectedPlayerId)}
          style={{
            background: '#1a472a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: (submitting || !termsAccepted || !signatureName.trim() || !signatureData || (players.length > 0 && !showNewPlayer && !selectedPlayerId)) ? 0.6 : 1,
          }}
        >
          {submitting ? 'רושם...' : 'אישור הרשמה'}
        </button>
      </form>
    </main>
  )
}
