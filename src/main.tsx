import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/estilo/tokens.css'
import './ui/estilo/global.css'
import './ui/estilo/componentes.css'
import './ui/estilo/pantallas.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
