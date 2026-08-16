import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SectionCurve from '../components/SectionCurve'

const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}

function formatDays(a) {
  const days = a.days_of_week?.length ? a.days_of_week : (a.day_of_week ? [a.day_of_week] : [])
  return days.map(d => DAYS_HE[d]).filter(Boolean).join(', ')
}

const DEFAULTS = {
  nokdim_hero_title: 'נוקדים', nokdim_hero_title_size: '36',
  nokdim_hero_subtitle: 'מיקום חדש שלנו — שני מגרשי טניס, וחוג חדש שיוצא לדרך בקרוב',
  nokdim_hero_cta: 'הרשמה לחוג',
  nokdim_intro_text: 'אנחנו שמחים לפתוח פעילות חדשה בנוקדים!\nשני מגרשי טניס חדשים, באווירה מקצועית וקהילתית.\nהחוג מתאים לכל הגילאים והרמות — ממתחילים ועד מתקדמים.',
  nokdim_image_url: '', nokdim_image_pos_x: '50', nokdim_image_pos_y: '50',
}

export default function Nokdim() {
  const [s, setS] = useState(DEFAULTS)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [settingsRes, locationRes] = await Promise.all([
        supabase.from('site_settings').select('key, value').like('key', 'nokdim_%'),
        supabase.from('locations').select('id').eq('name', 'נוקדים').maybeSingle(),
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

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
      {/* Hero */}
      <section style={{
        position: 'relative', color: 'white', textAlign: 'center',
        padding: '90px 24px 76px', overflow: 'hidden',
        background: g('nokdim_image_url')
          ? `linear-gradient(180deg, rgba(15,45,26,0.55) 0%, rgba(15,45,26,0.72) 100%), url(${g('nokdim_image_url')}) ${gs('nokdim_image_pos_x')}% ${gs('nokdim_image_pos_y')}% / cover no-repeat`
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

      {/* Content card */}
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '56px 20px 56px' }}>
        <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* Intro */}
          <div style={{ padding: '30px 30px 26px', borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: '13px', lineHeight: 1.9, color: '#555' }}>
              {g('nokdim_intro_text').split('\n').filter(Boolean).join(' ')}
            </div>
          </div>

          {/* Schedule table */}
          {!loading && (
            <div style={{ padding: '26px 30px 30px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#aaa', marginBottom: '16px' }}>לוח זמנים</div>

              {slots.length > 0 ? (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <tbody>
                      {slots.map((slot, i) => (
                        <tr key={slot.id} style={{ borderBottom: i < slots.length - 1 ? '1px solid #eee' : 'none' }}>
                          <td style={{ padding: '12px 0', color: '#1a472a', fontWeight: '600' }}>{formatDays(slot)}</td>
                          <td style={{ padding: '12px 0', color: '#555' }}>{slot.time}</td>
                          <td style={{ padding: '12px 0', color: '#888', textAlign: 'left' }}>{slot.age_group}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link to={registerLink} style={{
                      background: '#1a472a', color: 'white', textDecoration: 'none',
                      borderRadius: '3px', padding: '12px 30px', fontWeight: '600', fontSize: '14px', letterSpacing: '0.3px',
                    }}>{g('nokdim_hero_cta')}</Link>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>פרטי החוג בנוקדים יתפרסמו בקרוב</p>
                  <Link to="/contact" style={{
                    color: '#1a472a', textDecoration: 'none', fontWeight: '600', fontSize: '13px', borderBottom: '1px solid #1a472a',
                  }}>השאירו פרטים ונעדכן אתכם</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
