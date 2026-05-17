import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}

const SECTIONS = [
  {
    id: 'tzipori',
    icon: '🎾',
    title: 'ציפורי',
    subtitle: 'מגרשי טניס בסמוך להר הרצל',
    color: '#1a472a',
    bg: '#f0f7f0',
    border: '#c5ddc5',
    paragraphs: [
      'שני מגרשי טניס המספקים אווירה מקצועית, ספורטיבית ומהנה.',
      'חוגים בימי שלישי וחמישי — קבוצות לפי גיל ורמה לילדים, נוער ומבוגרים, מתחילים ומתקדמים.',
      'אימונים פרטיים זמינים בתיאום אישי. השתתפות בתוכניות "עמית", MOVE ו-freefit.',
    ],
  },
  {
    id: 'givatzev',
    icon: '📍',
    title: 'גבעת זאב',
    subtitle: 'פעילות טניס לתושבי האזור',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
    paragraphs: [
      'קבוצות אימון לילדים ולנוער — מתחילים ומתקדמים.',
      'דגש על פיתוח גופני, תיאום תנועה, משמעת ספורטיבית ושמחת המשחק.',
      'אימונים פרטיים זמינים בתיאום.',
    ],
  },
  {
    id: 'schools',
    icon: '🏫',
    title: 'בתי ספר בירושלים',
    subtitle: 'תוכניות חינוכיות ניידות',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd9fe',
    paragraphs: [
      'ציוד נייד מלא — רשתות ניידות, כדורים ומחבטים — מתאים לכל מרחב פנוי.',
      'תוכניות מובנות רב-מפגשים או חצי-שנתיות לפיתוח מיומנויות מוטוריות, תיאום, עבודת צוות, ביטחון עצמי וערכי הוגנות.',
      'מתאים לכיתות א׳–י״ב, ניתן להתאים לכל רמת גיל.',
    ],
  },
  {
    id: 'camps',
    icon: '🏕️',
    title: 'מחנות אימון ותחרויות',
    subtitle: 'לשחקנים בכל הרמות',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    paragraphs: [
      'מחנות אימון עצימים לשיפור מהיר של רמת המשחק.',
      'תחרויות פנימיות ואזוריות — הזדמנות להתמודד, להתפתח וליהנות.',
      'פרטים על מחנות ותחרויות קרובות — צרו קשר.',
    ],
  },
]

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('activities').select('*').order('day_of_week').then(({ data }) => {
      if (data) setActivities(data)
      setLoading(false)
    })
  }, [])

  function handleEnroll(activity) {
    if (activity.payment_link) {
      window.open(activity.payment_link, '_blank')
    } else {
      if (!user) navigate('/login')
      else navigate(`/register?activity=${activity.id}`)
    }
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
        color: 'white', textAlign: 'center', padding: '52px 24px 44px',
      }}>
        <h1 style={{ fontSize: '30px', fontWeight: '800', margin: '0 0 10px', letterSpacing: '-0.5px' }}>הפעילויות שלנו</h1>
        <p style={{ opacity: 0.85, fontSize: '16px', margin: 0 }}>
          אימון טניס מקצועי בציפורי, גבעת זאב ובתי ספר באזור ירושלים
        </p>
      </div>

      {/* Location sections */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {SECTIONS.map(s => (
          <div key={s.id} style={{
            background: 'white', borderRadius: '18px', overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #eee',
          }}>
            <div style={{ background: s.bg, borderBottom: `1px solid ${s.border}`, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '32px' }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: '800', fontSize: '19px', color: s.color }}>{s.title}</div>
                <div style={{ fontSize: '13px', color: '#777', marginTop: '2px' }}>{s.subtitle}</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {s.paragraphs.map((p, i) => (
                <p key={i} style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: 1.75, paddingRight: '14px', borderRight: `3px solid ${s.border}` }}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Classes from DB */}
      <div style={{ background: 'white', borderTop: '1px solid #eee', padding: '48px 20px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={{ color: '#1a472a', fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>לוח החוגים</h2>
          <p style={{ color: '#888', marginBottom: '28px', fontSize: '14px' }}>בחרו חוג והירשמו</p>

          {loading ? (
            <p style={{ color: '#bbb', textAlign: 'center' }}>טוען חוגים...</p>
          ) : activities.length === 0 ? (
            <p style={{ color: '#bbb', textAlign: 'center' }}>אין חוגים זמינים כרגע</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
              {activities.map(a => (
                <div key={a.id} style={{
                  borderRadius: '16px', border: '1px solid #e8ece8',
                  padding: '22px', display: 'flex', flexDirection: 'column', gap: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ fontWeight: '800', fontSize: '17px', color: '#1a472a' }}>{a.name}</div>
                  {a.description && <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: 1.6 }}>{a.description}</p>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '14px', color: '#444' }}>
                    <span>📅 יום {DAYS_HE[a.day_of_week] || a.day_of_week}</span>
                    {a.time && <span>🕐 {a.time}</span>}
                    {a.price && <span>💰 ₪{a.price} לחודש</span>}
                    {a.max_students && <span>👥 עד {a.max_students} תלמידים</span>}
                  </div>
                  <button onClick={() => handleEnroll(a)} style={{
                    marginTop: 'auto', background: '#1a472a', color: '#fff',
                    border: 'none', borderRadius: '10px', padding: '11px 0',
                    fontSize: '15px', cursor: 'pointer', fontWeight: '700',
                  }}>
                    {a.payment_link ? 'להרשמה ותשלום' : 'הרשמה לחוג'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '36px', textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>רוצים לדעת עוד? צרו קשר</p>
            <a href="mailto:ilantennisacademy@gmail.com" style={{
              color: '#1a472a', fontWeight: '700', fontSize: '15px', textDecoration: 'none',
              border: '1px solid #c5ddc5', borderRadius: '10px', padding: '10px 24px', display: 'inline-block',
            }}>
              📧 ilantennisacademy@gmail.com
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
