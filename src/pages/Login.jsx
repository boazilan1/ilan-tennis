import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('אימייל או סיסמה שגויים')
    else navigate('/')
    setLoading(false)
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px' }}>🎾</div>
          <h1 style={{ color: '#1a472a', margin: '8px 0 4px' }}>כניסה למערכת</h1>
          <p style={{ color: '#888', margin: 0 }}>ברוך הבא לאילן טניס</p>
        </div>

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

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', color: '#666' }}>
          אין לך חשבון?{' '}
          <Link to="/signup" style={{ color: '#1a472a', fontWeight: 'bold' }}>הרשמה</Link>
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
