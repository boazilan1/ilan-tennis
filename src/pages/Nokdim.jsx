import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SectionCurve from '../components/SectionCurve'

const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}

const DEFAULTS = {
  nokdim_hero_title: 'נוקדים', nokdim_hero_title_size: '36',
  nokdim_hero_subtitle: 'מיקום חדש שלנו — שני מגרשי טניס, וחוג חדש שיוצא לדרך בקרוב',
  nokdim_hero_cta: 'הרשמה לחוג',
  nokdim_intro_title: 'טניס בנוקדים',
  nokdim_intro_text: 'אנחנו שמחים לפתוח פעילות חדשה בנוקדים!\nשני מגרשי טניס חדשים, באווירה מקצועית וקהילתית.\nהחוג מתאים לכל הגילאים והרמות — ממתחילים ועד מתקדמים.',
  nokdim_image_url: '',
}

export default function Nokdim() {
  const [s, setS] = useState(DEFAULTS)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('site_settings').select('key, value').like('key', 'nokdim_%'),
      supabase.from('activities').select('*').ilike('name', '%נוקדים%').limit(1).maybeSingle(),
    ]).then(([settingsRes, activityRes]) => {
      if (settingsRes.data) {
        const map = {}
        settingsRes.data.forEach(r => { if (r.value) map[r.key] = r.value })
        setS(prev => ({ ...prev, ...map }))
      }
      if (activityRes.data) setActivity(activityRes.data)
      setLoading(false)
    })
  }, [])

  const g = k => s[k] || DEFAULTS[k] || ''
  const gs = k => Number(g(k)) || Number(DEFAULTS[k]) || 14

  const registerLink = activity ? `/register?activity=${activity.id}` : '/register'

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
      {/* Hero */}
      <section style={{
        position: 'relative', color: 'white', textAlign: 'center',
        padding: '90px 24px 76px', overflow: 'hidden',
        background: g('nokdim_image_url')
          ? `linear-gradient(180deg, rgba(15,45,26,0.55) 0%, rgba(15,45,26,0.72) 100%), url(${g('nokdim_image_url')}) center / cover no-repeat`
          : 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
      }}>
        <h1 style={{ fontSize: gs('nokdim_hero_title_size') + 'px', fontWeight: '800', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          {g('nokdim_hero_title')}
        </h1>
        <p style={{ fontSize: '17px', opacity: 0.92, margin: '0 auto 32px', maxWidth: '520px', lineHeight: 1.7 }}>
          {g('nokdim_hero_subtitle')}
        </p>
        <Link to={registerLink} style={{
          display: 'inline-block', background: 'white', color: '#1a472a',
          padding: '14px 40px', borderRadius: '30px', textDecoration: 'none',
          fontWeight: '800', fontSize: '17px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {g('nokdim_hero_cta')}
        </Link>
        <SectionCurve fill="#f3f6f3" />
      </section>

      {/* Intro */}
      <section style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 20px 20px' }}>
        <div style={{ background: 'white', borderRadius: '18px', padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #eee' }}>
          <h2 style={{ color: '#1a472a', fontSize: '22px', fontWeight: '800', margin: '0 0 16px' }}>{g('nokdim_intro_title')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {g('nokdim_intro_text').split('\n').filter(Boolean).map((p, i) => (
              <p key={i} style={{ margin: 0, fontSize: '15px', color: '#444', lineHeight: 1.8, paddingRight: '14px', borderRight: '3px solid #c5ddc5' }}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule */}
      {!loading && (
        <section style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 20px 56px' }}>
          {activity ? (
            <div style={{
              background: '#e8f5e9', border: '1px solid #c5ddc5', borderRadius: '18px',
              padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center',
            }}>
              <div style={{ fontWeight: '800', fontSize: '19px', color: '#1a472a' }}>{activity.name}</div>
              {activity.description && <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>{activity.description}</p>}
              <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '15px', color: '#333' }}>
                <span>📅 יום {DAYS_HE[activity.day_of_week] || activity.day_of_week}</span>
                {activity.time && <span>🕐 {activity.time}</span>}
                {activity.price && <span>💰 ₪{activity.price} לחודש</span>}
              </div>
              <Link to={registerLink} style={{
                marginTop: '6px', background: '#1a472a', color: 'white', textDecoration: 'none',
                borderRadius: '30px', padding: '12px 36px', fontWeight: '700', fontSize: '15px',
                boxShadow: '0 4px 14px rgba(26,71,42,0.25)',
              }}>{g('nokdim_hero_cta')}</Link>
            </div>
          ) : (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '18px',
              padding: '28px', textAlign: 'center', color: '#7c5a00',
            }}>
              <div style={{ fontSize: '30px', marginBottom: '8px' }}>🕒</div>
              <p style={{ margin: '0 0 16px', fontSize: '15px' }}>פרטי החוג בנוקדים יתפרסמו בקרוב</p>
              <Link to="/contact" style={{
                display: 'inline-block', background: '#1a472a', color: 'white', textDecoration: 'none',
                borderRadius: '30px', padding: '10px 28px', fontWeight: '700', fontSize: '14px',
              }}>השאירו פרטים ונעדכן אתכם</Link>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
