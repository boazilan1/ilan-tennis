import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SectionCurve from '../components/SectionCurve'
import Icon from '../components/Icon'

export default function Activities() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [heroTitle, setHeroTitle] = useState('הפעילויות שלנו')
  const [heroTitleSize, setHeroTitleSize] = useState(30)
  const [heroSubtitle, setHeroSubtitle] = useState('אימון טניס מקצועי בציפורי, גבעת זאב ובתי ספר באזור ירושלים')
  const [heroSubtitleSize, setHeroSubtitleSize] = useState(16)

  useEffect(() => {
    Promise.all([
      supabase.from('activity_sections').select('*').order('sort_order'),
      supabase.from('site_settings').select('key, value').in('key', ['activities_hero_title', 'activities_hero_title_size', 'activities_hero_subtitle', 'activities_hero_subtitle_size']),
    ]).then(([secRes, setRes]) => {
      if (secRes.data) setSections(secRes.data)
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

      {/* Contact */}
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>שאלות? נשמח לעזור</p>
        <Link to="/contact" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1a472a', color: 'white',
          textDecoration: 'none', borderRadius: '30px', padding: '12px 32px',
          fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 14px rgba(26,71,42,0.2)',
        }}>
          <Icon name="mail" size={16} />יצירת קשר
        </Link>
      </div>
    </main>
  )
}
