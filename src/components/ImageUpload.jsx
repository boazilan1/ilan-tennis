import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ImageUpload({ value, onChange, folder = 'general' }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  async function uploadFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('יש לבחור קובץ תמונה'); return }
    if (file.size > 5 * 1024 * 1024) { setError('גודל מקסימלי: 5MB'); return }
    setError('')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (upErr) { setError('שגיאה בהעלאה, נסה שוב'); setUploading(false); return }
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function onInputChange(e) {
    const file = e.target.files[0]
    if (file) uploadFile(file)
  }

  function handleRemove() {
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          <img src={value} alt="" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #eee', display: 'block' }} />
          <button type="button" onClick={handleRemove} style={{
            position: 'absolute', top: '8px', left: '8px',
            background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px',
          }}>✕ הסר</button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#1a472a' : '#ccc'}`,
            borderRadius: '12px',
            background: dragging ? '#f0f7f0' : '#fafafa',
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {uploading ? (
            <div style={{ color: '#888', fontSize: '14px' }}>מעלה תמונה...</div>
          ) : (
            <>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🖼️</div>
              <div style={{ fontWeight: '700', color: '#555', fontSize: '14px', marginBottom: '4px' }}>
                גרור תמונה לכאן
              </div>
              <div style={{ color: '#aaa', fontSize: '13px' }}>או לחץ לבחירת קובץ</div>
              <div style={{ color: '#ccc', fontSize: '11px', marginTop: '6px' }}>JPG, PNG, WEBP · עד 5MB</div>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onInputChange} style={{ display: 'none' }} />
      {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: '6px 0 0' }}>{error}</p>}
    </div>
  )
}
