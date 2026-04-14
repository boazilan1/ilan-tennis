import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })

    if (error) setError(error.message)
    else {
      await supabase.from('profiles').upsert({ id: (await supabase.auth.getUser()).data.user.id, full_name: fullName, phone })
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px' }}>🎾</div>
          <h1 style={{ color: '#1a472a', margin: '8px 0 4px' }}>הרשמה</h1>
          <p style={{ color: '#888', margin: 0 }}>צור חשבון חדש באילן טניס</p>
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
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="050-0000000" />
          </div>
          <div>
            <label style={labelStyle}>סיסמה</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="לפחות 6 תווים" minLength={6} />
          </div>

          {error && <p style={{ color: '#e53e3e', margin: 0, textAlign: 'center' }}>{error}</p>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'נרשם...' : 'הרשמה'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', color: '#666' }}>
          יש לך כבר חשבון?{' '}
          <Link to="/login" style={{ color: '#1a472a', fontWeight: 'bold' }}>כניסה</Link>
        </p>
      </div>
    </main>
  )
}

const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' }
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' }
const btnStyle = { background: '#1a472a', color: 'white', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }
