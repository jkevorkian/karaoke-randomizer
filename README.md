# Karaoke

La máquina que elige quién canta en el cumple de Braian. Un tragamonedas
con estética de Borderlands que sortea entre los anotados, arma los duetos
solo y lleva la cuenta de los tributos.

Sitio estático en GitHub Pages. Google Sheets de base de datos.

## Cómo funciona

**Anotarse.** Cada uno carga su nombre y el tema que quiere cantar.
Mientras escribe, la app busca `<tema> karaoke` en YouTube y muestra los
videos con miniatura para que elija cuál. Puede marcar *"esta la canto
solo"* para no salir en dueto.

**La ruleta.** Tres rodillos: quién, qué tema y el sello del resultado.
Se tira de la palanca y la máquina sortea respetando tres reglas:

- **Reparto parejo.** Mientras quede gente sin cantar, solo sortea entre
  esa gente. Nadie canta dos veces si hay alguien esperando.
- **Sin repetir tema.** Un tema sorteado sale de la bolsa hasta que se
  abra una vuelta nueva.
- **Duetos.** Si dos personas eligieron el mismo tema y ninguna pidió
  cantar sola, salen las dos juntas y el tema se consume una vez. Si una
  pidió cantar sola, cada una tiene su propio turno con ese tema y la otra
  no pierde la chance.

Cuando cae el resultado, arranca el video. Se puede abortar en cualquier
momento: el tema vuelve a la bolsa y nadie queda marcado como que cantó.

**Tributos.** Al terminar se cargan a mano los encendedores levantados.
Van a la actuación entera, así que en un dueto los dos se llevan el mismo
número. La tabla acumula todas las vueltas.

## La planilla, sin borrar nada

Dos pestañas, las dos de solo-append:

| Pestaña | Qué guarda |
|---|---|
| `anotaciones` | una fila por tema anotado |
| `eventos` | el log de la fiesta: vueltas, actuaciones, tributos, bajas |

Nada se borra ni se pisa. Dar de baja una anotación escribe un evento
`anotacion_baja`; abortar una canción escribe `actuacion_abortada`. El
estado actual se calcula reduciendo el log de atrás para adelante, así que
si tres teléfonos escriben al mismo tiempo, ninguno pisa al otro.

Los lee el endpoint público de la planilla (gviz), que no gasta cuota y
va casi en tiempo real. Los escribe un Apps Script que solo hace
`appendRow`.

Como la lectura sale directo del navegador de cada invitado, **la planilla
tiene que estar compartida como "Cualquier persona con el enlace → Lector"**.
Es el paso 0 de [INSTALAR.md](INSTALAR.md) y sin él la app no muestra nada,
aunque escriba bien.

Cada escritura lleva una clave de idempotencia: si el pedido llega a Google
pero la respuesta se pierde, el reintento reconoce la clave y devuelve la
fila que ya escribió en vez de duplicarla. Hace falta porque una fila de más
no se puede borrar.

## Arrancar

```bash
npm install
npm run dev
```

Sin configurar nada arranca en **modo demo**: guarda en el navegador y
trae doce anotados de ejemplo, para poder ver todas las pantallas.

Para enchufarla a la planilla de verdad, seguí [INSTALAR.md](INSTALAR.md).

## Las fotos

Van en [`public/fotos/`](public/fotos/) con nombre fijo, en PNG con fondo
transparente. Están todas listadas en
[`public/fotos/LEEME.txt`](public/fotos/LEEME.txt). Si falta alguna, el
hueco se oculta solo.

## Publicar

Un push a `main` dispara el workflow de
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Lo único que
hay que configurar una vez es **Settings → Pages → Source: GitHub Actions**.

La configuración vive en [`src/config.js`](src/config.js), no en secretos:
los tres valores terminan compilados en el JavaScript público, así que
guardarlos como secretos no escondía nada. Se pueden pisar con secretos del
repositorio o con un `.env`, pero es opcional.

## Rutas

La app usa el hash, así que se puede linkear cada pantalla directo. Para
la fiesta conviene un QR a `#anotarse`.

| Ruta | Pantalla |
|---|---|
| `#ruleta` | la máquina, el menú y el sorteo |
| `#anotarse` | el formulario con búsqueda de YouTube |
| `#reproductor` | el video de la actuación en curso |
| `#tributos` | carga de encendedores |
| `#ranking` | la tabla |
| `#panel` | control de la fiesta, con clave |
