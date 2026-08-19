import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SectionCurve from '../components/SectionCurve'
import Icon from '../components/Icon'

const DEFAULTS = {
  home_hero_title: 'אילן טניס', home_hero_title_size: '36',
  home_hero_subtitle: 'אימון טניס מקצועי לכל הגילאים והרמות — בציפורי, גבעת זאב ובתי ספר באזור ירושלים', home_hero_subtitle_size: '18',
  home_hero_cta1: 'הפעילויות שלנו', home_hero_cta2: 'הרשמה לחוג',
  home_cta_title: 'מוכנים להתחיל?', home_cta_title_size: '24',
  home_cta_subtitle: 'יש לכם שאלות? נשמח לשמוע מכם',
  home_cta_button: 'צרו קשר',
  home_hero_image_url: '', home_hero_image_pos_x: '50', home_hero_image_pos_y: '50', home_hero_height: '420',
  home_about_title: 'קצת עלינו', home_about_text: '',
  home_vision_title: 'אילן טניס',
  home_vision_text: 'אילן טניס הוקם בשנת 2023 מתוך רצון ליצור פעילות טניס מקצועית, איכותית ומהנה, שמחברת בין משחק, תנועה, התפתחות אישית וקהילה.\nמאז הקמתו פעל אילן טניס ביישובים ובמסגרות שונות, ביניהם אפרת, מרכז ציפורי וגבעת זאב, וכן בבתי ספר ובמסגרות חינוכיות, בהם בית הספר הניסויי, בית הספר השלום ובית הספר באבו גוש.\nאנחנו מאמינים שטניס הוא הרבה מעבר ללימוד של משחק. הוא שילוב של משחק, תנועה ואתגר, שמאפשר לילדים ולבני נוער ליהנות, להתפתח, לפתח ביטחון עצמי, להתמודד עם אתגרים ולצמוח מהם.\nלצד ההנאה והחוויה החברתית, אנחנו מאמינים שחשוב לפגוש גם אתגר ותחרות כחלק מהדרך. במהלך האימונים והפעילות במגרש ניצור הזדמנויות להתמודד, להתחרות, להשתפר ולגלות את היכולת האישית של כל אחד.\nמי שירצה לקחת את הטניס צעד נוסף קדימה, יוכל בהמשך להשתתף גם בתחרויות וטורנירים מחוץ למסגרת. ובמקביל, גם מי שבוחר שלא להתחרות בחוץ יוכל למצוא בתוך הפעילות אתגר, משחק תחרותי והזדמנויות להתקדם ולהשתפר.',
  home_vision_belief_title: 'במה אנחנו מאמינים?',
  home_vision_belief_text: 'אנחנו מאמינים שמשחק ותנועה הם דרך להשתחרר, ליהנות, לפגוש אתגרים, לצמוח מהם ולהתחזק — ביחד, על המגרש ומחוצה לו.',
}

