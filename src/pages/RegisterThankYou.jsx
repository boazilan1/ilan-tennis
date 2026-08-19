import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

export default function RegisterThankYou() {
  const [activityName, setActivityName] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('ilan_pending_enrollment')
    if (!raw) return
    sessionStorage.removeItem('ilan_pending_enrollment')

    try {
      const { id, activityName } = JSON.parse(raw)
      setActivityName(activityName || '')
      supabase.rpc('mark_payment_redirect', { p_enrollment_id: id })
    } catch {
      // ignore malformed session data
    }
  }, [])

  return (
    <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom: '16px' }}><Icon name="check" size={44} color="#1a472a" /></div>
        <h2 style={{ color: '#1a472a', marginBottom: '8px' }}>תודה!</h2>
        <p style={{ color: '#555', marginBottom: '8px' }}>
          {activityName ? <>ההרשמה שלך לחוג <strong>{activityName}</strong> נקלטה.</> : 'ההרשמה שלך נקלטה.'}
        </p>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
          אנחנו מוודאים את התשלום מול המערכת ונעדכן אותך בהקדם.
        </p>
        <Link to="/" style={{ display: 'inline-block', background: '#1a472a', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '15px' }}>
          חזרה לעמוד הבית
        </Link>
      </div>
    </main>
  )
}
