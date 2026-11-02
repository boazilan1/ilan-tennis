import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [loading, setLoading] = useState(false)
  // Sent here from a page that needs an account (class registration, private lessons...)
  const cameToRegister = searchParams.has('redirect')
  const signupLink = `/signup?redirect=${encodeURIComponent(redirectTo)}`

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setUnconfirmed(false)
    setResendMsg('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) navigate(redirectTo)
    else if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message || '')) setUnconfirmed(true)
    else setError('אימייל או סיסמה שגויים. אם עדיין אין לך חשבון — צור חשבון חדש בכפתור שמתחת.')
    setLoading(false)
  }

  async function resendConfirmation() {
    setResendMsg('')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendMsg(error ? 'לא הצלחנו לשלוח שוב כרגע — נסה בעוד כמה דקות.' : 'שלחנו מייל אימות חדש. בדוק גם בתיקיית הספאם.')
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px' }}>🎾</div>
          <h1 style={{ color: '#1a472a', margin: '8px 0 4px' }}>כניסה למערכת</h1>
          <p style={{ color: '#888', margin: 0 }}>ברוך הבא לאילן טניס</p>
        </div>

        {cameToRegister && (
          <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', textAlign: 'right' }}>
            <div style={{ fontWeight: '800', color: '#92400e', marginBottom: '4px' }}>לפני שנרשמים או משלמים — צריך חשבון באתר</div>
            <div style={{ fontSize: '13.5px', color: '#78350f', lineHeight: 1.6 }}>
              יוצרים חשבון פעם אחת (חינם), ורק אחרי זה בוחרים חוג או אימון ומשלמים. כבר יש לך חשבון? התחבר כאן למטה.
            </div>
          </div>
        )}

        <Link to={signupLink} style={{
          display: 'block', textAlign: 'center', textDecoration: 'none', background: '#1a472a', color: '#fff',
          borderRadius: '10px', padding: '14px', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px',
        }}>
          ✨ אין לי חשבון — יצירת חשבון חדש
        </Link>
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', margin: '14px 0' }}>— כבר יש לך חשבון? התחבר: —</div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' }}>אימייל</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' }}>סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {error && <p style={{ color: '#e53e3e', margin: 0, textAlign: 'center' }}>{error}</p>}
          {unconfirmed && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px 14px', textAlign: 'right', fontSize: '14px', color: '#78350f', lineHeight: 1.6 }}>
              <strong>האימייל שלך עוד לא אושר.</strong> בעת ההרשמה נשלח אליך מייל עם קישור לאישור — צריך ללחוץ עליו לפני הכניסה (בדוק גם בספאם).
              <div style={{ marginTop: '8px' }}>
                <button type="button" onClick={resendConfirmation} style={{ background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>שלח לי שוב מייל אימות</button>
              </div>
              {resendMsg && <div style={{ marginTop: '8px', fontWeight: 'bold' }}>{resendMsg}</div>}
            </div>
          )}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', color: '#666', margin: '16px 0 0' }}>
          <Link to="/forgot-password" style={{ color: '#888', fontSize: '14px' }}>שכחתי סיסמה</Link>
        </p>
      </div>
    </main>
  )
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #ddd',
  fontSize: '16px',
  boxSizing: 'border-box',
  outline: 'none',
}

const btnStyle = {
  background: '#1a472a',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '8px',
}
