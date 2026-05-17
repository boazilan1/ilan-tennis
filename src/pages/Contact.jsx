import { useState } from 'react'
import { supabase } from '../lib/supabase'

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
  fontFamily: 'inherit',
}

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim()) { setError('יש למלא שם ואימייל'); return }
    setSubmitting(true)
    const { error: err } = await supabase.from('contact_submissions').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim() || null,
    })
    if (err) { setError('אירעה שגיאה, נסה שוב'); setSubmitting(false); return }
    setSent(true)
    setSubmitting(false)
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
        color: 'white', textAlign: 'center', padding: '52px 24px 44px',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px' }}>יצירת קשר</h1>
        <p style={{ opacity: 0.85, fontSize: '15px', margin: 0 }}>נשמח לענות על כל שאלה</p>
      </div>

      <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 20px 60px' }}>
        {sent ? (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#1a472a', marginBottom: '10px' }}>הפנייה נשלחה!</h2>
            <p style={{ color: '#666', lineHeight: 1.6 }}>תודה, {form.name}! נחזור אליך בהקדם.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                  שם מלא <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="ישראל ישראלי" style={inputStyle} required />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                  אימייל <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" style={inputStyle} required />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                  טלפון <span style={{ color: '#aaa', fontWeight: '400' }}>(אופציונלי)</span>
                </label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="050-0000000" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                  הערה או שאלה <span style={{ color: '#aaa', fontWeight: '400' }}>(אופציונלי)</span>
                </label>
                <textarea name="message" value={form.message} onChange={handleChange}
                  placeholder="כתוב כאן את השאלה או ההערה שלך..." rows={4}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              {error && <p style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', margin: 0, fontSize: '14px' }}>{error}</p>}

              <button type="submit" disabled={submitting} style={{
                background: '#1a472a', color: '#fff', border: 'none', borderRadius: '12px',
                padding: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                opacity: submitting ? 0.6 : 1, marginTop: '4px',
              }}>
                {submitting ? 'שולח...' : 'שלח פנייה'}
              </button>
            </form>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="mailto:ilantennisacademy@gmail.com" style={{ color: '#555', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📧 ilantennisacademy@gmail.com
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
