import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'
import { ImageControls } from '../components/ImageDisplay'

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
}
const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: '700', color: '#555',
  marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px',
}

function toSlug(str) {
  return str.trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0590-\u05FF-]/g, '')
}

// ── Section editor inside a page ──────────────────────────────────────────────
function PageSectionEditor({ pageId, onClose }) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ image_url: '', image_fit: 'cover', image_height: 260, caption: '', caption_color: '#333333', caption_size: 15, button_label: '', button_url: '', button_color: '#1a472a' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSections() }, [pageId])

  async function fetchSections() {
    setLoading(true)
    const { data } = await supabase.from('page_sections').select('*').eq('page_id', pageId).order('sort_order')
    if (data) setSections(data)
    setLoading(false)
  }

  function startNew() {
    setForm({ image_url: '', image_fit: 'cover', image_height: 260, caption: '', caption_color: '#333333', caption_size: 15, button_label: '', button_url: '', button_color: '#1a472a' })
    setEditingId('new')
  }

  function startEdit(s) {
    setForm({ image_url: s.image_url || '', image_fit: s.image_fit || 'cover', image_height: s.image_height || 260, caption: s.caption || '', caption_color: s.caption_color || '#333333', caption_size: s.caption_size || 15, button_label: s.button_label || '', button_url: s.button_url || '', button_color: s.button_color || '#1a472a' })
    setEditingId(s.id)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.image_url && !form.caption) return
    setSaving(true)
    if (editingId === 'new') {
      const maxOrder = sections.length ? Math.max(...sections.map(s => s.sort_order)) : 0
      await supabase.from('page_sections').insert({
        page_id: pageId,
        image_url: form.image_url || null,
        image_fit: form.image_fit,
        image_height: Number(form.image_height),
        caption: form.caption.trim() || null,
        caption_color: form.caption_color,
        caption_size: Number(form.caption_size),
        button_label: form.button_label.trim() || null,
        button_url: form.button_url.trim() || null,
        button_color: form.button_color,
        sort_order: maxOrder + 1,
      })
    } else {
      await supabase.from('page_sections').update({
        image_url: form.image_url || null,
        image_fit: form.image_fit,
        image_height: Number(form.image_height),
        caption: form.caption.trim() || null,
        caption_color: form.caption_color,
        caption_size: Number(form.caption_size),
        button_label: form.button_label.trim() || null,
        button_url: form.button_url.trim() || null,
        button_color: form.button_color,
      }).eq('id', editingId)
    }
    await fetchSections()
    setEditingId(null)
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק סקשן זה?')) return
    await supabase.from('page_sections').delete().eq('id', id)
    setSections(prev => prev.filter(s => s.id !== id))
  }

  async function move(id, dir) {
    const idx = sections.findIndex(s => s.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sections.length) return
    const a = sections[idx], b = sections[swapIdx]
    await Promise.all([
      supabase.from('page_sections').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('page_sections').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetchSections()
  }

  return (
    <div style={{ background: '#f8faf8', border: '1px solid #d0ddd0', borderRadius: '16px', padding: '24px', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontWeight: '800', fontSize: '15px', color: '#1a472a' }}>סקשנים בדף</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={startNew} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>+ סקשן חדש</button>
          <button onClick={onClose} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>סגור</button>
        </div>
      </div>

      {/* Form */}
      {editingId && (
        <div style={{ background: '#fff', border: '1px solid #e0e8e0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>תמונה</label>
              <ImageUpload value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} folder="pages" />
              <ImageControls
                imageUrl={form.image_url}
                fit={form.image_fit}
                height={form.image_height}
                onFitChange={v => setForm(f => ({ ...f, image_fit: v }))}
                onHeightChange={v => setForm(f => ({ ...f, image_height: v }))}
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>כיתוב / טקסט</label>
              <textarea
                value={form.caption}
                onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                rows={4}
                placeholder="תיאור, כיתוב, מידע..."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, color: form.caption_color, fontSize: form.caption_size + 'px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>צבע טקסט</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {['#333333','#1a472a','#1d4ed8','#7c3aed','#b45309','#dc2626','#0f766e','#ffffff'].map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, caption_color: c }))} style={{
                      width: '26px', height: '26px', borderRadius: '50%', background: c,
                      border: form.caption_color === c ? '3px solid #333' : '2px solid #ddd',
                      cursor: 'pointer', flexShrink: 0,
                    }} />
                  ))}
                  <input type="color" value={form.caption_color} onChange={e => setForm(f => ({ ...f, caption_color: e.target.value }))}
                    style={{ width: '32px', height: '26px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', padding: '1px' }} title="צבע מותאם אישית" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>גודל פונט</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[{ label: 'קטן', size: 13 }, { label: 'רגיל', size: 15 }, { label: 'גדול', size: 18 }, { label: 'XL', size: 22 }].map(opt => (
                    <button key={opt.size} type="button" onClick={() => setForm(f => ({ ...f, caption_size: opt.size }))} style={{
                      background: form.caption_size === opt.size ? '#1a472a' : '#f5f5f5',
                      color: form.caption_size === opt.size ? '#fff' : '#333',
                      border: 'none', borderRadius: '6px', padding: '5px 12px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    }}>{opt.label}</button>
                  ))}
                  <input type="number" min="10" max="48" value={form.caption_size} onChange={e => setForm(f => ({ ...f, caption_size: Number(e.target.value) }))}
                    style={{ width: '60px', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '14px', background: '#f8faf8', border: '1px solid #e0e8e0', borderRadius: '10px', padding: '14px' }}>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>כפתור (אופציונלי)</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ ...labelStyle, fontSize: '11px' }}>טקסט הכפתור</label>
                  <input value={form.button_label} onChange={e => setForm(f => ({ ...f, button_label: e.target.value }))} placeholder="לחצו כאן..." style={inputStyle} />
                </div>
                <div style={{ flex: 2, minWidth: '180px' }}>
                  <label style={{ ...labelStyle, fontSize: '11px' }}>קישור</label>
                  <input value={form.button_url} onChange={e => setForm(f => ({ ...f, button_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '11px' }}>צבע כפתור</label>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {['#1a472a','#1d4ed8','#7c3aed','#b45309','#dc2626','#0f766e'].map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, button_color: c }))} style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: form.button_color === c ? '3px solid #333' : '2px solid #ddd', cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={form.button_color} onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))} style={{ width: '30px', height: '24px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', padding: '1px' }} />
                  </div>
                </div>
              </div>
              {form.button_label && (
                <div style={{ marginTop: '10px' }}>
                  <span style={{ background: form.button_color, color: '#fff', borderRadius: '8px', padding: '7px 18px', fontSize: '13px', fontWeight: '700' }}>{form.button_label}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingId(null)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontSize: '13px' }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sections list */}
      {loading ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>טוען...</div>
      ) : sections.length === 0 ? (
        <div style={{ color: '#bbb', textAlign: 'center', padding: '24px' }}>אין סקשנים עדיין — הוסף את הראשון</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sections.map((s, i) => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {s.image_url && <img src={s.image_url} alt="" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                {s.caption && <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{s.caption.slice(0, 120)}{s.caption.length > 120 ? '...' : ''}</p>}
                {!s.image_url && !s.caption && <span style={{ color: '#ccc', fontSize: '13px' }}>סקשן ריק</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <button onClick={() => move(s.id, -1)} disabled={i === 0} style={{ background: '#f5f5f5', border: 'none', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', fontSize: '11px', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => move(s.id, 1)} disabled={i === sections.length - 1} style={{ background: '#f5f5f5', border: 'none', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', fontSize: '11px', opacity: i === sections.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => startEdit(s)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '5px 11px', cursor: 'pointer', fontSize: '12px' }}>עריכה</button>
                <button onClick={() => handleDelete(s.id)} style={{ background: '#fff', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '5px 11px', cursor: 'pointer', fontSize: '12px' }}>מחיקה</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main AdminPages component ─────────────────────────────────────────────────
export default function AdminPages() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [form, setForm] = useState({ title: '', slug: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPages() }, [])

  async function fetchPages() {
    setLoading(true)
    const { data } = await supabase.from('pages').select('*').order('sort_order')
    if (data) setPages(data)
    setLoading(false)
  }

  function openNew() {
    setForm({ title: '', slug: '', description: '' })
    setEditing('new')
  }

  function openEdit(p) {
    setForm({ title: p.title, slug: p.slug, description: p.description || '' })
    setEditing(p)
  }

  function handleTitleChange(val) {
    setForm(f => ({
      ...f,
      title: val,
      slug: editing === 'new' ? toSlug(val) : f.slug,
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.slug.trim()) return
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
    }
    if (editing === 'new') {
      const maxOrder = pages.length ? Math.max(...pages.map(p => p.sort_order)) : 0
      const { data } = await supabase.from('pages').insert({ ...payload, sort_order: maxOrder + 1 }).select().single()
      await fetchPages()
      if (data) setExpandedId(data.id)
    } else {
      await supabase.from('pages').update(payload).eq('id', editing.id)
      await fetchPages()
    }
    setEditing(null)
    setSaving(false)
  }

  async function handleDelete(p) {
    if (!window.confirm(`למחוק את "${p.title}"? כל הסקשנים שלו יימחקו גם כן.`)) return
    await supabase.from('pages').delete().eq('id', p.id)
    setPages(prev => prev.filter(x => x.id !== p.id))
    if (expandedId === p.id) setExpandedId(null)
  }

  async function move(id, dir) {
    const idx = pages.findIndex(p => p.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= pages.length) return
    const a = pages[idx], b = pages[swapIdx]
    await Promise.all([
      supabase.from('pages').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('pages').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetchPages()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111' }}>דפים ציבוריים</h2>
        <button onClick={openNew} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
          + דף חדש
        </button>
      </div>

      {/* Form */}
      {editing && (
        <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: '800', fontSize: '16px', color: '#1a472a', marginBottom: '20px' }}>
            {editing === 'new' ? 'דף חדש' : `עריכה: ${editing.title}`}
          </div>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>כותרת הדף *</label>
                <input value={form.title} onChange={e => handleTitleChange(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>כתובת URL (slug) *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#aaa', whiteSpace: 'nowrap' }}>/page/</span>
                  <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={inputStyle} required placeholder="school-name" />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>תיאור קצר (אופציונלי)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="תיאור הדף..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setEditing(null)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontSize: '14px' }}>ביטול</button>
              <button type="submit" disabled={saving} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pages list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {pages.map((p, i) => (
          <div key={p.id}>
            <div style={{
              background: '#fff', borderRadius: '14px', padding: '16px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0',
              borderRight: '4px solid #1a472a',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a472a' }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px', direction: 'ltr', textAlign: 'right' }}>/page/{p.slug}</div>
                {p.description && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{p.description}</div>}
              </div>
              <a href={`/page/${p.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#1a472a', textDecoration: 'none', background: '#f0f7f0', borderRadius: '6px', padding: '5px 10px', whiteSpace: 'nowrap' }}>
                צפייה 🔗
              </a>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => move(p.id, -1)} disabled={i === 0} style={{ background: '#f5f5f5', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => move(p.id, 1)} disabled={i === pages.length - 1} style={{ background: '#f5f5f5', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', opacity: i === pages.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  style={{ background: expandedId === p.id ? '#1a472a' : '#fff', color: expandedId === p.id ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}
                >
                  {expandedId === p.id ? '▲ סקשנים' : '▼ סקשנים'}
                </button>
                <button onClick={() => openEdit(p)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>עריכה</button>
                <button onClick={() => handleDelete(p)} style={{ background: '#fff', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>מחיקה</button>
              </div>
            </div>
            {expandedId === p.id && (
              <PageSectionEditor pageId={p.id} onClose={() => setExpandedId(null)} />
            )}
          </div>
        ))}
        {pages.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>אין דפים עדיין</div>}
      </div>
    </div>
  )
}
