function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a472a 0%, #2d5a27 50%, #1a472a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      color: 'white',
      textAlign: 'center',
      padding: '20px',
      direction: 'rtl',
    }}>
      <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎾</div>
      <h1 style={{ fontSize: '48px', margin: '0 0 10px 0', fontWeight: 'bold' }}>
        אילן טניס
      </h1>
      <p style={{ fontSize: '22px', opacity: 0.85, marginBottom: '40px' }}>
        אקדמיית טניס מקצועית
      </p>
      <a
        href="mailto:ilantennisacademy@gmail.com"
        style={{
          background: 'white',
          color: '#1a472a',
          padding: '14px 32px',
          borderRadius: '30px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '18px',
        }}
      >
        צור קשר
      </a>
    </div>
  )
}

export default App
