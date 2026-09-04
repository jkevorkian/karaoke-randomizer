# Conectar la app con la planilla

La app hace dos cosas distintas con la planilla, y esto explica todos los
pasos que siguen:

- **Lee** directo del endpoint público de Google, desde el navegador de cada
  invitado. No pasa por el Apps Script. Por eso la planilla tiene que estar
  compartida para lectura.
- **Escribe** a través de un Apps Script publicado, que corre con tu cuenta.
  Solo agrega filas: nunca borra ni sobrescribe una.

Son seis pasos y se hacen una sola vez.

## 0. Compartir la planilla para lectura

En la planilla: **Compartir → Acceso general → Cualquier persona con el
enlace → Lector**.

Sin esto la app no lee absolutamente nada, aunque el resto esté impecable:
vas a ver un cartel rojo cada siete segundos y todas las listas vacías.

Dejalo en **Lector**, nunca en Editor: la app escribe solo por el Apps
Script, y nadie de afuera tiene que poder tocar una fila.

> Esto hace que cualquiera con el link vea los nombres y los temas anotados,
> porque el id de la planilla viaja en el código de la app. Para un cumple
> está bien, pero tenelo presente.
>
> No lo confundas con **Archivo → Compartir → Publicar en la web**: es otro
> mecanismo y no es el que usa la app.

## 1. Pegar el script en la planilla

