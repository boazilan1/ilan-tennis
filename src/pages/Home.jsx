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
  home_cta_subtitle: 'הצטרפו אלינו — בחרו חוג והירשמו עוד היום',
  home_cta_button: 'לכל הפעילויות',
  home_locations_title: 'היכן אנחנו פועלים',
  home_f1_icon: 'trophy', home_f1_title: 'אימון מקצועי', home_f1_text: 'תוכניות אימון מותאמות אישית לכל שחקן, מתחילים ועד מתקדמים',
  home_f2_icon: 'users', home_f2_title: 'לכל הגילאים', home_f2_text: 'ילדים, נוער ומבוגרים — קבוצות לפי גיל ורמה',
  home_f3_icon: 'pin', home_f3_title: 'מספר מיקומים', home_f3_text: 'פעילות בציפורי, גבעת זאב, נוקדים ובתי ספר באזור ירושלים',
  home_l1_icon: 'ball', home_l1_title: 'ציפורי', home_l1_text: 'שני מגרשי טניס בסמוך להר הרצל — אווירה מקצועית וספורטיבית',
  home_l2_icon: 'pin', home_l2_title: 'גבעת זאב', home_l2_text: 'פעילות טניס לתושבי האזור — קבוצות לילדים ולנוער, מתחילים ומתקדמים',
  home_l3_icon: 'school', home_l3_title: 'בתי ספר בירושלים', home_l3_text: 'תוכניות ניידות עם ציוד מותאם — רשתות, כדורים ומחבטים',
  home_l4_icon: 'tent', home_l4_title: 'מחנות ותחרויות', home_l4_text: 'מחנות אימון עצימים ותחרויות לשחקנים בכל הרמות',
  home_hero_image_url: '', home_hero_image_pos_x: '50', home_hero_image_pos_y: '50', home_hero_height: '420',
  home_about_title: 'קצת עלינו', home_about_text: '',
}

const ICON_NAMES = new Set(['ball', 'trophy', 'users', 'pin', 'cap', 'school', 'tent', 'calendar', 'clock', 'tag', 'mail', 'check'])
function FeatureIcon({ value, size, color }) {
  return ICON_NAMES.has(value)
    ? <Icon name={value} size={size} color={color} />
    : <span style={{ fontSize: size }}>{value}</span>
}

export default function Home() {
  const [s, setS] = useState(DEFAULTS)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [programs, setPrograms] = useState([])
  const [openPrograms, setOpenPrograms] = useState([])

  useEffect(() => {
    supabase.from('site_settings').select('key, value').then(({ data }) => {
      if (data) {
        const map = {}
        data.forEach(r => { if (r.value) map[r.key] = r.value })
        setS(prev => ({ ...prev, ...map }))
      }
    })
    supabase.from('activity_sections').select('*').order('sort_order').then(({ data }) => {
      if (data) setPrograms(data.filter(p => p.title !== 'גבעת זאב'))
    })
  }, [])

  function toggleProgram(id) {
    setOpenPrograms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const g = k => s[k] || DEFAULTS[k] || ''
  const gs = k => Number(g(k)) || Number(DEFAULTS[k]) || 14

  const features = [1,2,3].map(i => ({ icon: g(`home_f${i}_icon`), title: g(`home_f${i}_title`), text: g(`home_f${i}_text`) }))
  const locations = [1,2,3,4].map(i => ({ icon: g(`home_l${i}_icon`), title: g(`home_l${i}_title`), text: g(`home_l${i}_text`) }))

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
          <a href="#programs" style={{ background: 'white', color: '#1a472a', padding: '13px 32px', borderRadius: '30px', textDecoration: 'none', fontWeight: '700', fontSize: '16px' }}>
            {g('home_hero_cta1')}
          </a>
          <Link to="/register" style={{ background: 'transparent', color: 'white', border: '2px solid rgba(255,255,255,0.6)', padding: '13px 32px', borderRadius: '30px', textDecoration: 'none', fontWeight: '700', fontSize: '16px' }}>
            {g('home_hero_cta2')}
          </Link>
        </div>
        <SectionCurve fill="#f5f5f5" />
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: '960px', margin: '60px auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: 'var(--sand-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}><FeatureIcon value={f.icon} size={28} color="#1a472a" /></div>
              <h3 style={{ margin: '0 0 8px', color: '#1a472a', fontSize: '16px', fontWeight: '700' }}>{f.title}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '13px', lineHeight: 1.6 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Locations */}
      <section style={{ background: 'var(--sand-light)', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#1a472a', fontSize: '26px', fontWeight: '800', marginBottom: '36px' }}>
            {g('home_locations_title')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {locations.map((l, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '28px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--sand)', borderTop: '3px solid var(--sand)' }}>
                <div style={{ marginBottom: '12px' }}><FeatureIcon value={l.icon} size={28} color="var(--sand)" /></div>
                <h3 style={{ margin: '0 0 10px', color: '#1a472a', fontSize: '17px', fontWeight: '700' }}>{l.title}</h3>
                <p style={{ margin: 0, color: '#555', fontSize: '14px', lineHeight: 1.7 }}>{l.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      {programs.length > 0 && (
        <section id="programs" style={{ maxWidth: '700px', margin: '60px auto 0', padding: '0 20px' }}>
          <h2 style={{ textAlign: 'center', color: '#1a472a', fontSize: '22px', fontWeight: '800', marginBottom: '20px' }}>
            תוכניות ופעילויות
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {programs.map(p => {
              const isOpen = openPrograms.includes(p.id)
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #eee', overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleProgram(p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '22px' }}>{p.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a472a' }}>{p.title}</div>
                      {p.subtitle && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{p.subtitle}</div>}
                    </div>
                    <span style={{ color: '#bbb', transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 20px 18px' }}>
                      {p.content && p.content.split('\n').filter(Boolean).map((line, i) => (
                        <p key={i} style={{ margin: '0 0 6px', fontSize: '13px', color: '#666', lineHeight: 1.7 }}>{line}</p>
                      ))}
                      {p.link_url && (
                        <a href={p.link_url} target="_blank" rel="noreferrer" style={{
                          display: 'inline-block', marginTop: '6px', color: '#1a472a', fontWeight: '700',
                          fontSize: '13px', textDecoration: 'none', borderBottom: '1px solid #1a472a',
                        }}>{p.link_label || 'לפרטים נוספים'}</a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

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
          <Link to="/register" style={{ background: '#1a472a', color: 'white', padding: '14px 40px', borderRadius: '30px', textDecoration: 'none', fontWeight: '700', fontSize: '16px', boxShadow: '0 4px 16px rgba(26,71,42,0.25)' }}>
            {g('home_cta_button')}
          </Link>
        </div>
      </section>
    </main>
  )
}
