import { pesos } from '../lib/format'

/* Gráfico de barras en SVG, sin librerías.
   datos: [{ etiqueta: 'Ene', valor: 120000 }, ...] */
export function Barras({ datos, alto = 140, formato = pesos }) {
  if (!datos || datos.length === 0) {
    return <p className="nota">Sin datos todavía.</p>
  }

  const max = Math.max(...datos.map(d => d.valor), 1)
  const ancho = 100 / datos.length

  return (
    <div className="grafico">
      <div className="barras" style={{ height: alto }}>
        {datos.map((d, i) => {
          const pct = (d.valor / max) * 100
          return (
            <div className="barra-col" key={i} style={{ width: `${ancho}%` }}>
              <div className="barra-valor">{d.valor > 0 ? formato(d.valor) : ''}</div>
              <div className="barra-pista">
                <div className="barra" style={{ height: `${Math.max(pct, d.valor > 0 ? 3 : 0)}%` }} />
              </div>
              <div className="barra-etiqueta">{d.etiqueta}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Barra de progreso simple: hechos / total */
export function Progreso({ hechos, total }) {
  const pct = total > 0 ? Math.round((hechos / total) * 100) : 0
  return (
    <div className="progreso-wrap">
      <div className="progreso-pista">
        <div className="progreso-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progreso-txt">{hechos} de {total}</span>
    </div>
  )
}
