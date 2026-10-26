import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { formatTimeRange } from '../lib/timeRange'

function formatDateHe(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' })
}

const cardStyle = { background: '#fff', borderRadius: '12px', padding: '36px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }
const pageStyle = { direction: 'rtl', flex: 1, maxWidth: '500px', margin: '50px auto', padding: '0 20px', width: '100%', boxSizing: 'border-box' }

// Public page behind the payment link the admin sends to someone he invited
// to a private lesson. No login: the booking id in the URL is the key.
export default function PayInvite() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const justPaid = searchParams.get('paid') === '1'

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_invite_booking', { p_id: id })
      setBooking(data || null)
      setLoading(false)
    }
    load()
  }, [id])

  async function handlePay() {
    setError('')
    setPaying(true)
    try {
      const res = await fetch('/api/private-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'privateBooking', id, source: 'invite' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'payment setup failed')
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      setError('לא הצלחנו לפתוח את דף התשלום. נסו שוב, ואם זה חוזר — פנו אלינו.')
      setPaying(false)
    }
  }

  if (loading) {
    return <main style={{ ...pageStyle, textAlign: 'center' }}><p style={{ color: '#888' }}>טוען...</p></main>
  }

  if (!booking) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#c00', marginBottom: '16px' }}>הקישור לא תקין, או שההזמנה בוטלה.</p>
          <Link to="/" style={{ color: '#1a472a' }}>לעמוד הבית</Link>
        </div>
      </main>
    )
  }

  const when = `${formatDateHe(booking.slot_date)} בשעה ${formatTimeRange(booking.time, booking.duration_minutes)}`

  if (booking.status === 'active' || justPaid) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ marginBottom: '14px' }}><Icon name="check" size={44} color="#1a472a" /></div>
          <h2 style={{ color: '#1a472a', marginBottom: '8px' }}>{booking.status === 'active' ? 'האימון שולם ✓' : 'התשלום התקבל, תודה!'}</h2>
          <p style={{ color: '#555', margin: 0 }}>
            מחכים לך ב{when}{booking.location ? ` · ${booking.location}` : ''}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ color: '#1a472a', fontSize: '22px', margin: '0 0 6px' }}>הזמנה לאימון פרטי</h1>
        <p style={{ color: '#888', fontSize: '14px', margin: '0 0 22px' }}>שלום {booking.name}, הוזמנת לאימון טניס עם בועז</p>

        <div style={{ background: '#ecfeff', borderRadius: '10px', padding: '16px', marginBottom: '22px', textAlign: 'right' }}>
          <p style={{ margin: '3px 0', fontSize: '15px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="calendar" size={16} color="#0e7490" />{when}
          </p>
          {booking.location && (
            <p style={{ margin: '3px 0', fontSize: '15px', color: '#333' }}>📍 {booking.location}</p>
          )}
          <p style={{ margin: '3px 0', fontSize: '15px', color: '#333' }}>⏱ {booking.duration_minutes} דקות</p>
        </div>

        {error && <p style={{ color: '#c00', background: '#fff0f0', padding: '10px', borderRadius: '8px', margin: '0 0 16px', fontSize: '14px' }}>{error}</p>}

        <button onClick={handlePay} disabled={paying} style={{
          width: '100%', background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px',
          fontSize: '17px', fontWeight: '700', cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.6 : 1,
        }}>{paying ? 'מעביר לתשלום...' : `לתשלום — ₪${booking.price}`}</button>
      </div>
    </main>
  )
}
