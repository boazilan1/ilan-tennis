import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

// Pure read (no clearing here) — React 18 StrictMode double-invokes
// useState initializers in dev, and a side effect here would make the
// second call find nothing, so the actual sessionStorage.removeItem
// happens once, separately, in a useEffect below.
function readPendingEnrollment() {
  const raw = sessionStorage.getItem('ilan_pending_enrollment')
  if (raw) {
    try {
      const { id, activityName, standingOrderLink } = JSON.parse(raw)
      return { id: id || null, kind: 'enrollment', activityName: activityName || '', standingOrderLink: standingOrderLink || '' }
    } catch {
      return { id: null, kind: 'enrollment', activityName: '', standingOrderLink: '' }
    }
  }
  const rawPrivate = sessionStorage.getItem('ilan_pending_private_booking')
  if (rawPrivate) {
    try {
      const { id, kind } = JSON.parse(rawPrivate)
      return { id: id || null, kind: kind || 'privateBooking', activityName: '', standingOrderLink: '' }
    } catch {
      return { id: null, kind: 'privateBooking', activityName: '', standingOrderLink: '' }
    }
  }
  return { id: null, kind: 'enrollment', activityName: '', standingOrderLink: '' }
}

export default function RegisterThankYou() {
  const [{ id, kind, activityName, standingOrderLink }] = useState(readPendingEnrollment)
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    sessionStorage.removeItem('ilan_pending_enrollment')
    sessionStorage.removeItem('ilan_pending_private_booking')
  }, [])

  useEffect(() => {
    // A payment-provider redirect is always a fresh page load, so the
    // Supabase client's session hasn't finished restoring from storage yet
    // when this effect would otherwise fire — the RPC call would go out
    // unauthenticated and silently match zero rows. Wait for auth first.
    if (authLoading || !user || !id) return
    if (kind === 'privateBooking') supabase.rpc('mark_slot_payment_redirect', { p_booking_id: id })
    else if (kind === 'package') supabase.rpc('mark_package_payment_redirect', { p_package_id: id })
    else supabase.rpc('mark_payment_redirect', { p_enrollment_id: id })
  }, [id, kind, user, authLoading])

  if (standingOrderLink) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '16px' }}><Icon name="check" size={44} color="#1a472a" /></div>
          <h2 style={{ color: '#1a472a', marginBottom: '4px' }}>שלב 1 מ-2 הושלם ✓</h2>
          <p style={{ color: '#555', marginBottom: '20px' }}>
            {activityName ? <>התשלום הראשון לחוג <strong>{activityName}</strong> התקבל.</> : 'התשלום הראשון התקבל.'}
          </p>

          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '10px', padding: '18px', textAlign: 'right', marginBottom: '20px' }}>
            <div style={{ fontWeight: '800', color: '#dc2626', marginBottom: '6px', fontSize: '14.5px' }}>⚠️ ההרשמה עדיין לא הושלמה!</div>
            <p style={{ color: '#555', fontSize: '13.5px', lineHeight: 1.7, margin: 0 }}>
              בלי לאשר את הצעד הזה, החיוב החודשי הבא <strong>לא יתבצע אוטומטית</strong> וההרשמה תישאר לא פעילה. זו לחיצה אחת בלבד, ולא תצטרכו לחזור לזה כל חודש.
            </p>
          </div>

          <a href={standingOrderLink} style={{
            display: 'inline-block', background: '#1a472a', color: '#fff', textDecoration: 'none',
            borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: '700', marginBottom: '14px',
          }}>
            אישור אמצעי תשלום — לחצו כאן להשלמת ההרשמה ←
          </a>
          <div>
            <Link to="/" style={{ color: '#bbb', fontSize: '12px' }}>להמשיך בלי לאשר (לא מומלץ)</Link>
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
