import { useRef, useState, useEffect } from 'react'

export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const hasInkRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    ctx.scale(ratio, ratio)
    ctx.strokeStyle = '#1a472a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function pointFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return { x: point.clientX - rect.left, y: point.clientY - rect.top }
  }

  function start(e) {
    e.preventDefault()
    drawingRef.current = true
    const { x, y } = pointFromEvent(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e) {
    if (!drawingRef.current) return
    e.preventDefault()
    const { x, y } = pointFromEvent(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasInkRef.current) { hasInkRef.current = true; setHasInk(true) }
  }

  function end() {
    if (!drawingRef.current) return
    drawingRef.current = false
    onChange(hasInkRef.current ? canvasRef.current.toDataURL('image/png') : '')
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInkRef.current = false
    setHasInk(false)
    onChange('')
  }

  return (
    <div>
      <div style={{ position: 'relative', border: '1px solid #ccc', borderRadius: '8px', background: '#fff' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '140px', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {!hasInk && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '13px', pointerEvents: 'none' }}>
            חתמו כאן באצבע או בעכבר
          </div>
        )}
      </div>
      <button type="button" onClick={clear} style={{
        marginTop: '6px', background: 'none', border: 'none', color: '#888',
        fontSize: '12px', cursor: 'pointer', textDecoration: 'underline',
      }}>נקה וחתום מחדש</button>
    </div>
  )
}
