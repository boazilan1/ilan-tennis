import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, isAdmin } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dynamicPages, setDynamicPages] = useState([])
  const [logoText, setLogoText] = useState('אילן טניס')
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('pages').select('title, slug').order('sort_order'),
      supabase.from('site_settings').select('key, value').in('key', ['header_logo_text', 'header_logo_url']),
    ]).then(([pagesRes, logoRes]) => {
      if (pagesRes.data) setDynamicPages(pagesRes.data)
      logoRes.data?.forEach(r => {
        if (r.key === 'header_logo_text' && r.value) setLogoText(r.value)
        if (r.key === 'header_logo_url') setLogoUrl(r.value || '')
      })
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
    setMenuOpen(false)
  }

  const navLinks = [
    { to: '/', label: 'בית' },
    { to: '/גבעת-זאב', label: 'גבעת זאב' },
    { to: '/נוקדים', label: 'נוקדים' },
    { to: '/tournaments', label: 'תחרויות' },
    ...dynamicPages.map(p => ({ to: `/page/${p.slug}`, label: p.title })),
    ...(isAdmin ? [{ to: '/admin', label: 'ניהול', icon: 'settings' }] : []),
  ]

  return (
    <header style={{
      background: '#1a472a',
      color: 'white',
      padding: '0 20px',
      direction: 'rtl',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      position: 'relative',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setMenuOpen(false)}>
          {logoUrl ? <img src={logoUrl} alt="" style={{ height: '44px', width: 'auto', objectFit: 'contain', display: 'block' }} /> : <Icon name="ball" size={26} />}
          <span style={{ fontWeight: 'bold', fontSize: '20px' }}>{logoText}</span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', '@media(max-width:768px)': { display: 'none' } }} className="desktop-nav">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: location.pathname === link.to ? 'bold' : 'normal',
              background: location.pathname === link.to ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontSize: '15px',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}>{link.icon && <Icon name={link.icon} size={16} />}{link.label}</Link>
          ))}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '8px', borderRight: '1px solid rgba(255,255,255,0.3)', paddingRight: '16px' }}>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>
                שלום, {profile?.full_name?.split(' ')[0] || 'משתמש'}
                {isAdmin && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '2px 6px', marginRight: '6px', fontSize: '12px' }}>מנהל</span>}
              </span>
              <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px' }}>יציאה</button>
            </div>
          ) : (
            <Link to="/login" style={{ background: 'white', color: '#1a472a', textDecoration: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', marginRight: '8px' }}>כניסה</Link>
          )}
        </nav>

        {/* Hamburger button — mobile only */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="hamburger-btn"
          style={{ display: 'none', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', fontSize: '24px' }}
          aria-label="תפריט"
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav style={{ paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }} className="mobile-nav">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} style={{
              color: 'white',
              textDecoration: 'none',
              padding: '12px 8px',
              borderRadius: '8px',
              fontWeight: location.pathname === link.to ? 'bold' : 'normal',
              background: location.pathname === link.to ? 'rgba(255,255,255,0.15)' : 'transparent',
              fontSize: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>{link.icon && <Icon name={link.icon} size={17} />}{link.label}</Link>
          ))}
          {user ? (
            <>
              <div style={{ padding: '12px 8px', fontSize: '14px', opacity: 0.85 }}>
                שלום, {profile?.full_name?.split(' ')[0] || 'משתמש'}
                {isAdmin && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '2px 6px', marginRight: '6px', fontSize: '12px' }}>מנהל</span>}
              </div>
              <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', padding: '12px', cursor: 'pointer', fontSize: '15px', textAlign: 'center' }}>יציאה</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ background: 'white', color: '#1a472a', textDecoration: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', textAlign: 'center', marginTop: '4px' }}>כניסה</Link>
          )}
        </nav>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: block !important; }
        }
      `}</style>
    </header>
  )
}
