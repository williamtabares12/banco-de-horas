import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/estilo/tokens.css'
import './ui/estilo/global.css'
import './ui/estilo/componentes.css'
import './ui/estilo/pantallas.css'
import { lazy, Suspense } from 'react'
import App from './App.tsx'

// Dos versiones del mismo código: la personal (por defecto, guarda en este dispositivo) y la que lleva
// cuenta y nube (`--mode nube` o `--mode emulador`). Como la comprobación es en tiempo de compilación,
// la personal no incluye Firebase.
const AppNube = import.meta.env.MODE === 'nube' || import.meta.env.MODE === 'emulador' ? lazy(() => import('./ui/nube/AppNube.tsx')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {AppNube ? (
      <Suspense fallback={null}>
        <AppNube />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
