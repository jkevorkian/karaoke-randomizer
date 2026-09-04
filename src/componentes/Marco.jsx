import Splat from './Splat.jsx'

export default function Marco({ semilla, children, pie = true }) {
  // El grano ya no es una capa aparte con filtro SVG: se dibuja una sola vez
  // dentro del canvas del manchón. Un filtro fijo a pantalla completa con
  // mix-blend-mode obliga a recomponer la página entera en cada frame.
  return (
    <>
      <div className="lienzo">
        <Splat semilla={semilla} tenue={!pie} />
        <div className="mugre" aria-hidden="true" />
        <div className="escena">{children}</div>
        {pie ? (
          <div className="pie">
            <span className="gold">
              <span className="capa sombra" aria-hidden="true">Karaoke</span>
              <span className="capa borde" aria-hidden="true">Karaoke</span>
              <span className="capa relleno">Karaoke</span>
            </span>
            <div><span className="banda">ajamti</span></div>
          </div>
        ) : null}
      </div>
    </>
  )
}
