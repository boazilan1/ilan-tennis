import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = {
  pending:  { label: 'ממתין לתשלום', color: '#d97706', bg: '#fef3c7' },
  active:   { label: 'פעילה ✓',       color: '#16a34a', bg: '#dcfce7' },
  depleted: { label: 'נוצלה במלואה',  color: '#888',    bg: '#f3f4f6' },
  cancelled:{ label: 'בוטלה',         color: '#dc2626', bg: '#fee2e2' },
}

export default function AdminPackages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchPackages() }, [])

  async function fetchPackages() {
    setLoading(true)
    const { data } = await supabase.from('lesson_packages')
      .select('id, session_count, remaining_sessions, price, status, created_at, payment_redirect_at, player:players(name, birth_year), profile:profiles!lesson_packages_user_id_fkey(full_name, phone, email)')
      .order('created_at', { ascending: false })
    if (data) setPackages(data)
    setLoading(false)
  }

  async function confirmPayment(pkg) {
    setUpdating(pkg.id)
    await supabase.from('lesson_packages').update({ status: 'active' }).eq('id', pkg.id)
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status: 'active' } : p))
    setUpdating(null)
  }

  async function cancelPackage(pkg) {
    if (!window.confirm(`לבטל את החבילה של ${pkg.player?.name}?`)) return
    setUpdating(pkg.id)
    await supabase.from('lesson_packages').update({ status: 'cancelled' }).eq('id', pkg.id)
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status: 'cancelled' } : p))
    setUpdating(null)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  const filtered = filter === 'all' ? packages : packages.filter(p => p.status === filter)
  const counts = {
    all: packages.length,
    pending: packages.filter(p => p.status === 'pending').length,
    active: packages.filter(p => p.status === 'active').length,
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '800', color: '#111' }}>
        חבילות אימונים פרטיים ({packages.length})
      </h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[['all', 'הכל'], ['pending', 'ממתינות'], ['active', 'פעילות']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            background: filter === key ? '#1a472a' : '#fff', color: filter === key ? '#fff' : '#666',
            border: `1px solid ${filter === key ? '#1a472a' : '#ddd'}`, borderRadius: '20px',
            padding: '5px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
          }}>{label} ({counts[key] ?? 0})</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#ccc', fontSize: '15px' }}>אין חבילות</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(pkg => {
            const st = STATUS_LABELS[pkg.status] || STATUS_LABELS.pending
            return (
              <div key={pkg.id} style={{
                background: '#fff', borderRadius: '14px', padding: '18px 22px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0',
                borderRight: `4px solid ${st.color}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
              }}>
                <div style={{ flex: '1.2', minWidth: '160px' }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#111' }}>{pkg.player?.name}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>יליד {pkg.player?.birth_year}</div>
                </div>
                <div style={{ flex: '1.2', minWidth: '160px' }}>
                  <div style={{ fontSize: '14px', color: '#444' }}>{pkg.profile?.full_name || '—'}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{pkg.profile?.phone || ''} {pkg.profile?.email || ''}</div>
                </div>
                <div style={{ fontSize: '13px', color: '#333' }}>
                  {pkg.remaining_sessions}/{pkg.session_count} שיעורים · ₪{pkg.price}
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: '700', color: st.color, background: st.bg,
                  borderRadius: '20px', padding: '4px 10px', whiteSpace: 'nowrap',
                }}>{st.label}</span>
                {pkg.status === 'pending' && pkg.payment_redirect_at && (
                  <span title={`חזר מהתשלום ב-${new Date(pkg.payment_redirect_at).toLocaleString('he-IL')}`} style={{
                    fontSize: '11px', fontWeight: '700', color: '#b45309', background: '#fffbeb',
                    border: '1px solid #fde68a', borderRadius: '20px', padding: '4px 10px', whiteSpace: 'nowrap',
                  }}>חזר מתשלום ✓</span>
                )}
                <div style={{ display: 'flex', gap: '6px', marginRight: 'auto' }}>
                  {pkg.status === 'pending' && (
                    <button onClick={() => confirmPayment(pkg)} disabled={updating === pkg.id} style={{
                      background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px',
                      padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                      opacity: updating === pkg.id ? 0.6 : 1,
                    }}>אשר תשלום</button>
                  )}
                  {pkg.status !== 'cancelled' && (
                    <button onClick={() => cancelPackage(pkg)} disabled={updating === pkg.id} style={{
                      background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px',
                      padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                      opacity: updating === pkg.id ? 0.6 : 1,
                    }}>ביטול</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