1. Abrí la planilla y andá a **Extensiones → Apps Script**.
2. Borrá lo que haya en el editor y pegá todo el contenido de
   [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
3. Guardá con Ctrl+S.

## 2. Crear las pestañas

En el editor de Apps Script, elegí la función **`preparar`** en el
desplegable de arriba y dale a **Ejecutar**.

> **Elegí `preparar`, no `doGet`.** El desplegable viene con la primera
> función del archivo seleccionada, que es `doGet`. Si la ejecutás a mano
> vas a ver `TypeError: Cannot read properties of undefined (reading
> 'parameter')`: `doGet` y `doPost` esperan el objeto de evento de una
> petición HTTP, y ejecutadas desde el editor no lo reciben. El error es
> inofensivo y no toca la planilla.

La primera vez te pide permisos. Ahí aparece una pantalla que dice **"Google
no ha verificado esta aplicación"** y no tiene botón para seguir a la vista:
hay que tocar **Configuración avanzada** abajo a la izquierda y después **Ir
a (nombre del proyecto) (no seguro)**. Es tu propio script sobre tu propia
planilla; el aviso sale porque no está publicado en el Marketplace de Google.

Al terminar vas a ver dos pestañas nuevas, `anotaciones` y `eventos`, con
sus encabezados. Si ya existían, no las toca: solo les agrega las columnas
que falten. Podés volver a ejecutar `preparar` las veces que quieras.

## 3. Habilitar la API de YouTube y sacar la clave

La búsqueda de videos mientras se escribe necesita la YouTube Data API v3.
Son dos cosas distintas y las dos hacen falta:

1. **Habilitar la API.** En <https://console.cloud.google.com/> creá un
   proyecto (o elegí uno), andá a **APIs y servicios → Biblioteca**, buscá
   *YouTube Data API v3* y tocá **Habilitar**.
2. **Crear la clave.** En **APIs y servicios → Credenciales**, tocá **Crear
   credenciales → Clave de API** y copiala.

> Si te salteás el paso 1 y solo creás la clave, YouTube contesta 403 y la
> app te muestra un error que menciona la cuota. No es la cuota: es la API
> sin habilitar.

Después, en el editor de Apps Script: **Configuración del proyecto** (el
engranaje de la izquierda) → **Propiedades del script** → **Agregar
propiedad**.

| Propiedad | Valor |
|---|---|
| `YOUTUBE_API_KEY` | la clave que generaste |

La clave queda del lado de Google y nunca viaja al navegador.

> La cuota gratis son 10.000 unidades por día y cada búsqueda gasta 100, o
> sea unas 100 búsquedas diarias. La app espera 650 ms desde la última tecla
> antes de buscar (eso está en el navegador, en `src/pantallas/Anotarse.jsx`)
> y el script guarda en caché seis horas cada consulta ya hecha, así que dos
> personas que buscan el mismo tema gastan una sola. Aun así, cien búsquedas
> se consumen rápido si mucha gente tipea de a poco: si se agota, la app te
> deja pegar el link del video a mano y todo lo demás sigue funcionando.

## 4. Publicar el script

En el editor: **Implementar → Nueva implementación**. En el diálogo que se
abre, el tipo se elige con el **engranaje que está arriba a la izquierda,
al lado de "Seleccionar tipo"**: tocalo y elegí **Aplicación web**. No es un
ítem de un menú desplegable.

| Campo | Valor |
|---|---|
| Ejecutar como | Yo |
| Quién tiene acceso | **Cualquier usuario** |

Copiá la URL que termina en `/exec`.

> **Cada vez que cambies el código hay que volver a implementar.** Guardar en
> el editor no cambia lo que sirve `/exec`.
>
> Y ojo con cuál de las dos opciones usás:
> - **Nueva implementación** te da una **URL nueva**. Si usás esta, tenés que
>   actualizar `VITE_URL_SCRIPT` en todos lados.
> - **Administrar implementaciones → el lápiz → Versión: Nueva versión** deja
>   **la misma URL** y solo cambia el código. Para actualizar, usá esta.

## 5. Configurar la app

Los tres valores de configuración viven en
[`src/config.js`](src/config.js) y ya apuntan a esta planilla y a este Apps
Script, así que **no hace falta configurar nada para publicar**.

Si algún día cambiás la implementación del script o la planilla, editá esos
valores por defecto, o pisálos con un `.env` en la raíz (copiá `.env.example`):

```
VITE_URL_SCRIPT=https://script.google.com/macros/s/AAAA.../exec
VITE_ID_PLANILLA=1OEiudcnjGCEe-rQsado3YlVUH5MzqOT4Z1b2_Gtmk8E
VITE_CLAVE_PANEL=la-clave-que-quieras
```

Vite lee el `.env` **solo al arrancar**. Si lo creás o lo cambiás con
`npm run dev` corriendo, cortalo y volvé a arrancarlo.

> **Ninguno de los tres es un secreto de verdad.** Los tres terminan
> compilados dentro del JavaScript que descarga cualquiera que abra el sitio,
> y el Apps Script está publicado como "cualquier usuario". Por eso están en
> el repo y no en secretos de GitHub: guardarlos como secretos no escondía
> nada y hacía fallar el deploy cuando faltaban.
>
> Para GitHub Pages podés cargarlos igual como secretos del repositorio
> (`VITE_URL_SCRIPT`, `VITE_ID_PLANILLA`, `VITE_CLAVE_PANEL`) si querés pisar
> los valores por defecto sin tocar el código. Son opcionales.
>
> La clave del Panel sirve para que nadie lo toque sin querer, no para frenar
> a alguien decidido. No reutilices una contraseña.

## Publicar en GitHub Pages

Una sola cosa, y se hace una vez: **Settings → Pages → Build and deployment →
Source: GitHub Actions** (viene en *Deploy from a branch*).

Con eso, cada push a `main` publica solo. También se puede disparar a mano
desde **Actions → Publicar en GitHub Pages → Run workflow**.

> Si el sitio te devuelve `404` para `/src/main.jsx`, Pages sigue en modo
> rama: está sirviendo el código fuente en vez del build.

## Comprobar que quedó bien

**Primero el Apps Script.** Pegá la URL `/exec` en el navegador, sin agregarle
nada. Tiene que contestar algo así:

```json
{"ok":true,"version":2,"planilla":"...","planillaId":"1OEiu...","filas":{"anotaciones":0,"eventos":0},"columnasQueFaltan":{},"youtube":"configurada"}
```

- `filas` con `null` → falta correr `preparar` (paso 2).
- `columnasQueFaltan` con algo adentro → volvé a correr `preparar`.
- `youtube: "falta"` → falta la propiedad del paso 3.
- Te pide iniciar sesión o te muestra permisos → la implementación quedó en
  "solo yo": volvé al paso 4 y ponela en **Cualquier usuario**.
- **Compará `planillaId` con tu `VITE_ID_PLANILLA`.** Si no son iguales, el
  script escribe en una planilla y la app lee de otra: no vas a ver nunca lo
  que se anota. El nombre no alcanza para comparar, dos documentos se pueden
  llamar igual.

**Después la app.** `npm run dev`, abrila y entrá al **Panel** con tu clave.
Arriba a la derecha tiene que decir "Planilla conectada" con el punto verde.
Anotate con un tema: tiene que aparecer una fila nueva en `anotaciones`.

### Si algo no anda

| Lo que ves | Qué pasa |
|---|---|
| "Modo demo" en el Panel | Falta `VITE_URL_SCRIPT`, o el `.env` no se releyó: cortá `npm run dev` y arrancalo de nuevo. |
| Cartel rojo cada 7 segundos, listas vacías, **pero las filas sí aparecen en la planilla** | La planilla no está compartida. Volvé al paso 0. Se escribe bien y no se lee. |
| "La pestaña X no tiene las columnas..." | O falta correr `preparar`, o `VITE_ID_PLANILLA` apunta a otro documento. |
| Se anota, pero nadie aparece en la lista | Fijate en `planillaId` del chequeo de arriba contra `VITE_ID_PLANILLA`. |
| El error de YouTube menciona la cuota apenas empezás | Casi seguro es la API sin habilitar, paso 3.1. |
