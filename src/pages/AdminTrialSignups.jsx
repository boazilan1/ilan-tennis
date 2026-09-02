import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminTrialSignups() {
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('trial_signups').select('*').order('lesson_date', { ascending: true })
      .then(({ data }) => { if (data) setSignups(data); setLoading(false) })
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '800', color: '#111' }}>
        הרשמות לשיעור ניסיון ({signups.length})
      </h2>
      {signups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#ccc', fontSize: '15px' }}>אין הרשמות עדיין</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {signups.map(s => (
            <div key={s.id} style={{
              background: '#fff', borderRadius: '14px', padding: '18px 22px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0',
              borderRight: '4px solid #1a472a',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#111' }}>{s.full_name}</div>
                  <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                    <a href={`tel:${s.phone}`} style={{ color: '#1a472a', textDecoration: 'none' }}>{s.phone}</a>
                    {s.email && <span> · <a href={`mailto:${s.email}`} style={{ color: '#1a472a', textDecoration: 'none' }}>{s.email}</a></span>}
                  </div>
                </div>
                <div style={{
                  background: '#e8f5e9', color: '#1a472a', borderRadius: '8px',
                  padding: '6px 12px', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap',
                }}>
                  {new Date(s.lesson_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} · {s.time_slot}
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>{s.age_group}</div>
              {s.child_notes && (
                <div style={{ marginTop: '10px', background: '#f9f9f9', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#444', lineHeight: 1.6, borderRight: '3px solid #e0e0e0' }}>
                  {s.child_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
