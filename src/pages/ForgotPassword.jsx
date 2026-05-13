import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError('שגיאה בשליחת המייל, נסה שוב')
    else setSent(true)
    setLoading(false)
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px' }}>🔑</div>
          <h1 style={{ color: '#1a472a', margin: '8px 0 4px' }}>שכחתי סיסמה</h1>
          <p style={{ color: '#888', margin: 0 }}>נשלח לך קישור לאיפוס הסיסמה</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <p style={{ color: '#333', fontWeight: 'bold', marginBottom: '8px' }}>המייל נשלח!</p>
            <p style={{ color: '#666', marginBottom: '24px' }}>בדוק את תיבת הדואר שלך ולחץ על הקישור לאיפוס הסיסמה.</p>
            <Link to="/login" style={{ color: '#1a472a', fontWeight: 'bold' }}>חזרה לכניסה</Link>
          </div>
        ) : (
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

            {error && <p style={{ color: '#e53e3e', margin: 0, textAlign: 'center' }}>{error}</p>}

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
            </button>

            <p style={{ textAlign: 'center', margin: 0, color: '#666' }}>
              <Link to="/login" style={{ color: '#1a472a', fontWeight: 'bold' }}>חזרה לכניסה</Link>
            </p>
          </form>
        )}
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
