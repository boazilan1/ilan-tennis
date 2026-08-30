import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const DATES = [
  { value: '2026-09-03', label: 'חמישי, 3.9' },
  { value: '2026-09-07', label: 'שני, 7.9' },
]

const SLOTS = [
  { time: '16:00–16:45', ageGroup: 'כיתות ב׳–ג׳' },
  { time: '16:45–17:30', ageGroup: 'כיתות ד׳–ו׳' },
  { time: '17:30–18:15', ageGroup: 'כיתה ז׳ ומעלה' },
  { time: '18:15–19:00', ageGroup: 'בוגרים' },
]

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
  fontFamily: 'inherit',
}

export default function TrialLesson() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()

  const [fullNameInput, setFullNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [childNotes, setChildNotes] = useState('')
  const [lessonDate, setLessonDate] = useState('')
  const [slotIndex, setSlotIndex] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const fullName = fullNameInput || profile?.full_name || ''
  const phone = phoneInput || profile?.phone || ''

  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/login?redirect=/trial-lesson')
  }, [user, authLoading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!fullName.trim() || !phone.trim()) { setError('יש למלא שם וטלפון'); return }
    if (!lessonDate) { setError('יש לבחור תאריך'); return }
    if (slotIndex === '') { setError('יש לבחור שעה'); return }

    const slot = SLOTS[slotIndex]
    setSubmitting(true)

    const { error: err } = await supabase.from('trial_signups').insert({
      user_id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: user.email,
      child_notes: childNotes.trim() || null,
      lesson_date: lessonDate,
      time_slot: slot.time,
      age_group: slot.ageGroup,
    })

    if (err) { setError('אירעה שגיאה, נסה שוב'); setSubmitting(false); return }

    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'trial_signup',
          registrantEmail: user.email,
          registrantName: fullName.trim(),
          phone: phone.trim(),
          lessonDate: DATES.find(d => d.value === lessonDate)?.label || lessonDate,
          timeSlot: slot.time,
          ageGroup: slot.ageGroup,
        }),
      })
    } catch (notifyErr) {
      console.error('notify email failed', notifyErr)
    }

    setSent(true)
    setSubmitting(false)
  }

  if (authLoading || !user) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>טוען...</p>
      </main>
    )
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
        color: 'white', textAlign: 'center', padding: '52px 24px 44px',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px' }}>הרשמה לשיעור ניסיון</h1>
        <p style={{ opacity: 0.85, fontSize: '15px', margin: 0 }}>נוקדים — בחרו תאריך ושעה מתאימים</p>
      </div>

      <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 20px 60px' }}>
        {sent ? (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ marginBottom: '16px' }}><Icon name="check" size={48} color="#1a472a" /></div>
            <h2 style={{ color: '#1a472a', marginBottom: '10px' }}>נרשמת לשיעור הניסיון!</h2>
            <p style={{ color: '#666', lineHeight: 1.6 }}>נחזור אליך בהקדם לאישור הפרטים. מחכים לראותך על המגרש!</p>
            <Link to="/" style={{ display: 'inline-block', marginTop: '20px', background: '#1a472a', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '15px' }}>
              חזרה לעמוד הבית
            </Link>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '8px' }}>
                  תאריך <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {DATES.map(d => (
                    <label key={d.value} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: lessonDate === d.value ? '#e8f5e9' : '#f9f9f9',
                      border: `2px solid ${lessonDate === d.value ? '#1a472a' : '#ddd'}`,
                      borderRadius: '10px', padding: '12px 14px', cursor: 'pointer',
                    }}>
                      <input type="radio" name="lessonDate" value={d.value} checked={lessonDate === d.value} onChange={() => setLessonDate(d.value)} />
                      <span style={{ fontWeight: '600' }}>{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '8px' }}>
                  שעה וקבוצת גיל <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {SLOTS.map((s, i) => (
                    <label key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                      background: String(slotIndex) === String(i) ? '#e8f5e9' : '#f9f9f9',
                      border: `2px solid ${String(slotIndex) === String(i) ? '#1a472a' : '#ddd'}`,
                      borderRadius: '10px', padding: '12px 14px', cursor: 'pointer',
                    }}>
                      <input type="radio" name="slot" value={i} checked={String(slotIndex) === String(i)} onChange={() => setSlotIndex(i)} />
                      <span style={{ fontWeight: '700', color: '#1a472a' }}>{s.time}</span>
                      <span style={{ color: '#666', fontSize: '13px' }}>{s.ageGroup}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                  שם מלא <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input value={fullName} onChange={e => setFullNameInput(e.target.value)} placeholder="ישראל ישראלי" style={inputStyle} required />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                  טלפון <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input type="tel" value={phone} onChange={e => setPhoneInput(e.target.value)} placeholder="050-0000000" style={inputStyle} required />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                  הערות <span style={{ color: '#aaa', fontWeight: '400' }}>(אופציונלי, למשל שם וגיל הילד/ה)</span>
                </label>
                <textarea value={childNotes} onChange={e => setChildNotes(e.target.value)} rows={3}
                  placeholder="פרטים נוספים..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              {error && <p style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', margin: 0, fontSize: '14px' }}>{error}</p>}

              <button type="submit" disabled={submitting} style={{
                background: '#1a472a', color: '#fff', border: 'none', borderRadius: '12px',
                padding: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                opacity: submitting ? 0.6 : 1, marginTop: '4px',
              }}>
                {submitting ? 'שולח...' : 'הרשמה לשיעור ניסיון'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
