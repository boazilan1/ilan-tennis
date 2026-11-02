import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  async function resendConfirmation() {
    setResendMsg('')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendMsg(error ? 'לא הצלחנו לשלוח שוב כרגע — נסה בעוד כמה דקות.' : 'שלחנו מייל אימות חדש. בדוק גם בתיקיית הספאם.')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } }
      })

      if (error) {
        setError(error.message)
        return
      }

      if (!data.user) {
        setError('אירעה שגיאה בהרשמה, נסה שוב')
        return
      }

      // For an email that already has an account Supabase returns a user with no
      // identities and sends nothing — so the person would wait for a mail that never comes.
      if (data.user.identities?.length === 0) {
        setError('כבר קיים חשבון עם האימייל הזה. התחבר, או לחץ "שכחתי סיסמה" בעמוד הכניסה אם שכחת את הסיסמה.')
        return
      }

      await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName, phone })

      if (!data.session) {
        setError('')
        setAwaitingConfirm(true)
        return
      }

      navigate(redirectTo)
    } catch (err) {
      setError('אירעה שגיאה, נסה שוב')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (awaitingConfirm) {
    return (
      <main style={{ direction: 'rtl', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>📧</div>
          <h1 style={{ color: '#1a472a', margin: '8px 0 12px' }}>עוד צעד אחד — אישור האימייל</h1>
          <p style={{ color: '#444', lineHeight: 1.7, margin: '0 0 8px' }}>
            שלחנו מייל אל <strong dir="ltr">{email}</strong>.
          </p>
          <p style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '10px', padding: '12px', color: '#78350f', fontSize: '14px', lineHeight: 1.7, margin: '0 0 18px' }}>
            <strong>צריך ללחוץ על הקישור שבמייל לפני שאפשר להיכנס.</strong><br />
            לא רואה אותו? בדוק בתיקיית הספאם / קידומי מכירות.
          </p>
          <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} style={{
            display: 'block', textDecoration: 'none', background: '#1a472a', color: '#fff', borderRadius: '10px',
            padding: '14px', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px',
          }}>אישרתי — להתחברות</Link>
          <button type="button" onClick={resendConfirmation} style={{ background: 'none', border: 'none', color: '#1a472a', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}>
            לא קיבלתי מייל — שלח שוב
          </button>
          {resendMsg && <p style={{ color: '#555', fontSize: '13px', margin: '10px 0 0' }}>{resendMsg}</p>}
        </div>
      </main>
    )
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px' }}>🎾</div>
          <h1 style={{ color: '#1a472a', margin: '8px 0 4px' }}>יצירת חשבון באתר</h1>
          <p style={{ color: '#888', margin: 0 }}>שלב ראשון, לפני ההרשמה לחוג או התשלום. פעם אחת בלבד.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>שם מלא</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={inputStyle} placeholder="ישראל ישראלי" />
          </div>
          <div>
            <label style={labelStyle}>אימייל</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="your@email.com" />
          </div>
          <div>
            <label style={labelStyle}>טלפון</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required style={inputStyle} placeholder="050-0000000" />
          </div>
          <div>
            <label style={labelStyle}>סיסמה</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="לפחות 6 תווים" minLength={6} />
          </div>

          {error && <p style={{ color: '#e53e3e', margin: 0, textAlign: 'center' }}>{error}</p>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'יוצר חשבון...' : 'יצירת חשבון'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', color: '#666' }}>
          יש לך כבר חשבון?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} style={{ color: '#1a472a', fontWeight: 'bold' }}>כניסה</Link>
        </p>
      </div>
    </main>
  )
}

const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' }
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' }
const btnStyle = { background: '#1a472a', color: 'white', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }
