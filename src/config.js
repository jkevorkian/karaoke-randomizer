// La planilla es pública para lectura, así que el id puede vivir en el bundle.
export const ID_PLANILLA =
  import.meta.env.VITE_ID_PLANILLA || '1OEiudcnjGCEe-rQsado3YlVUH5MzqOT4Z1b2_Gtmk8E'

// URL del Apps Script publicado como aplicación web (termina en /exec).
// Sin esto la app arranca en modo demo y no escribe nada.
export const URL_SCRIPT = import.meta.env.VITE_URL_SCRIPT || ''

// Clave para entrar al panel de la fiesta. Cambiala antes del cumple.
export const CLAVE_PANEL = import.meta.env.VITE_CLAVE_PANEL || 'braian'

// Cada cuánto releemos la planilla mientras la app está abierta.
export const REFRESCO_MS = 7000

export const HAY_BACKEND = Boolean(URL_SCRIPT)

// Nombre del cumpleañero: la máquina le pone sello propio cuando sale sorteado.
export const CUMPLEANERO = import.meta.env.VITE_CUMPLEANERO || "Braian"
