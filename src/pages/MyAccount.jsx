import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const DAYS_HE = { sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת' }

function formatDateHe(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

const statusLabel = { active: { label: 'פעיל', color: '#16a34a', bg: '#dcfce7' }, pending: { label: 'ממתין לתשלום', color: '#b45309', bg: '#fef3c7' } }

export default function MyAccount() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [players, setPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [enrollments, setEnrollments] = useState([])
  const [bookings, setBookings] = useState([])
  const [attendance, setAttendance] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate(`/login?redirect=${encodeURIComponent('/my-account')}`); return }

    supabase.from('players').select('*').eq('user_id', user.id).order('created_at').then(({ data }) => {
      setPlayers(data || [])
      if (data?.length) setSelectedPlayerId(data[0].id)
      setLoading(false)
    })
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!selectedPlayerId) return

    async function loadDetail() {
      setLoadingDetail(true)
      const [enrollRes, bookRes, attRes, pkgRes] = await Promise.all([
        supabase.from('enrollments').select('id, status, activity:activities(id, name, time, days_of_week, day_of_week)')
          .eq('player_id', selectedPlayerId).in('status', ['active', 'pending']),
        supabase.from('private_slot_bookings').select('id, status, payment_method, slot:private_slots(slot_date, time, price)')
          .eq('player_id', selectedPlayerId).in('status', ['active', 'pending']),
        supabase.from('attendance').select('date, present, activity:activities(name)')
          .eq('player_id', selectedPlayerId).order('date', { ascending: false }),
        supabase.from('lesson_packages').select('id, session_count, remaining_sessions, status')
          .eq('player_id', selectedPlayerId).in('status', ['active', 'pending']),
      ])
      setEnrollments(enrollRes.data || [])
      setBookings(bookRes.data || [])
      setAttendance(attRes.data || [])
      setPackages(pkgRes.data || [])
      setLoadingDetail(false)
    }
    loadDetail()
  }, [selectedPlayerId])

  if (authLoading || loading) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>טוען...</p>
      </main>
    )
  }

  if (!players.length) {
    return (
      <main style={{ direction: 'rtl', flex: 1, maxWidth: '500px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#1a472a', fontSize: '22px', marginBottom: '10px' }}>האזור האישי שלי</h1>
        <p style={{ color: '#888', marginBottom: '20px' }}>עדיין אין לך מתאמנים רשומים במערכת</p>
        <Link to="/register" style={{ color: '#1a472a', fontWeight: '700' }}>להרשמה לחוג →</Link>
      </main>
    )
  }

  const activePackages = packages.filter(p => p.status === 'active')
  const pendingPackages = packages.filter(p => p.status === 'pending')
  const totalBalance = activePackages.reduce((sum, p) => sum + p.remaining_sessions, 0)
  const presentCount = attendance.filter(a => a.present === true).length

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3', padding: '40px 20px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ color: '#1a472a', fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>האזור האישי שלי</h1>

        {players.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {players.map(p => (
              <button key={p.id} onClick={() => setSelectedPlayerId(p.id)} style={{
                background: selectedPlayerId === p.id ? '#1a472a' : '#fff',
                color: selectedPlayerId === p.id ? '#fff' : '#1a472a',
                border: '1px solid #1a472a', borderRadius: '30px', padding: '8px 20px',
                cursor: 'pointer', fontWeight: '700', fontSize: '14px',
              }}>{p.name}</button>
            ))}
          </div>
        )}

        {loadingDetail ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>טוען...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Balance */}
            <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '16px', padding: '20px 24px' }}>
              <div style={{ color: '#0e7490', fontWeight: '800', fontSize: '15px', marginBottom: '6px' }}>💳 יתרת אימונים פרטיים</div>
              {totalBalance > 0 ? (
                <div style={{ color: '#0e7490', fontSize: '22px', fontWeight: '800' }}>{totalBalance} אימונים</div>
              ) : (
                <div style={{ color: '#888', fontSize: '14px' }}>אין יתרה פעילה</div>
              )}
              {pendingPackages.length > 0 && (
                <div style={{ color: '#b45309', fontSize: '13px', marginTop: '6px' }}>
                  {pendingPackages.reduce((s, p) => s + p.session_count, 0)} אימונים בחבילה שממתינה לאישור תשלום
                </div>
              )}
              <Link to="/private-lessons?buy=package" style={{ display: 'inline-block', marginTop: '10px', color: '#0e7490', fontWeight: '700', fontSize: '13px' }}>רכישת חבילה נוספת →</Link>
            </div>

            {/* Registrations */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#1a472a', fontWeight: '800', fontSize: '15px', marginBottom: '12px' }}>📋 הרשמות</div>
              {enrollments.length === 0 && bookings.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: '14px' }}>אין הרשמות פעילות</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {enrollments.map(e => {
                    const days = (e.activity?.days_of_week?.length ? e.activity.days_of_week : [e.activity?.day_of_week]).filter(Boolean)
                    const st = statusLabel[e.status] || statusLabel.pending
                    return (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#222' }}>{e.activity?.name}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            {days.map(d => DAYS_HE[d]).filter(Boolean).join(', ')} {e.activity?.time && `· ${e.activity.time}`}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', borderRadius: '20px', padding: '3px 10px', color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>{st.label}</span>
                      </div>
                    )
                  })}
                  {bookings.map(b => {
                    const st = statusLabel[b.status] || statusLabel.pending
                    return (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#222' }}>🎾 אימון פרטי</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{b.slot && formatDateHe(b.slot.slot_date)} {b.slot?.time && `· ${b.slot.time}`}</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', borderRadius: '20px', padding: '3px 10px', color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>{st.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Attendance */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ color: '#1a472a', fontWeight: '800', fontSize: '15px' }}>📅 נוכחות</div>
                {attendance.length > 0 && <div style={{ fontSize: '12px', color: '#888' }}>{presentCount}/{attendance.length} הגעות</div>}
              </div>
              {attendance.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: '14px' }}>אין עדיין נתוני נוכחות</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '320px', overflowY: 'auto' }}>
                  {attendance.map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ fontSize: '13px', color: '#333' }}>{formatDateHe(a.date)}{a.activity?.name && ` · ${a.activity.name}`}</div>
                      {a.present === true ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a', fontWeight: '700' }}><Icon name="check" size={13} color="#16a34a" />הגיע/ה</span>
                      ) : a.present === false ? (
                        <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '700' }}>נעדר/ה</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#bbb' }}>—</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
