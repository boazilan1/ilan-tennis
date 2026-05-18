import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'

const COLOR_THEMES = [
  { label: 'ירוק', color: '#1a472a', bg: '#f0f7f0', border: '#c5ddc5' },
  { label: 'כחול', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { label: 'סגול', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd9fe' },
  { label: 'כתום', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  { label: 'אדום', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { label: 'ציאן', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
]

const EMPTY = {
  title: '', subtitle: '', icon: '🎾',
  color_hex: '#1a472a', bg_hex: '#f0f7f0', border_hex: '#c5ddc5',
  content: '', image_url: '', link_url: '', link_label: '',
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
}
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '700', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }

export default function AdminSections() {
  const [sections, setSections] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSections() }, [])

  async function fetchSections() {
    setLoading(true)
    const { data } = await supabase.from('activity_sections').select('*').order('sort_order')
    if (data) setSections(data)
    setLoading(false)
  }

  function openNew() {
    setForm(EMPTY)
    setEditing('new')
  }

  function openEdit(s) {
    setForm({
      title: s.title || '', subtitle: s.subtitle || '', icon: s.icon || '🎾',
      color_hex: s.color_hex || '#1a472a', bg_hex: s.bg_hex || '#f0f7f0', border_hex: s.border_hex || '#c5ddc5',
      content: s.content || '', image_url: s.image_url || '',
      link_url: s.link_url || '', link_label: s.link_label || '',
    })
    setEditing(s)
  }

  function applyTheme(theme) {
    setForm(f => ({ ...f, color_hex: theme.color, bg_hex: theme.bg, border_hex: theme.border }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title.trim(), subtitle: form.subtitle.trim() || null,
      icon: form.icon.trim() || '🎾',
      color_hex: form.color_hex, bg_hex: form.bg_hex, border_hex: form.border_hex,
      content: form.content.trim() || null,
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
      link_label: form.link_label.trim() || null,
    }
    if (editing === 'new') {
      const maxOrder = sections.length ? Math.max(...sections.map(s => s.sort_order)) : 0
      await supabase.from('activity_sections').insert({ ...payload, sort_order: maxOrder + 1 })
    } else {
      await supabase.from('activity_sections').update(payload).eq('id', editing.id)
    }
    await fetchSections()
    setEditing(null)
    setSaving(false)
  }

  async function handleDelete(s) {
    if (!window.confirm(`למחוק את "${s.title}"?`)) return
    await supabase.from('activity_sections').delete().eq('id', s.id)
    setSections(prev => prev.filter(x => x.id !== s.id))
  }

  async function moveSection(id, dir) {
    const idx = sections.findIndex(s => s.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sections.length) return
    const a = sections[idx], b = sections[swapIdx]
    await Promise.all([
      supabase.from('activity_sections').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('activity_sections').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetchSections()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111' }}>קטעי תוכן — דף פעילויות</h2>
        <button onClick={openNew} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
          + קטע חדש
        </button>
      </div>

      {/* Form */}
      {editing && (
        <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: '800', fontSize: '16px', color: '#1a472a', marginBottom: '20px' }}>
            {editing === 'new' ? 'קטע חדש' : `עריכה: ${editing.title}`}
          </div>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

              <div><label style={labelStyle}>כותרת *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} required /></div>
              <div><label style={labelStyle}>כותרת משנה</label><input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>אייקון (אמוג׳י)</label><input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ ...inputStyle, fontSize: '24px', width: '80px' }} /></div>

              {/* Color theme */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>ערכת צבעים</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLOR_THEMES.map(t => (
                    <button key={t.label} type="button" onClick={() => applyTheme(t)} style={{
                      background: t.bg, border: `2px solid ${form.color_hex === t.color ? t.color : t.border}`,
                      borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px',
                      fontWeight: '700', color: t.color,
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>תוכן (שורה חדשה = פסקה חדשה)</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={4} placeholder="שורה ראשונה&#10;שורה שנייה&#10;שורה שלישית"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
              </div>

              {/* Image */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>תמונה</label>
                <ImageUpload value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} folder="sections" />
              </div>

              {/* Link */}
              <div><label style={labelStyle}>קישור (כפתור)</label><input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." style={inputStyle} /></div>
              <div><label style={labelStyle}>טקסט הכפתור</label><input value={form.link_label} onChange={e => setForm(f => ({ ...f, link_label: e.target.value }))} placeholder="לפרטים נוספים..." style={inputStyle} /></div>

            </div>

            {/* Preview */}
            {(form.title || form.content) && (
              <div style={{ marginTop: '20px', border: '1px solid #eee', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', padding: '8px 14px', borderBottom: '1px solid #eee', textTransform: 'uppercase', letterSpacing: '1px' }}>תצוגה מקדימה</div>
                {form.image_url && <img src={form.image_url} alt="" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} />}
                <div style={{ background: form.bg_hex, padding: '16px 20px', borderBottom: `1px solid ${form.border_hex}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>{form.icon}</span>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '17px', color: form.color_hex }}>{form.title || 'כותרת'}</div>
                    {form.subtitle && <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>{form.subtitle}</div>}
                  </div>
                </div>
                {form.content && (
                  <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {form.content.split('\n').filter(Boolean).map((p, i) => (
                      <p key={i} style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: 1.7, paddingRight: '12px', borderRight: `3px solid ${form.border_hex}` }}>{p}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setEditing(null)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontSize: '14px' }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sections list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sections.map((s, i) => (
          <div key={s.id} style={{
            background: '#fff', borderRadius: '14px', padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0',
            borderRight: `4px solid ${s.color_hex}`,
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            {s.image_url && <img src={s.image_url} alt="" style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />}
            <span style={{ fontSize: '26px' }}>{s.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: s.color_hex }}>{s.title}</div>
              {s.subtitle && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{s.subtitle}</div>}
              {s.link_url && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>🔗 {s.link_label || s.link_url}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => moveSection(s.id, -1)} disabled={i === 0} style={{ background: '#f5f5f5', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
              <button onClick={() => moveSection(s.id, 1)} disabled={i === sections.length - 1} style={{ background: '#f5f5f5', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', opacity: i === sections.length - 1 ? 0.3 : 1 }}>▼</button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => openEdit(s)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>עריכה</button>
              <button onClick={() => handleDelete(s)} style={{ background: '#fff', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>מחיקה</button>
            </div>
          </div>
        ))}
        {sections.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>אין קטעים עדיין</div>}
      </div>
    </div>
  )
}
