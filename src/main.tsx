import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FyreDbConfigError } from '@fyre-db/core'
import { loadPack } from '@/lib/icons'
import { log } from '@/log'
import './index.css'
import { App } from './app/App'

// Eager-load the chrome icon bundle so navbar / theme switcher / sync status
// icons render synchronously on first paint instead of flickering in.
void loadPack('common').catch((err: unknown) => {
  log.icons.warn('failed to preload common icon pack: %o', err)
})

const root = document.getElementById('root')
if (!root) throw new FyreDbConfigError('Root element not found. Ensure index.html contains <div id="root"></div>.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
