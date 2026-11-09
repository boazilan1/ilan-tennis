import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useInstall, isMobile } from '../lib/install'

const DISMISS_KEY = 'install-banner-dismissed-at'
const DISMISS_DAYS = 30
// Only on the pages people land on first, so the banner never covers a form
// or a payment button halfway through registering.
const BANNER_PATHS = ['/', '/my-account']

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return !!at && Date.now() - at < DISMISS_DAYS * 86400000
  } catch {
    return false
  }
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-3px', margin: '0 2px' }} aria-label="שיתוף">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  )
}

// iOS has no install dialog; this is the only way.
function IosSteps() {
  return <>לחצו על <ShareIcon /> (שיתוף) בסרגל של Safari, ואז על ״הוסף למסך הבית״</>
}

// Bottom banner on mobile — offered on the home page and personal area only.
export function InstallBanner() {
  const { pathname } = useLocation()
  const { canPrompt, needsManualSteps, prompt } = useInstall()
  const [hidden, setHidden] = useState(recentlyDismissed)

  if (hidden || !isMobile() || !BANNER_PATHS.includes(pathname)) return null
  if (!canPrompt && !needsManualSteps) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* private mode */ }
    setHidden(true)
  }

  return (
    <div role="dialog" aria-label="התקנת האפליקציה" style={{
      position: 'fixed', right: '12px', left: '12px', bottom: '12px', zIndex: 200,
      background: '#1a472a', color: '#fff', borderRadius: '16px', padding: '12px 14px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.35)', direction: 'rtl',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <img src="/icon-192.png" alt="" width="44" height="44" style={{ borderRadius: '10px', flexShrink: 0, background: '#fff' }} />
      <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.45 }}>
        <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>האפליקציה של אילן טניס</div>
        {canPrompt ? 'הרשמה, אימונים ותשלומים בלחיצה אחת מהמסך הראשי' : <IosSteps />}
      </div>
      {canPrompt && (
        <button onClick={() => { prompt(); dismiss() }} style={{ background: '#fff', color: '#1a472a', border: 'none', borderRadius: '10px', padding: '9px 16px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>התקנה</button>
      )}
      <button onClick={dismiss} aria-label="סגירה" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '22px', lineHeight: 1, cursor: 'pointer', padding: '4px', flexShrink: 0 }}>×</button>
    </div>
  )
}

// Permanent link in the footer, for anyone who dismissed the banner.
export function InstallLink() {
  const { canPrompt, needsManualSteps, prompt } = useInstall()
  const [showSteps, setShowSteps] = useState(false)

  if (!canPrompt && !needsManualSteps) return null

  return (
    <div style={{ margin: '0 0 12px' }}>
      <button
        onClick={() => (canPrompt ? prompt() : setShowSteps(s => !s))}
        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '20px', padding: '7px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
      >📲 התקנת האפליקציה</button>
      {showSteps && <p style={{ margin: '10px auto 0', maxWidth: '320px', fontSize: '13px', lineHeight: 1.5 }}><IosSteps /></p>}
    </div>
  )
}
