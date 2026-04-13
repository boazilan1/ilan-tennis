import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main style={{ direction: 'rtl', flex: 1 }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #1a472a, #2d5a27)',
        color: 'white',
        textAlign: 'center',
        padding: '80px 20px',
      }}>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🎾</div>
        <h1 style={{ fontSize: '42px', margin: '0 0 16px 0' }}>ברוכים הבאים לאילן טניס</h1>
        <p style={{ fontSize: '20px', opacity: 0.85, marginBottom: '32px' }}>
          אקדמיית טניס מקצועית לכל הגילאים והרמות
        </p>
        <Link to="/activities" style={{
          background: 'white',
          color: '#1a472a',
          padding: '14px 36px',
          borderRadius: '30px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '18px',
        }}>
          לפעילויות שלנו
        </Link>
      </section>

      {/* Cards */}
      <section style={{
        maxWidth: '900px',
        margin: '60px auto',
        padding: '0 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
      }}>
        {[
          { icon: '🏆', title: 'אימון מקצועי', text: 'תוכניות אימון מותאמות אישית לכל שחקן' },
          { icon: '👥', title: 'חוגים לכל הגילאים', text: 'ילדים, נוער ומבוגרים — כולם מוזמנים' },
          { icon: '📅', title: 'לוח זמנים גמיש', text: 'שיעורים לאורך כל השבוע בשעות נוחות' },
        ].map(card => (
          <div key={card.title} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>{card.icon}</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1a472a' }}>{card.title}</h3>
            <p style={{ margin: 0, color: '#555' }}>{card.text}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
