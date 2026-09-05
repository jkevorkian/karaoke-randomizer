import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { aplicar } from './movimiento.js'
import './estilos.css'

// Antes de pintar nada: deja estampado en <html> cuánto se mueve la máquina.
aplicar()

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
