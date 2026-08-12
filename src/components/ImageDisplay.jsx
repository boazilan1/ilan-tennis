// Controls for image display: fit mode + height, with live preview

const FIT_OPTIONS = [
  { value: 'cover',   label: 'חיתוך',      desc: 'ממלא את המסגרת, חותך עודפים' },
  { value: 'contain', label: 'כל התמונה',  desc: 'מציג הכל, עם רקע אם צריך' },
  { value: 'fill',    label: 'מתיחה',      desc: 'מתיח לגודל המסגרת' },
]

const HEIGHT_PRESETS = [
  { label: 'נמוך',   value: 160 },
  { label: 'בינוני', value: 260 },
  { label: 'גבוה',   value: 380 },
  { label: 'מלא',    value: 500 },
]

export function ImageControls({ imageUrl, fit = 'cover', height = 260, onFitChange, onHeightChange }) {
  if (!imageUrl) return null

  return (
    <div style={{ marginTop: '12px', background: '#f8faf8', border: '1px solid #e0e8e0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Fit selector */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>אופן תצוגה</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {FIT_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => onFitChange(opt.value)} title={opt.desc} style={{
              flex: 1, padding: '6px 4px', border: '2px solid', borderColor: fit === opt.value ? '#1a472a' : '#ddd',
              borderRadius: '8px', cursor: 'pointer', background: fit === opt.value ? '#f0f7f0' : '#fff',
              color: fit === opt.value ? '#1a472a' : '#555', fontWeight: fit === opt.value ? '700' : '400',
              fontSize: '12px',
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Height selector */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>גובה התמונה</div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {HEIGHT_PRESETS.map(p => (
            <button key={p.value} type="button" onClick={() => onHeightChange(p.value)} style={{
              padding: '5px 12px', border: '2px solid', borderColor: height === p.value ? '#1a472a' : '#ddd',
              borderRadius: '7px', cursor: 'pointer', background: height === p.value ? '#f0f7f0' : '#fff',
              color: height === p.value ? '#1a472a' : '#555', fontWeight: height === p.value ? '700' : '400', fontSize: '12px',
            }}>
              {p.label}
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="number" min="80" max="800" value={height} onChange={e => onHeightChange(Number(e.target.value))}
              style={{ width: '68px', padding: '5px 7px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '12px' }} />
            <span style={{ fontSize: '11px', color: '#aaa' }}>px</span>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>תצוגה מקדימה</div>
        <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e0e0e0', background: '#f0f0f0' }}>
          <img
            src={imageUrl}
            alt=""
            style={{ width: '100%', height: height + 'px', objectFit: fit, display: 'block' }}
          />
        </div>
        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', textAlign: 'center' }}>
          {height}px · {FIT_OPTIONS.find(o => o.value === fit)?.label}
        </div>
      </div>
    </div>
  )
}

export function imageStyle(fit = 'cover', height = 260) {
  return { width: '100%', height: height + 'px', objectFit: fit, display: 'block' }
}
