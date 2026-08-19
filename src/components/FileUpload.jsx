import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

export default function FileUpload({ value, onChange, folder = 'general', accept = '.pdf', label = 'קובץ PDF', maxSizeMB = 10 }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  async function uploadFile(file) {
    if (!file) return
    if (file.size > maxSizeMB * 1024 * 1024) { setError(`גודל מקסימלי: ${maxSizeMB}MB`); return }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8faf8', border: '1px solid #e0e8e0', borderRadius: '10px', padding: '12px 14px' }}>
          <Icon name="check" size={18} color="#1a472a" />
          <a href={value} target="_blank" rel="noreferrer" style={{ flex: 1, color: '#1a472a', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
            צפייה בקובץ שהועלה
          </a>
          <button type="button" onClick={handleRemove} style={{
            background: 'none', border: '1px solid #ddd', color: '#888',
            borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px',
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
            padding: '24px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {uploading ? (
            <div style={{ color: '#888', fontSize: '14px' }}>מעלה קובץ...</div>
          ) : (
            <>
              <div style={{ fontWeight: '700', color: '#555', fontSize: '14px', marginBottom: '4px' }}>
                גרור {label} לכאן
              </div>
              <div style={{ color: '#aaa', fontSize: '13px' }}>או לחץ לבחירת קובץ</div>
              <div style={{ color: '#ccc', fontSize: '11px', marginTop: '6px' }}>עד {maxSizeMB}MB</div>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} onChange={onInputChange} style={{ display: 'none' }} />
      {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: '6px 0 0' }}>{error}</p>}
    </div>
  )
}