export default function Home() {
  const [s, setS] = useState(DEFAULTS)
  const [aboutOpen, setAboutOpen] = useState(false)

  useEffect(() => {
    supabase.from('site_settings').select('key, value').then(({ data }) => {
      if (data) {
        const map = {}
        data.forEach(r => { if (r.value) map[r.key] = r.value })
        setS(prev => ({ ...prev, ...map }))
      }
    })
  }, [])

  const g = k => s[k] || DEFAULTS[k] || ''
  const gs = k => Number(g(k)) || Number(DEFAULTS[k]) || 14

  return (
    <main style={{ direction: 'rtl', flex: 1 }}>
      {/* Hero */}
      <section style={{
        background: g('home_hero_image_url')
          ? `linear-gradient(180deg, rgba(15,45,26,0.55) 0%, rgba(15,45,26,0.72) 100%), url(${g('home_hero_image_url')}) ${gs('home_hero_image_pos_x')}% ${gs('home_hero_image_pos_y')}% / cover no-repeat`
          : 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
        color: 'white', textAlign: 'center', padding: '24px', position: 'relative',
        minHeight: gs('home_hero_height') + 'px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {!g('home_hero_image_url') && (
          <div style={{ marginBottom: '16px' }}><Icon name="ball" size={52} color="rgba(255,255,255,0.9)" /></div>
        )}
        <h1 style={{ fontSize: gs('home_hero_title_size') + 'px', fontWeight: '800', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          {g('home_hero_title')}
        </h1>
        <p style={{ fontSize: gs('home_hero_subtitle_size') + 'px', opacity: 0.85, margin: '0 auto 36px', maxWidth: '480px', lineHeight: 1.6 }}>
          {g('home_hero_subtitle')}
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={{ background: 'white', color: '#1a472a', padding: '13px 32px', borderRadius: '30px', textDecoration: 'none', fontWeight: '700', fontSize: '16px' }}>
            {g('home_hero_cta1')}
          </Link>
          <Link to="/register" style={{ background: 'transparent', color: 'white', border: '2px solid rgba(255,255,255,0.6)', padding: '13px 32px', borderRadius: '30px', textDecoration: 'none', fontWeight: '700', fontSize: '16px' }}>
            {g('home_hero_cta2')}
          </Link>
        </div>
        <SectionCurve fill="#f5f5f5" />
      </section>

      {/* Vision */}
      <section style={{ maxWidth: '760px', margin: '60px auto 0', padding: '0 20px' }}>
        <div style={{ background: 'white', borderRadius: '18px', padding: '36px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderTop: '4px solid var(--sand)' }}>
          {g('home_vision_title') && (
            <h2 style={{ color: '#1a472a', fontSize: '24px', fontWeight: '800', margin: '0 0 18px' }}>{g('home_vision_title')}</h2>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {g('home_vision_text').split('\n').filter(Boolean).map((p, i) => (
              <p key={i} style={{ margin: 0, fontSize: '15px', color: '#444', lineHeight: 1.8, paddingRight: '14px', borderRight: '3px solid var(--sand)' }}>{p}</p>
            ))}
          </div>
        </div>

        {g('home_vision_belief_text') && (
          <div style={{
            marginTop: '20px', background: 'var(--sand-light)', border: '1px solid var(--sand)',
            borderRadius: '18px', padding: '32px 28px', textAlign: 'center',
          }}>
            {g('home_vision_belief_title') && (
              <h3 style={{ color: '#1a472a', fontSize: '15px', fontWeight: '800', margin: '0 0 12px', letterSpacing: '0.3px' }}>{g('home_vision_belief_title')}</h3>
            )}
            <p style={{ margin: 0, color: '#1a472a', fontSize: '19px', fontWeight: '700', lineHeight: 1.6, maxWidth: '560px', marginInline: 'auto' }}>
              {g('home_vision_belief_text')}
            </p>
          </div>
        )}
      </section>

      {/* About */}
      {g('home_about_text') && (() => {
        const paragraphs = g('home_about_text').split('\n').filter(Boolean)
        return (
          <section style={{ maxWidth: '700px', margin: '60px auto 0', padding: '0 20px' }}>
            <div
              onClick={() => setAboutOpen(o => !o)}
              style={{ background: 'white', borderRadius: '18px', padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderTop: '4px solid var(--sand)', cursor: 'pointer' }}
            >
              {g('home_about_title') && (
                <h2 style={{ color: '#1a472a', fontSize: '22px', fontWeight: '800', margin: '0 0 16px' }}>{g('home_about_title')}</h2>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(aboutOpen ? paragraphs : paragraphs.slice(0, 1)).map((p, i) => (
                  <p key={i} style={{ margin: 0, fontSize: '15px', color: '#444', lineHeight: 1.8 }}>{p}</p>
                ))}
              </div>
              <div style={{ marginTop: '16px', color: '#1a472a', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {aboutOpen ? 'הצג פחות' : 'קרא עוד'}
                <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: aboutOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </div>
            </div>
          </section>
        )
      })()}

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', background: 'var(--sand-light)', border: '1px solid var(--sand)', borderRadius: '20px', padding: '40px 30px' }}>
          <h2 style={{ color: '#1a472a', fontSize: gs('home_cta_title_size') + 'px', fontWeight: '800', marginBottom: '12px' }}>{g('home_cta_title')}</h2>
          <p style={{ color: '#666', marginBottom: '28px', fontSize: '15px' }}>{g('home_cta_subtitle')}</p>
          <Link to="/contact" style={{ background: '#1a472a', color: 'white', padding: '14px 40px', borderRadius: '30px', textDecoration: 'none', fontWeight: '700', fontSize: '16px', boxShadow: '0 4px 16px rgba(26,71,42,0.25)' }}>
            {g('home_cta_button')}
          </Link>
        </div>
      </section>
    </main>
  )
}
