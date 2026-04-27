import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/app'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
