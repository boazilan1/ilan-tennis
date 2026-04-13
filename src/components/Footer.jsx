export default function Footer() {
  return (
    <footer style={{
      background: '#1a472a',
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      padding: '24px',
      direction: 'rtl',
      fontSize: '14px',
      marginTop: 'auto',
    }}>
      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'white' }}>🎾 אילן טניס</p>
      <p style={{ margin: '0 0 4px 0' }}>אקדמיית טניס מקצועית</p>
      <p style={{ margin: 0 }}>
        <a href="mailto:ilantennisacademy@gmail.com" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
          ilantennisacademy@gmail.com
        </a>
      </p>
      <p style={{ margin: '8px 0 0 0', opacity: 0.5, fontSize: '12px' }}>
        © {new Date().getFullYear()} כל הזכויות שמורות
      </p>
    </footer>
  )
}
