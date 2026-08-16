import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'

const inp = { width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
const lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#666', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }

const ALL_KEYS = [
  'home_hero_title','home_hero_title_size','home_hero_subtitle','home_hero_subtitle_size',
  'home_hero_cta1','home_hero_cta2',
  'home_cta_title','home_cta_title_size','home_cta_subtitle','home_cta_button',
  'home_locations_title',
  'home_f1_icon','home_f1_title','home_f1_text',
  'home_f2_icon','home_f2_title','home_f2_text',
  'home_f3_icon','home_f3_title','home_f3_text',
  'home_f4_icon','home_f4_title','home_f4_text',
  'home_l1_icon','home_l1_title','home_l1_text',
  'home_l2_icon','home_l2_title','home_l2_text',
  'home_l3_icon','home_l3_title','home_l3_text',
  'home_l4_icon','home_l4_title','home_l4_text',
  'activities_hero_title','activities_hero_title_size','activities_hero_subtitle','activities_hero_subtitle_size',
  'contact_hero_title','contact_hero_title_size','contact_hero_subtitle','contact_hero_subtitle_size',
  'notify_ntfy_topic','notify_email',
  'header_logo_text','footer_title','footer_subtitle','footer_email',
  'nokdim_hero_title','nokdim_hero_title_size','nokdim_hero_subtitle','nokdim_hero_cta',
  'nokdim_intro_text','nokdim_image_url','nokdim_image_pos_x','nokdim_image_pos_y',
  'register_terms_text',
]

function SizeInput({ value, onChange }) {
  const sizes = [{ l: 'S', v: 13 }, { l: 'M', v: 16 }, { l: 'L', v: 20 }, { l: 'XL', v: 28 }, { l: '2XL', v: 36 }]
  const num = Number(value) || 16
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {sizes.map(s => (
        <button key={s.v} type="button" onClick={() => onChange(String(s.v))} style={{
          background: num === s.v ? '#1a472a' : '#f0f0f0', color: num === s.v ? '#fff' : '#555',
          border: 'none', borderRadius: '5px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700',
        }}>{s.l}</button>
      ))}
      <input type="number" min="10" max="72" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '52px', padding: '4px 6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }} />
      <span style={{ fontSize: '11px', color: '#aaa' }}>px</span>
    </div>
  )
}

function Field({ label, value, onChange, size, textarea, emoji }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={lbl}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        : <input value={value} onChange={e => onChange(e.target.value)} style={emoji ? { ...inp, fontSize: '22px', width: '70px' } : inp} />
      }
      {size !== undefined && (
        <div style={{ marginTop: '6px' }}>
          <SizeInput value={size.value} onChange={size.onChange} />
        </div>
      )}
    </div>
  )
}

