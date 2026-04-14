import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, isAdmin } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const navLinks = [
    { to: '/', label: 'בית' },
    { to: '/activities', label: 'פעילויות' },
    { to: '/register', label: 'הרשמה לחוג' },
    ...(isAdmin ? [{ to: '/admin', label: '⚙️ ניהול' }] : []),
  ]

  return (
    <header style={{
      background: '#1a472a',
      color: 'white',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '64px',
      direction: 'rtl',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '28px' }}>🎾</span>
        <span style={{ fontWeight: 'bold', fontSize: '20px' }}>אילן טניס</span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: location.pathname === link.to ? 'bold' : 'normal',
              background: location.pathname === link.to ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontSize: '15px',
            }}
          >
            {link.label}
          </Link>
        ))}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '8px', borderRight: '1px solid rgba(255,255,255,0.3)', paddingRight: '16px' }}>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>
              שלום, {profile?.full_name?.split(' ')[0] || 'משתמש'}
              {isAdmin && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '2px 6px', marginRight: '6px', fontSize: '12px' }}>מנהל</span>}
            </span>
            <button onClick={handleLogout} style={{
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: '14px',
            }}>
              יציאה
            </button>
          </div>
        ) : (
          <Link to="/login" style={{
            background: 'white',
            color: '#1a472a',
            textDecoration: 'none',
            padding: '8px 18px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '15px',
            marginRight: '8px',
          }}>
            כניסה
          </Link>
        )}
      </nav>
    </header>
  )
}
