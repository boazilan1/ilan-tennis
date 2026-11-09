// "Install as an app" support. Chrome/Edge/Android fire `beforeinstallprompt`
// once, often before React has mounted, so it is captured here at import time
// (main.jsx imports this file first) and handed to whichever component asks.
// iOS Safari has no such event: the user has to use Share → Add to Home Screen,
// so for iOS we only tell them how.

import { useEffect, useState } from 'react'

let deferredPrompt = null
let installed = false
const listeners = new Set()
const notify = () => listeners.forEach(fn => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installed = true
    notify()
  })
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIos() {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac, but has a touch screen
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isMobile() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent) || isIos()
}

export function useInstall() {
  const [, rerender] = useState(0)
  useEffect(() => {
    const fn = () => rerender(n => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  const standalone = installed || isStandalone()
  return {
    // already running as an installed app — nothing to offer
    standalone,
    // the browser can show its own install dialog
    canPrompt: !standalone && !!deferredPrompt,
    // iOS: no dialog, show the Share → Add to Home Screen steps instead
    needsManualSteps: !standalone && !deferredPrompt && isIos(),
    async prompt() {
      if (!deferredPrompt) return
      const evt = deferredPrompt
      deferredPrompt = null // a prompt can only be used once
      notify()
      evt.prompt()
      await evt.userChoice.catch(() => null)
    },
  }
}
