import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SectionCurve from '../components/SectionCurve'

const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}

export default function Activities() {
  const [sections, setSections] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [heroTitle, setHeroTitle] = useState('הפעילויות שלנו')
  const [heroTitleSize, setHeroTitleSize] = useState(30)
  const [heroSubtitle, setHeroSubtitle] = useState('אימון טניס מקצועי בציפורי, גבעת זאב ובתי ספר באזור ירושלים')
  const [heroSubtitleSize, setHeroSubtitleSize] = useState(16)

  useEffect(() => {
    Promise.all([
      supabase.from('activity_sections').select('*').order('sort_order'),
      supabase.from('activities').select('*').order('sort_order').order('day_of_week'),
      supabase.from('site_settings').select('key, value').in('key', ['activities_hero_title', 'activities_hero_title_size', 'activities_hero_subtitle', 'activities_hero_subtitle_size']),
    ]).then(([secRes, actRes, setRes]) => {
      if (secRes.data) setSections(secRes.data)
      if (actRes.data) setActivities(actRes.data)
      if (setRes.data) {
        setRes.data.forEach(r => {
          if (r.key === 'activities_hero_title' && r.value) setHeroTitle(r.value)
          if (r.key === 'activities_hero_title_size' && r.value) setHeroTitleSize(Number(r.value))
          if (r.key === 'activities_hero_subtitle' && r.value) setHeroSubtitle(r.value)
          if (r.key === 'activities_hero_subtitle_size' && r.value) setHeroSubtitleSize(Number(r.value))
        })
      }
      setLoading(false)
    })
  }, [])

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
        color: 'white', textAlign: 'center', padding: '52px 24px 60px',
        position: 'relative',
      }}>
        <h1 style={{ fontSize: heroTitleSize + 'px', fontWeight: '800', margin: '0 0 10px', letterSpacing: '-0.5px' }}>{heroTitle}</h1>
        <p style={{ opacity: 0.85, fontSize: heroSubtitleSize + 'px', margin: '0 0 28px' }}>{heroSubtitle}</p>
        <Link to="/register" style={{
          background: 'white', color: '#1a472a',
          padding: '12px 32px', borderRadius: '30px',
          textDecoration: 'none', fontWeight: '700', fontSize: '15px',
        }}>הרשמה לחוג</Link>
        <SectionCurve fill="#f3f6f3" />
      </div>

      {/* Dynamic sections */}
      {!loading && sections.length > 0 && (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sections.map(s => (
            <div key={s.id} style={{
              background: 'white', borderRadius: '18px', overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #eee',
            }}>
              {s.image_url && (
                <img src={s.image_url} alt={s.title} style={{ width: '100%', height: (s.image_height || 260) + 'px', objectFit: s.image_fit || 'cover', display: 'block' }} />
              )}
              <div style={{ background: s.bg_hex || '#f0f7f0', borderBottom: `1px solid ${s.border_hex || '#c5ddc5'}`, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '30px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '19px', color: s.color_hex || '#1a472a' }}>{s.title}</div>
                  {s.subtitle && <div style={{ fontSize: '13px', color: '#777', marginTop: '2px' }}>{s.subtitle}</div>}
                </div>
              </div>
              {s.content && (
                <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {s.content.split('\n').filter(Boolean).map((p, i) => (
                    <p key={i} style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: 1.75, paddingRight: '14px', borderRight: `3px solid ${s.border_hex || '#c5ddc5'}` }}>{p}</p>
                  ))}
                </div>
              )}
              {s.link_url && (
                <div style={{ padding: '0 24px 20px' }}>
                  <a href={s.link_url} target="_blank" rel="noreferrer" style={{
                    display: 'inline-block', background: s.color_hex || '#1a472a', color: '#fff',
                    textDecoration: 'none', borderRadius: '10px', padding: '10px 22px',
                    fontSize: '14px', fontWeight: '700',
                  }}>{s.link_label || 'לפרטים נוספים'}</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Class cards */}
      {!loading && activities.length > 0 && (
        <div style={{ background: 'white', borderTop: '1px solid #eee', padding: '48px 20px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <h2 style={{ color: '#1a472a', fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>לוח החוגים</h2>
            <p style={{ color: '#888', marginBottom: '28px', fontSize: '14px' }}>
              להרשמה — <Link to="/register" style={{ color: '#1a472a', fontWeight: '600' }}>לחצו כאן</Link>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '18px' }}>
              {activities.map(a => (
                <div key={a.id} style={{
                  borderRadius: '16px', border: '1px solid #e8ece8', overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column',
                }}>
                  {a.image_url
                    ? <img src={a.image_url} alt={a.name} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '80px', background: 'linear-gradient(135deg, #1a472a, #2d6a4f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>🎾</div>
                  }
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: '#1a472a' }}>{a.name}</div>
                    {a.description && <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: 1.6 }}>{a.description}</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', color: '#555', marginTop: '4px' }}>
                      <span>📅 יום {DAYS_HE[a.day_of_week] || a.day_of_week}</span>
                      {a.time && <span>🕐 {a.time}</span>}
                      {a.price && <span>💰 ₪{a.price} לחודש</span>}
                      {a.max_students && <span>👥 עד {a.max_students} תלמידים</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact */}
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>שאלות? נשמח לעזור</p>
        <Link to="/contact" style={{
          display: 'inline-block', background: '#1a472a', color: 'white',
          textDecoration: 'none', borderRadius: '30px', padding: '12px 32px',
          fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 14px rgba(26,71,42,0.2)',
        }}>
          📬 יצירת קשר
        </Link>
      </div>
    </main>
  )
}
