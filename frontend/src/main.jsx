import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const SW_CLEANUP_FLAG = 'bnf-sw-cleanup-done'

async function ensureFreshClientOnLoad() {
  if (!import.meta.env.PROD || typeof window === 'undefined') {
    return false
  }

  let shouldReload = false

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length > 0) {
        await Promise.all(registrations.map((registration) => registration.unregister()))
        shouldReload = true
      }
    }

    if ('caches' in window) {
      const keys = await caches.keys()
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup browser cache:', error)
  }

  if (shouldReload) {
    try {
      if (sessionStorage.getItem(SW_CLEANUP_FLAG) !== '1') {
        sessionStorage.setItem(SW_CLEANUP_FLAG, '1')
        window.location.reload()
        return true
      }
    } catch {
      window.location.reload()
      return true
    }
  }

  try {
    sessionStorage.removeItem(SW_CLEANUP_FLAG)
  } catch {
    // Ignore storage access errors in restricted browser contexts.
  }
  return false
}

async function bootstrap() {
  const reloading = await ensureFreshClientOnLoad()
  if (reloading) {
    return
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap()
