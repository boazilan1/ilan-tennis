import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SectionCurve from '../components/SectionCurve'
import Icon from '../components/Icon'

const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}

function formatDays(a) {
  const days = a.days_of_week?.length ? a.days_of_week : (a.day_of_week ? [a.day_of_week] : [])
  return days.map(d => DAYS_HE[d]).filter(Boolean).join(', ')
}

// A location landing page (hero photo, intro text, schedule table) shared by
// every location that gets its own page — parameterized by the site_settings
// key prefix and the row in `locations` used to find its slots.
export default function LocationPage({ prefix, locationName, defaults, externalDefault }) {
  const DEFAULTS = {
    [`${prefix}_hero_title`]: locationName,
    [`${prefix}_hero_title_size`]: '36',
    [`${prefix}_hero_subtitle`]: '',
    [`${prefix}_hero_cta`]: 'הרשמה לחוג',
    [`${prefix}_intro_title`]: '',
    [`${prefix}_intro_text`]: '',
    [`${prefix}_image_url`]: '', [`${prefix}_image_pos_x`]: '50', [`${prefix}_image_pos_y`]: '50',
    [`${prefix}_external_url`]: externalDefault?.url || '',
    [`${prefix}_external_label`]: externalDefault?.label || 'הרשמה',
    ...defaults,
  }

  const [s, setS] = useState(DEFAULTS)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [settingsRes, locationRes] = await Promise.all([
        supabase.from('site_settings').select('key, value').like('key', `${prefix}_%`),
        supabase.from('locations').select('id').eq('name', locationName).maybeSingle(),
      ])
      if (settingsRes.data) {
        const map = {}
        settingsRes.data.forEach(r => { if (r.value) map[r.key] = r.value })
        setS(prev => ({ ...prev, ...map }))
      }
      if (locationRes.data) {
        const { data: activitiesData } = await supabase.from('activities').select('*').eq('location_id', locationRes.data.id).order('time')
        if (activitiesData) setSlots(activitiesData)
      }
      setLoading(false)
    }
    load()
  }, [])

  const g = k => s[k] || DEFAULTS[k] || ''
  const gs = k => Number(g(k)) || Number(DEFAULTS[k]) || 14

  const registerLink = '/register'
  const externalUrl = slots.length === 0 ? g(`${prefix}_external_url`) : ''

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
      {/* Hero */}
      <section style={{
        position: 'relative', color: 'white', textAlign: 'center',
        padding: '90px 24px 76px', overflow: 'hidden',
        background: g(`${prefix}_image_url`)
          ? `linear-gradient(180deg, rgba(15,45,26,0.55) 0%, rgba(15,45,26,0.72) 100%), url(${g(`${prefix}_image_url`)}) ${gs(`${prefix}_image_pos_x`)}% ${gs(`${prefix}_image_pos_y`)}% / cover no-repeat`
          : 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
      }}>
        <h1 style={{ fontSize: gs(`${prefix}_hero_title_size`) + 'px', fontWeight: '800', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          {g(`${prefix}_hero_title`)}
        </h1>
        {g(`${prefix}_hero_subtitle`) && (
          <p style={{ fontSize: '17px', opacity: 0.92, margin: '0 auto 32px', maxWidth: '520px', lineHeight: 1.7 }}>
            {g(`${prefix}_hero_subtitle`)}
          </p>
        )}
        {externalUrl ? (
          <a href={externalUrl} target="_blank" rel="noreferrer" style={{
            display: 'inline-block', background: 'white', color: '#1a472a',
            padding: '14px 40px', borderRadius: '30px', textDecoration: 'none',
            fontWeight: '800', fontSize: '17px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          }}>
            {g(`${prefix}_hero_cta`)}
          </a>
        ) : (
          <Link to={registerLink} style={{
            display: 'inline-block', background: 'white', color: '#1a472a',
            padding: '14px 40px', borderRadius: '30px', textDecoration: 'none',
            fontWeight: '800', fontSize: '17px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          }}>
            {g(`${prefix}_hero_cta`)}
          </Link>
        )}
        <SectionCurve fill="#f3f6f3" />
      </section>

      {/* Intro */}
      {g(`${prefix}_intro_text`) && (
        <section style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 20px 20px' }}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderTop: '4px solid var(--sand)' }}>
            {g(`${prefix}_intro_title`) && (
              <h2 style={{ color: '#1a472a', fontSize: '22px', fontWeight: '800', margin: '0 0 16px' }}>{g(`${prefix}_intro_title`)}</h2>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(() => {
                const paragraphs = g(`${prefix}_intro_text`).split('\n').filter(Boolean)
                return paragraphs.map((p, i) => {
                  const isFirst = i === 0
                  const isLast = i === paragraphs.length - 1 && paragraphs.length > 1
                  if (isFirst) {
                    return <p key={i} style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: '800', color: '#1a472a', lineHeight: 1.5 }}>{p}</p>
                  }
                  if (isLast) {
                    return (
                      <p key={i} style={{ margin: '14px 0 0', paddingTop: '16px', borderTop: '1px solid #eee', fontSize: '17px', fontWeight: '800', color: '#1a472a', lineHeight: 1.6, textAlign: 'center' }}>{p}</p>
                    )
                  }
                  return <p key={i} style={{ margin: 0, fontSize: '15px', color: '#444', lineHeight: 1.8, paddingRight: '14px', borderRight: '3px solid var(--sand)' }}>{p}</p>
                })
              })()}
            </div>
          </div>
        </section>
      )}

      {/* Schedule */}
      {!loading && (
        <section style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 20px 56px' }}>
          {slots.length > 0 ? (
            <div style={{
              background: '#e8f5e9', border: '1px solid #c5ddc5', borderRadius: '18px',
              padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center', textAlign: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                {slots.map(slot => (
                  <div key={slot.id} style={{
                    display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center',
                    fontSize: '15px', color: '#333', background: 'white', borderRadius: '12px', padding: '14px 18px',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="calendar" size={17} color="var(--sand)" />{formatDays(slot)}</span>
                    {slot.time && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="clock" size={17} color="var(--sand)" />{slot.time}</span>}
                    {slot.age_group && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="users" size={17} color="var(--sand)" />{slot.age_group}</span>}
                    {slot.price && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="tag" size={17} color="var(--sand)" />₪{slot.price} לחודש</span>}
                  </div>
                ))}
              </div>
              <Link to={registerLink} style={{
                background: '#1a472a', color: 'white', textDecoration: 'none',
                borderRadius: '30px', padding: '12px 36px', fontWeight: '700', fontSize: '15px',
                boxShadow: '0 4px 14px rgba(26,71,42,0.25)',
              }}>{g(`${prefix}_hero_cta`)}</Link>
            </div>
          ) : externalUrl ? (
            <div style={{
              background: '#e8f5e9', border: '1px solid #c5ddc5', borderRadius: '18px',
              padding: '28px', textAlign: 'center',
            }}>
              <p style={{ margin: '0 0 16px', fontSize: '15px', color: '#333' }}>ההרשמה לפעילות מתבצעת דרך האתר החיצוני</p>
              <a href={externalUrl} target="_blank" rel="noreferrer" style={{
                display: 'inline-block', background: '#1a472a', color: 'white', textDecoration: 'none',
                borderRadius: '30px', padding: '12px 36px', fontWeight: '700', fontSize: '15px',
              }}>{g(`${prefix}_external_label`)}</a>
            </div>
          ) : (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '18px',
              padding: '28px', textAlign: 'center', color: '#7c5a00',
            }}>
              <div style={{ marginBottom: '10px' }}><Icon name="clock" size={30} color="#b45309" /></div>
              <p style={{ margin: '0 0 16px', fontSize: '15px' }}>פרטי החוג יתפרסמו בקרוב</p>
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
