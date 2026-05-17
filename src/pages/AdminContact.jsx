import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminContact() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('contact_submissions').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSubmissions(data); setLoading(false) })
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '800', color: '#111' }}>
        פניות ({submissions.length})
      </h2>
      {submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#ccc', fontSize: '15px' }}>אין פניות עדיין</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {submissions.map(s => (
            <div key={s.id} style={{
              background: '#fff', borderRadius: '14px', padding: '18px 22px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0',
              borderRight: '4px solid #1a472a',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#111' }}>{s.name}</div>
                  <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                    <a href={`mailto:${s.email}`} style={{ color: '#1a472a', textDecoration: 'none' }}>{s.email}</a>
                    {s.phone && <span> · <a href={`tel:${s.phone}`} style={{ color: '#1a472a', textDecoration: 'none' }}>{s.phone}</a></span>}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#bbb' }}>
                  {new Date(s.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {s.message && (
                <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#444', lineHeight: 1.6, borderRight: '3px solid #e0e0e0' }}>
                  {s.message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
