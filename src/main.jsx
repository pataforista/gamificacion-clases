import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { NotificationProvider } from './components/NotificationContext'
import { PersistenceProvider } from './hooks/usePersistence'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PersistenceProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </PersistenceProvider>
  </StrictMode>,
)
