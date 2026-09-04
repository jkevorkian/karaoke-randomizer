// La planilla es pública para lectura, así que el id puede vivir en el bundle.
export const ID_PLANILLA =
  import.meta.env.VITE_ID_PLANILLA || '1OEiudcnjGCEe-rQsado3YlVUH5MzqOT4Z1b2_Gtmk8E'

// URL del Apps Script publicado como aplicación web (termina en /exec).
//
// Está acá, en el repo, y no en un secreto de GitHub, porque NO es un secreto:
// se compila dentro del JavaScript que descarga cualquiera que abra el sitio,
// y encima el Apps Script está publicado como "cualquier usuario". Guardarla
// como secreto no escondía nada y hacía fallar el deploy si faltaba.
// Se puede pisar con VITE_URL_SCRIPT si algún día cambia la implementación.
export const URL_SCRIPT = import.meta.env.VITE_URL_SCRIPT ||
  'https://script.google.com/macros/s/AKfycbwyp4Tq_8asJt327EY4q2xJTKeeB66agTaky2lSi4VFvjYs5xNOEBzHEsox50arbCamNg/exec'

// Clave para entrar al panel de la fiesta. Tampoco es un secreto de verdad:
// viaja en el bundle y un invitado curioso la puede leer. Sirve para que nadie
// toque el Panel sin querer. No reutilices una contraseña.
export const CLAVE_PANEL = import.meta.env.VITE_CLAVE_PANEL || 'braian'

// Cada cuánto releemos la planilla mientras la app está abierta.
export const REFRESCO_MS = 7000

export const HAY_BACKEND = Boolean(URL_SCRIPT)

// Nombre del cumpleañero: la máquina le pone sello propio cuando sale sorteado.
export const CUMPLEANERO = import.meta.env.VITE_CUMPLEANERO || "Braian"
