import { Link } from 'react-router-dom'

const features = [
  { icon: '🏆', title: 'אימון מקצועי', text: 'תוכניות אימון מותאמות אישית לכל שחקן, מתחילים ועד מתקדמים' },
  { icon: '👥', title: 'לכל הגילאים', text: 'ילדים, נוער ומבוגרים — קבוצות לפי גיל ורמה' },
  { icon: '📍', title: 'מספר מיקומים', text: 'פעילות בציפורי, גבעת זאב ובתי ספר באזור ירושלים' },
  { icon: '🎓', title: 'מאמן מוסמך', text: 'הכשרה מקצועית עם דגש על פיתוח גופני, תיאום ושמחת המשחק' },
]

const locations = [
  {
    icon: '🎾',
    title: 'ציפורי',
    text: 'שני מגרשי טניס בסמוך להר הרצל — אווירה מקצועית וספורטיבית. חוגים בימי שלישי וחמישי, קבוצות לפי גיל ורמה.',
  },
  {
    icon: '📍',
    title: 'גבעת זאב',
    text: 'פעילות טניס לתושבי האזור — קבוצות לילדים ולנוער, מתחילים ומתקדמים, ואימונים פרטיים.',
  },
  {
    icon: '🏫',
    title: 'בתי ספר בירושלים',
    text: 'תוכניות ניידות עם ציוד מותאם — רשתות, כדורים ומחבטים. מתאים לכל מרחב. תוכנית רב-מפגשים לפיתוח מיומנויות מוטוריות ועבודת צוות.',
  },
  {
    icon: '🏕️',
    title: 'מחנות ותחרויות',
    text: 'מחנות אימון עצימים ותחרויות לשחקנים בכל הרמות. הזדמנות להתפתח, להתחרות וליהנות.',
  },
]

export default function Home() {
  return (
    <main style={{ direction: 'rtl', flex: 1 }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '80px 24px 70px',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '12px' }}>🎾</div>
        <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          אקדמיית אילן טניס
        </h1>
        <p style={{ fontSize: '18px', opacity: 0.85, marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          אימון טניס מקצועי לכל הגילאים והרמות — בציפורי, גבעת זאב ובתי ספר באזור ירושלים
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/activities" style={{
            background: 'white', color: '#1a472a',
            padding: '13px 32px', borderRadius: '30px',
            textDecoration: 'none', fontWeight: '700', fontSize: '16px',
          }}>
            הפעילויות שלנו
          </Link>
          <Link to="/register" style={{
            background: 'transparent', color: 'white',
            border: '2px solid rgba(255,255,255,0.6)',
            padding: '13px 32px', borderRadius: '30px',
            textDecoration: 'none', fontWeight: '700', fontSize: '16px',
          }}>
            הרשמה לחוג
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: '960px', margin: '60px auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: 'white', borderRadius: '16px', padding: '28px 20px',
              textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: '1px solid #f0f0f0',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>{f.icon}</div>
              <h3 style={{ margin: '0 0 8px', color: '#1a472a', fontSize: '16px', fontWeight: '700' }}>{f.title}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '13px', lineHeight: 1.6 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Locations */}
      <section style={{ background: '#f3f6f3', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#1a472a', fontSize: '26px', fontWeight: '800', marginBottom: '36px' }}>
            היכן אנחנו פועלים
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {locations.map(l => (
              <div key={l.title} style={{
                background: 'white', borderRadius: '16px', padding: '28px 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>{l.icon}</div>
                <h3 style={{ margin: '0 0 10px', color: '#1a472a', fontSize: '17px', fontWeight: '700' }}>{l.title}</h3>
                <p style={{ margin: 0, color: '#555', fontSize: '14px', lineHeight: 1.7 }}>{l.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ color: '#1a472a', fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>מוכנים להתחיל?</h2>
        <p style={{ color: '#666', marginBottom: '28px', fontSize: '15px' }}>הצטרפו אלינו — בחרו חוג והירשמו עוד היום</p>
        <Link to="/activities" style={{
          background: '#1a472a', color: 'white',
          padding: '14px 40px', borderRadius: '30px',
          textDecoration: 'none', fontWeight: '700', fontSize: '16px',
          boxShadow: '0 4px 16px rgba(26,71,42,0.25)',
        }}>
          לכל הפעילויות
        </Link>
      </section>
    </main>
  )
}
