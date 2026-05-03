import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StrataConfigError } from '@strata/core'
import './index.css'
import { App } from './app/app'

const root = document.getElementById('root')
if (!root) throw new StrataConfigError('Root element not found. Ensure index.html contains <div id="root"></div>.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
