import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Limpia datos de versiones anteriores (datos de ejemplo)
try {
  localStorage.removeItem('lspd-recruitment-v1')
} catch {
  /* noop */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
