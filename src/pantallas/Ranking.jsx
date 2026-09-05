import Foto from '../componentes/Foto.jsx'
import { Aviso } from '../componentes/piezas.jsx'
import { normalizar } from '../dominio.js'
import { CUMPLEANERO } from '../config.js'

const COLORES = ['var(--oro)', 'var(--acero-lo)', 'var(--oxido, #8A4A1E)']

export default function Ranking({ estado, ir }) {
  const tabla = estado.ranking

  return (
    <>
      <div className="cabecera">
        <button className="volver" onClick={() => ir('ruleta')}>◀ Volver</button>
        <h2 className="bl">Tabla de tributos</h2>
      </div>

      {tabla.length === 0 ? (
        <Aviso color="var(--oro)">
          Todavía no cantó nadie. Apenas termine la primera actuación y le carguen los tributos, acá aparece la tabla.
        </Aviso>
      ) : (
        <div className="podio">
          <div className="tabla-caja">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Puesto</th>
                  <th>Quién</th>
                  <th style={{ textAlign: 'right' }}>Temas</th>
                  <th style={{ textAlign: 'right' }}>Tributos</th>
                </tr>
              </thead>
              <tbody>
                {tabla.map((f, i) => (
                  <tr key={f.persona} style={{ '--c': COLORES[i] || 'var(--acero-lo)' }}>
                    <td className="pos" data-etiqueta="Puesto">{i + 1}º</td>
                    <td className="nom" data-etiqueta="Quién">
                      {f.persona}
                      {normalizar(f.persona) === normalizar(CUMPLEANERO)
                        ? <span className="pastilla" style={{ '--c': 'var(--perla)', marginLeft: 8 }}>El cumpleañero</span>
                        : null}
                    </td>
                    <td className="num" data-etiqueta="Temas">{f.temas}</td>
                    <td className="num" data-etiqueta="Tributos"><b>{f.tributos}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Foto archivo="foto-05.jpg" clase="der corona" pista="corona al primero" enfoque="50% 24%" />
        </div>
      )}
    </>
  )
}
