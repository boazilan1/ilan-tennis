import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

export default function DynamicPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: pageData } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!pageData) { setNotFound(true); setLoading(false); return }

      const { data: sectionData } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', pageData.id)
        .order('sort_order')

      setPage(pageData)
      setSections(sectionData || [])
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <main style={{ direction: 'rtl', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888', fontSize: '15px' }}>טוען...</div>
      </main>
    )
  }

  if (notFound) {
    return (
      <main style={{ direction: 'rtl', flex: 1, textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ marginBottom: '16px' }}><Icon name="ball" size={40} color="#1a472a" /></div>
        <h1 style={{ color: '#1a472a', marginBottom: '8px' }}>הדף לא נמצא</h1>
        <Link to="/" style={{ color: '#1a472a', fontWeight: '700' }}>חזרה לעמוד הבית</Link>
      </main>
    )
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, background: '#f3f6f3' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2d1a 0%, #1a472a 60%, #2d6a4f 100%)',
        color: 'white', textAlign: 'center', padding: '48px 24px 40px',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px', letterSpacing: '-0.5px' }}>{page.title}</h1>
        {page.description && (
          <p style={{ opacity: 0.85, fontSize: '15px', margin: 0, maxWidth: '600px', marginInline: 'auto' }}>{page.description}</p>
        )}
      </div>

      {/* Sections */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {sections.map(s => (
          <div key={s.id} style={{
            background: 'white', borderRadius: '18px', overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #eee',
          }}>
            {s.image_url && (
              <img src={s.image_url} alt="" style={{ width: '100%', height: (s.image_height || 260) + 'px', objectFit: s.image_fit || 'cover', display: 'block' }} />
            )}
            {(s.caption || s.button_url) && (
              <div style={{ padding: '22px 28px' }}>
                {s.caption && s.caption.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} style={{ margin: '0 0 10px', fontSize: (s.caption_size || 15) + 'px', color: s.caption_color || '#333', lineHeight: 1.8 }}>{line}</p>
                ))}
                {s.button_url && s.button_label && (
                  <div style={{ marginTop: s.caption ? '12px' : '0' }}>
                    <a href={s.button_url} target="_blank" rel="noreferrer" style={{
                      display: 'inline-block', background: s.button_color || '#1a472a', color: '#fff',
                      textDecoration: 'none', borderRadius: '10px', padding: '10px 24px',
                      fontSize: '14px', fontWeight: '700', boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                    }}>{s.button_label}</a>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {sections.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
            <div style={{ marginBottom: '12px' }}><Icon name="ball" size={30} color="#ccc" /></div>
            <p>תוכן הדף יהיה זמין בקרוב</p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{ textAlign: 'center', padding: '40px 20px', borderTop: '1px solid #e8ece8' }}>
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
