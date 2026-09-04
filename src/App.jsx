import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Marco from './componentes/Marco.jsx'
import { Aviso, Cargando } from './componentes/piezas.jsx'
import { construirEstado } from './dominio.js'
import { leerTodo } from './almacen.js'
import { REFRESCO_MS } from './config.js'

import Ruleta from './pantallas/Ruleta.jsx'
import Anotarse from './pantallas/Anotarse.jsx'
import Reproductor from './pantallas/Reproductor.jsx'
import Tributos from './pantallas/Tributos.jsx'
import Ranking from './pantallas/Ranking.jsx'
import Panel from './pantallas/Panel.jsx'

const PANTALLAS = { ruleta: Ruleta, anotarse: Anotarse, reproductor: Reproductor, tributos: Tributos, ranking: Ranking, panel: Panel }
const deHash = () => {
  const h = window.location.hash.replace('#', '').trim()
  return PANTALLAS[h] ? h : 'ruleta'
}

export default function App() {
  const [datos, setDatos] = useState({ anotaciones: [], eventos: [] })
  const [cargando, setCargando] = useState(true)
  const [fallo, setFallo] = useState('')
  const [ultima, setUltima] = useState(0)
  const [pantalla, setPantalla] = useState(deHash)
  const [contexto, setContexto] = useState(null)
  const yaRuteado = useRef(false)
  const pedido = useRef(0)

  const refrescar = useCallback(async () => {
    const mio = ++pedido.current
    try {
      const d = await leerTodo()
      const nuevo = construirEstado(d.anotaciones, d.eventos)
      // Solo la lectura más reciente pinta. Sin esto, una lectura lenta que
      // salió antes de una escritura aterrizaba después y volvía la pantalla
      // al estado viejo: el video se desmontaba solo y el operador creía que
      // no se había guardado.
      if (mio === pedido.current) {
        setDatos(d)
        setUltima(Date.now())
        setFallo('')
      }
      // El valor de retorno se devuelve SIEMPRE, aunque esta lectura ya sea
      // vieja: quien llamó a refrescar después de escribir necesita el estado
      // que su propia escritura provocó.
      return nuevo
    } catch (e) {
      if (mio === pedido.current) setFallo(e.message || 'No se pudo leer la planilla.')
      return null
    } finally {
      if (mio === pedido.current) setCargando(false)
    }
  }, [])

  useEffect(() => {
    refrescar()
    const reloj = setInterval(refrescar, REFRESCO_MS)
    return () => clearInterval(reloj)
  }, [refrescar])

  useEffect(() => {
    const escuchar = () => setPantalla(deHash())
    window.addEventListener('hashchange', escuchar)
    return () => window.removeEventListener('hashchange', escuchar)
  }, [])

  const estado = useMemo(
    () => construirEstado(datos.anotaciones, datos.eventos),
    [datos]
  )

  const ir = useCallback((destino) => {
    setPantalla(destino)
    window.location.hash = destino
    window.scrollTo(0, 0)
  }, [])

  // Si alguien recarga en medio de una canción, la app vuelve al video.
  // Mientras la primera lectura falle no marcamos el ruteo como hecho, así
  // el intento se repite cuando la planilla vuelve a contestar.
  useEffect(() => {
    if (cargando || fallo || yaRuteado.current) return
    yaRuteado.current = true
    if (estado.enCurso && pantalla === 'ruleta') ir('reproductor')
  }, [cargando, fallo, estado.enCurso, pantalla, ir])

  const Pantalla = PANTALLAS[pantalla] || Ruleta

  return (
    <Marco semilla={1312} pie={pantalla === 'ruleta'}>
      {cargando ? (
        <Cargando />
      ) : (
        <>
          {fallo ? (
            <div className="bloque">
              <Aviso color="var(--sangre)">
                {fallo} La app sigue mostrando lo último que pudo leer.
              </Aviso>
            </div>
          ) : null}
          <Pantalla
            estado={estado}
            ir={ir}
            refrescar={refrescar}
            ultima={ultima}
            contexto={contexto}
            setContexto={setContexto}
          />
        </>
      )}
    </Marco>
  )
}
