import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

function readPendingEnrollment() {
  const raw = sessionStorage.getItem('ilan_pending_enrollment')
  if (!raw) return { id: null, activityName: '', standingOrderLink: '' }
  sessionStorage.removeItem('ilan_pending_enrollment')
  try {
    const { id, activityName, standingOrderLink } = JSON.parse(raw)
    return { id: id || null, activityName: activityName || '', standingOrderLink: standingOrderLink || '' }
  } catch {
    return { id: null, activityName: '', standingOrderLink: '' }
  }
}

export default function RegisterThankYou() {
  const [{ id, activityName, standingOrderLink }] = useState(readPendingEnrollment)

  useEffect(() => {
    if (id) supabase.rpc('mark_payment_redirect', { p_enrollment_id: id })
  }, [id])

  if (standingOrderLink) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '16px' }}><Icon name="check" size={44} color="#1a472a" /></div>
          <h2 style={{ color: '#1a472a', marginBottom: '4px' }}>שלב 1 מ-2 הושלם ✓</h2>
          <p style={{ color: '#555', marginBottom: '20px' }}>
            {activityName ? <>התשלום הראשון לחוג <strong>{activityName}</strong> התקבל.</> : 'התשלום הראשון התקבל.'}
          </p>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '18px', textAlign: 'right', marginBottom: '20px' }}>
            <div style={{ fontWeight: '700', color: '#b45309', marginBottom: '6px' }}>נשאר רק צעד אחד</div>
            <p style={{ color: '#666', fontSize: '13.5px', lineHeight: 1.6, margin: 0 }}>
              כדי שהחיוב החודשי הבא יתבצע אוטומטית, יש לאשר את אמצעי התשלום להמשך — לחיצה אחת, בלי צורך לחזור לזה כל חודש.
            </p>
          </div>

          <a href={standingOrderLink} style={{
            display: 'inline-block', background: '#1a472a', color: '#fff', textDecoration: 'none',
            borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: '700', marginBottom: '14px',
          }}>
            אישור אמצעי תשלום להמשך ←
          </a>
          <div>
            <Link to="/" style={{ color: '#999', fontSize: '13px' }}>לא עכשיו, לעמוד הבית</Link>
          </div>
        </div>
      </main>
    )
  }

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
