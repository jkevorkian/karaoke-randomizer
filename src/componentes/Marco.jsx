import Splat from './Splat.jsx'

export default function Marco({ semilla, children, pie = true }) {
  return (
    <>
      <div className="lienzo">
        <Splat semilla={semilla} tenue={!pie} />
        <div className="mugre" aria-hidden="true" />
        <div className="escena">{children}</div>
        {pie ? (
          <div className="pie">
            <span className="gold">
              <span className="capa sombra" aria-hidden="true">Tragakaraoke</span>
              <span className="capa borde" aria-hidden="true">Tragakaraoke</span>
              <span className="capa relleno">Tragakaraoke</span>
            </span>
            <div><span className="banda">La máquina que elige <i>quién canta</i></span></div>
          </div>
        ) : null}
      </div>
      <div className="grano" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg">
          <filter id="grano-fx">
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grano-fx)" opacity="0.55" />
        </svg>
      </div>
    </>
  )
}
