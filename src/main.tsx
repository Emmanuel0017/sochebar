import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSyncManager } from './lib/syncManager'

// Starts listening for reconnection and flushes any sales/expenses/
// purchases etc. that were queued while offline.
initSyncManager()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