function ImagePositionPicker({ imageUrl, x, y, onChange }) {
  if (!imageUrl) return null
  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const py = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    onChange(Math.max(0, Math.min(100, px)), Math.max(0, Math.min(100, py)))
  }
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={lbl}>מיקום התמונה — לחץ במקום שברצונך למרכז</div>
      <div onClick={handleClick} style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', cursor: 'crosshair', border: '1px solid #e0e0e0' }}>
        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${x}% ${y}%`, display: 'block' }} />
        <div style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
          width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #fff',
          background: '#1a472a', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)', pointerEvents: 'none',
        }} />
      </div>
      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', textAlign: 'center' }}>X: {x}% · Y: {y}%</div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '14px', padding: '20px', marginBottom: '18px' }}>
      <div style={{ fontWeight: '800', fontSize: '14px', color: '#1a472a', marginBottom: '16px' }}>{title}</div>
      {children}
    </div>
  )
}

function FooterItemsEditor() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ icon: '📌', label: '', url: '' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('footer_items').select('*').order('sort_order')
    if (data) setItems(data)
  }

  function startNew() { setForm({ icon: '📌', label: '', url: '' }); setEditingId('new') }
  function startEdit(item) { setForm({ icon: item.icon || '📌', label: item.label || '', url: item.url || '' }); setEditingId(item.id) }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.label.trim()) return
    setSaving(true)
    if (editingId === 'new') {
      const maxOrder = items.length ? Math.max(...items.map(i => i.sort_order)) : 0
      await supabase.from('footer_items').insert({ icon: form.icon, label: form.label.trim(), url: form.url.trim() || null, sort_order: maxOrder + 1 })
    } else {
      await supabase.from('footer_items').update({ icon: form.icon, label: form.label.trim(), url: form.url.trim() || null }).eq('id', editingId)
    }
    await fetchItems(); setEditingId(null); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק?')) return
    await supabase.from('footer_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function move(id, dir) {
    const idx = items.findIndex(i => i.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= items.length) return
    const a = items[idx], b = items[swapIdx]
    await Promise.all([
      supabase.from('footer_items').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('footer_items').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await fetchItems()
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '14px', padding: '20px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontWeight: '800', fontSize: '14px', color: '#1a472a' }}>שורות מידע בפוטר (טלפון, מייל, כתובת...)</div>
        <button type="button" onClick={startNew} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>+ הוסף</button>
      </div>

      {editingId && (
        <form onSubmit={handleSave} style={{ background: '#f8faf8', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '10px', alignItems: 'end' }}>
            <div><label style={lbl}>אייקון</label><input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ ...inp, width: '60px', fontSize: '20px' }} /></div>
            <div><label style={lbl}>טקסט *</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="050-0000000" style={inp} required /></div>
            <div><label style={lbl}>קישור (אופציונלי)</label><input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https:// או tel: או mailto:" style={inp} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={() => setEditingId(null)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '7px', padding: '6px 16px', cursor: 'pointer', fontSize: '13px' }}>ביטול</button>
            <button type="submit" disabled={saving} style={{ background: '#1a472a', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>{saving ? 'שומר...' : 'שמור'}</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fafafa', borderRadius: '8px', padding: '10px 12px', border: '1px solid #eee' }}>
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#222' }}>{item.label}</div>
              {item.url && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>{item.url}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button type="button" onClick={() => move(item.id, -1)} disabled={i === 0} style={{ background: '#eee', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
              <button type="button" onClick={() => move(item.id, 1)} disabled={i === items.length - 1} style={{ background: '#eee', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px', opacity: i === items.length - 1 ? 0.3 : 1 }}>▼</button>
            </div>
            <button type="button" onClick={() => startEdit(item)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>עריכה</button>
            <button type="button" onClick={() => handleDelete(item.id)} style={{ background: '#fff', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>מחיקה</button>
          </div>
        ))}
        {items.length === 0 && <div style={{ color: '#ccc', textAlign: 'center', padding: '16px', fontSize: '13px' }}>אין שורות עדיין</div>}
      </div>
    </div>
  )
}

const TABS = [
  { key: 'home', label: '🏠 דף בית' },
  { key: 'nokdim', label: '🎾 נוקדים' },
  { key: 'pages', label: '📄 דפים נוספים' },
  { key: 'layout', label: '🔤 הדר ופוטר' },
  { key: 'notify', label: '🔔 התראות' },
]

export default function AdminSettings() {
  const [settings, setSettings] = useState({})
  const [resendKey, setResendKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedKey, setSavedKey] = useState(false)
  const [tab, setTab] = useState('home')

  useEffect(() => {
    async function load() {
      const [{ data: pub }, { data: sec }] = await Promise.all([
        supabase.from('site_settings').select('key, value').in('key', ALL_KEYS),
        supabase.from('admin_secrets').select('key, value').eq('key', 'resend_api_key'),
      ])
      const map = {}
      pub?.forEach(r => { map[r.key] = r.value ?? '' })
      setSettings(map)
      if (sec?.[0]) setResendKey(sec[0].value || '')
      setLoading(false)
    }
    load()
  }, [])

  const g = k => settings[k] ?? ''
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  async function saveSettings(e) {
    e.preventDefault()
    setSaving(true)
    await Promise.all(Object.entries(settings).map(([key, value]) =>
      supabase.from('site_settings').upsert({ key, value: value ?? '' })
    ))
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function saveResendKey(e) {
    e.preventDefault()
    setSavingKey(true)
    await supabase.from('admin_secrets').upsert({ key: 'resend_api_key', value: resendKey.trim() })
    setSavingKey(false); setSavedKey(true); setTimeout(() => setSavedKey(false), 2500)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '800', color: '#111' }}>הגדרות אתר</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', borderBottom: '2px solid #eee', paddingBottom: '0' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #1a472a' : '2px solid transparent',
            marginBottom: '-2px', padding: '8px 16px', cursor: 'pointer', fontWeight: tab === t.key ? '700' : '400',
            color: tab === t.key ? '#1a472a' : '#666', fontSize: '14px',
          }}>{t.label}</button>
        ))}
      </div>

      <form onSubmit={saveSettings}>
        {tab === 'home' && <>
          <Card title="אזור גיבור (Hero)">
            <Field label="כותרת ראשית" value={g('home_hero_title')} onChange={v => set('home_hero_title', v)}
              size={{ value: g('home_hero_title_size') || '36', onChange: v => set('home_hero_title_size', v) }} />
            <Field label="כותרת משנה" value={g('home_hero_subtitle')} onChange={v => set('home_hero_subtitle', v)} textarea
              size={{ value: g('home_hero_subtitle_size') || '18', onChange: v => set('home_hero_subtitle_size', v) }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="כפתור ראשי" value={g('home_hero_cta1')} onChange={v => set('home_hero_cta1', v)} />
              <Field label="כפתור משני" value={g('home_hero_cta2')} onChange={v => set('home_hero_cta2', v)} />
            </div>
          </Card>

          <Card title="כרטיסי יתרונות (4 כרטיסים)">
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 2fr', gap: '10px', marginBottom: '14px', paddingBottom: '14px', borderBottom: i < 4 ? '1px solid #f0f0f0' : 'none', alignItems: 'start' }}>
                <Field label="אייקון" value={g(`home_f${i}_icon`)} onChange={v => set(`home_f${i}_icon`, v)} emoji />
                <Field label="כותרת" value={g(`home_f${i}_title`)} onChange={v => set(`home_f${i}_title`, v)} />
                <Field label="תיאור" value={g(`home_f${i}_text`)} onChange={v => set(`home_f${i}_text`, v)} textarea />
              </div>
            ))}
          </Card>

          <Card title="אזור מיקומים">
            <Field label="כותרת הסקשן" value={g('home_locations_title')} onChange={v => set('home_locations_title', v)} />
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 2fr', gap: '10px', marginBottom: '14px', paddingBottom: '14px', borderBottom: i < 4 ? '1px solid #f0f0f0' : 'none', alignItems: 'start' }}>
                <Field label="אייקון" value={g(`home_l${i}_icon`)} onChange={v => set(`home_l${i}_icon`, v)} emoji />
                <Field label="שם מיקום" value={g(`home_l${i}_title`)} onChange={v => set(`home_l${i}_title`, v)} />
                <Field label="תיאור" value={g(`home_l${i}_text`)} onChange={v => set(`home_l${i}_text`, v)} textarea />
              </div>
            ))}
          </Card>

          <Card title="חלק תחתון (CTA)">
            <Field label="כותרת" value={g('home_cta_title')} onChange={v => set('home_cta_title', v)}
              size={{ value: g('home_cta_title_size') || '24', onChange: v => set('home_cta_title_size', v) }} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <Field label="משפט" value={g('home_cta_subtitle')} onChange={v => set('home_cta_subtitle', v)} />
              <Field label="טקסט כפתור" value={g('home_cta_button')} onChange={v => set('home_cta_button', v)} />
            </div>
          </Card>
        </>}

        {tab === 'nokdim' && <>
          <Card title="עמוד נחיתה — נוקדים">
            <Field label="כותרת ראשית" value={g('nokdim_hero_title')} onChange={v => set('nokdim_hero_title', v)}
              size={{ value: g('nokdim_hero_title_size') || '36', onChange: v => set('nokdim_hero_title_size', v) }} />
            <Field label="כותרת משנה" value={g('nokdim_hero_subtitle')} onChange={v => set('nokdim_hero_subtitle', v)} textarea />
            <Field label="טקסט כפתור הרשמה" value={g('nokdim_hero_cta')} onChange={v => set('nokdim_hero_cta', v)} />
          </Card>

          <Card title="תמונת רקע להירו">
            <ImageUpload value={g('nokdim_image_url')} onChange={v => set('nokdim_image_url', v)} folder="nokdim" />
            <ImagePositionPicker
              imageUrl={g('nokdim_image_url')}
              x={Number(g('nokdim_image_pos_x')) || 50}
              y={Number(g('nokdim_image_pos_y')) || 50}
              onChange={(x, y) => { set('nokdim_image_pos_x', String(x)); set('nokdim_image_pos_y', String(y)) }}
            />
          </Card>

          <Card title="תוכן — על הפעילות בנוקדים">
            <Field label="תיאור" value={g('nokdim_intro_text')} onChange={v => set('nokdim_intro_text', v)} textarea />
          </Card>

          <div style={{ background: '#f0f7f0', border: '1px solid #c5ddc5', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#2d5a3d', lineHeight: 1.7 }}>
            <b>המשבצות</b> (ימים, שעה, מחיר, קבוצת גיל) נשלפות אוטומטית מהחוגים שמוגדרים בטאב "חוגים" ומקושרים למיקום "נוקדים".
          </div>
        </>}

        {tab === 'pages' && <>
          <Card title="דף פעילויות — כותרת עליונה">
            <Field label="כותרת ראשית" value={g('activities_hero_title')} onChange={v => set('activities_hero_title', v)}
              size={{ value: g('activities_hero_title_size') || '30', onChange: v => set('activities_hero_title_size', v) }} />
            <Field label="כותרת משנה" value={g('activities_hero_subtitle')} onChange={v => set('activities_hero_subtitle', v)} textarea
              size={{ value: g('activities_hero_subtitle_size') || '16', onChange: v => set('activities_hero_subtitle_size', v) }} />
          </Card>

          <Card title="הרשמה — תנאי הרשמה">
            <Field label="נוסח האישור (מוצג עם תיבת סימון בטופס ההרשמה)" value={g('register_terms_text')} onChange={v => set('register_terms_text', v)} textarea />
          </Card>

          <Card title="דף יצירת קשר — כותרת עליונה">
            <Field label="כותרת ראשית" value={g('contact_hero_title')} onChange={v => set('contact_hero_title', v)}
              size={{ value: g('contact_hero_title_size') || '28', onChange: v => set('contact_hero_title_size', v) }} />
            <Field label="כותרת משנה" value={g('contact_hero_subtitle')} onChange={v => set('contact_hero_subtitle', v)} textarea
              size={{ value: g('contact_hero_subtitle_size') || '15', onChange: v => set('contact_hero_subtitle_size', v) }} />
          </Card>
        </>}

        {tab === 'layout' && <>
          <Card title="הדר (Header) — שם האתר בסרגל הניווט">
            <Field label="שם האתר" value={g('header_logo_text')} onChange={v => set('header_logo_text', v)} />
          </Card>
          <Card title="פוטר (Footer) — כותרת ותיאור">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="כותרת" value={g('footer_title')} onChange={v => set('footer_title', v)} />
              <Field label="תיאור" value={g('footer_subtitle')} onChange={v => set('footer_subtitle', v)} />
            </div>
          </Card>
          <FooterItemsEditor />
        </>}

        {tab === 'notify' && <>
          <Card title="📱 התראות Push לטלפון (ntfy)">
            <Field label="שם נושא (topic)" value={g('notify_ntfy_topic')} onChange={v => set('notify_ntfy_topic', v)} />
            <div style={{ background: '#f0f7f0', border: '1px solid #c5ddc5', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#2d5a3d', lineHeight: 1.7, marginTop: '6px' }}>
              <b>הגדרה:</b> הורד אפליקציית ntfy → Subscribe לנושא שהכנסת → קבל התראה על כל פנייה
            </div>
          </Card>

          <Card title="📧 מייל (Resend)">
            <Field label="מייל לקבלת הודעות" value={g('notify_email')} onChange={v => set('notify_email', v)} />
          </Card>
        </>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button type="submit" disabled={saving} style={{
            background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '11px 32px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', opacity: saving ? 0.6 : 1,
          }}>
            {saved ? '✓ נשמר!' : saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
      </form>

      {tab === 'notify' && (
        <form onSubmit={saveResendKey}>
          <Card title="🔑 מפתח Resend API">
            <label style={lbl}>API Key</label>
            <input type="password" value={resendKey} onChange={e => setResendKey(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxx" style={inp} autoComplete="new-password" />
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#7c5a00', lineHeight: 1.7, marginTop: '8px' }}>
              resend.com → הירשם חינם → API Keys → Create → הדבק כאן
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="submit" disabled={savingKey} style={{ background: '#b45309', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 22px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', opacity: savingKey ? 0.6 : 1 }}>
                {savedKey ? '✓ נשמר!' : savingKey ? 'שומר...' : 'שמור מפתח'}
              </button>
            </div>
          </Card>
        </form>
      )}
    </div>
  )
}
