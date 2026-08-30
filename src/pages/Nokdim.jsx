import { Link } from 'react-router-dom'
import LocationPage from './LocationPage'

const defaults = {
  nokdim_hero_subtitle: 'מיקום חדש שלנו — שני מגרשי טניס, ופעילות חדשה שיוצאת לדרך בקרוב',
  nokdim_intro_text: 'אנחנו שמחים לפתוח פעילות חדשה בנוקדים!\nשני מגרשי טניס חדשים, באווירה מקצועית וקהילתית.\nהחוג מתאים לכל הגילאים והרמות — ממתחילים ועד מתקדמים.',
}

export default function Nokdim() {
  return (
    <>
      <LocationPage prefix="nokdim" locationName="נוקדים" defaults={defaults} />
      <section style={{ maxWidth: '760px', margin: '-36px auto 56px', padding: '0 20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)', borderRadius: '18px',
          padding: '28px', textAlign: 'center', color: 'white', boxShadow: '0 4px 16px rgba(26,71,42,0.2)',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '19px', fontWeight: '800' }}>רוצים להתנסות לפני שנרשמים?</h3>
          <p style={{ margin: '0 0 18px', opacity: 0.9, fontSize: '14px' }}>שיעורי ניסיון בנוקדים — חמישי, 3.9 | שני, 7.9</p>
          <Link to="/trial-lesson" style={{
            display: 'inline-block', background: 'white', color: '#1a472a', textDecoration: 'none',
            borderRadius: '30px', padding: '12px 36px', fontWeight: '800', fontSize: '15px',
          }}>הרשמה לשיעור ניסיון</Link>
        </div>
      </section>
    </>
  )
}
