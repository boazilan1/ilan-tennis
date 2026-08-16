import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0e7e0', fontSize: '14px', boxSizing: 'border-box', background: '#fff', outline: 'none' }
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#555', fontWeight: '600' }
const primaryBtn = { background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }
const outlineBtn = { background: '#fff', color: '#444', border: '1px solid #ddd', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }

export default function AdminLocations() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchLocations() }, [])

  async function fetchLocations() {
    setLoading(true)
    const { data } = await supabase.from('locations').select('*').order('sort_order')
    if (data) setLocations(data)
    setLoading(false)
  }

  function startNew() { setName(''); setEditingId('new') }
  function startEdit(l) { setName(l.name); setEditingId(l.id) }
  function closeForm() { setEditingId(null); setName('') }

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    if (editingId === 'new') {
      const maxOrder = locations.length ? Math.max(...locations.map(l => l.sort_order || 0)) : 0
      await supabase.from('locations').insert({ name: name.trim(), sort_order: maxOrder + 1 })
    } else {
      await supabase.from('locations').update({ name: name.trim() }).eq('id', editingId)
    }
    await fetchLocations()
    setSaving(false)
    closeForm()
  }

  async function handleDelete(l) {
    if (!window.confirm(`למחוק את "${l.name}"? חוגים המשויכים למיקום זה יישארו ללא מיקום.`)) return
    await supabase.from('locations').delete().eq('id', l.id)
    setLocations(prev => prev.filter(x => x.id !== l.id))
  }

  async function move(id, dir) {
    const idx = locations.findIndex(l => l.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= locations.length) return
    const a = locations[idx], b = locations[swapIdx]
    await Promise.all([
      supabase.from('locations').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('locations').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetchLocations()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111' }}>מיקומים</h2>
        {!editingId && <button onClick={startNew} style={primaryBtn}>+ מיקום חדש</button>}
      </div>

      {editingId && (
        <form onSubmit={handleSave} style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '16px', padding: '20px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>שם המיקום *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="לדוגמה: ציפורי" style={inputStyle} autoFocus />
          </div>
          <button type="button" onClick={closeForm} style={outlineBtn}>ביטול</button>
          <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'שומר...' : 'שמור'}</button>
        </form>
      )}

      {locations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#bbb' }}>אין מיקומים עדיין — לחץ "+ מיקום חדש" להתחיל</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {locations.map((l, i) => (
            <div key={l.id} style={{ background: '#fff', borderRadius: '16px', padding: '16px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #f0f0f0', borderRight: '4px solid #1a472a' }}>
              <div style={{ flex: 1, fontWeight: '700', fontSize: '15px', color: '#111' }}>{l.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <button onClick={() => move(l.id, -1)} disabled={i === 0} style={{ background: '#f5f5f5', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => move(l.id, 1)} disabled={i === locations.length - 1} style={{ background: '#f5f5f5', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px', opacity: i === locations.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => startEdit(l)} style={outlineBtn}>עריכה</button>
                <button onClick={() => handleDelete(l)} style={{ ...outlineBtn, color: '#dc2626', borderColor: '#dc2626' }}>מחיקה</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
