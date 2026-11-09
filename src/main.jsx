import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/install' // must load early: the browser's install prompt can fire before React mounts
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Makes the site installable as an app and shows an offline page when there is
// no connection (see public/sw.js). Not registered in dev, where it would only
// get in the way of hot reloading.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('service worker registration failed', err))
  })
}
