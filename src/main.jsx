import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// Fuente Outfit auto-hospedada (registra la familia 'Outfit Variable'):
// funciona offline desde la primera carga, sin depender de Google Fonts.
import '@fontsource-variable/outfit'
// Fuente Fredoka auto-hospedada (redondeada, estilo kawaii) para títulos.
import '@fontsource-variable/fredoka'
// Anton: tipografía condensada de póster para títulos y números grandes.
import '@fontsource/anton'
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
