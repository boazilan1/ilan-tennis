import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'בית' },
  { to: '/activities', label: 'פעילויות' },
  { to: '/register', label: 'הרשמה לחוג' },
  { to: '/login', label: 'כניסה' },
]

export default function Header() {
  const location = useLocation()

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

      <nav style={{ display: 'flex', gap: '8px' }}>
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
              fontSize: '16px',
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
