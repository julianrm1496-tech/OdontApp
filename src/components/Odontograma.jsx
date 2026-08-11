import { useState, useEffect } from 'react'

/* Numeración FDI — las cuatro filas siempre visibles, igual que en el papel */
const FILAS = [
  { clase: 'perm', izq: ['18','17','16','15','14','13','12','11'], der: ['21','22','23','24','25','26','27','28'] },
  { clase: 'temp', izq: ['55','54','53','52','51'],                der: ['61','62','63','64','65'] },
  { clase: 'temp', izq: ['85','84','83','82','81'],                der: ['71','72','73','74','75'] },
  { clase: 'perm', izq: ['48','47','46','45','44','43','42','41'], der: ['31','32','33','34','35','36','37','38'] },
]

export const ROJO  = '#D42B1F'
export const AZUL  = '#1B5FAA'
export const VERDE = '#2E8B4A'
const color = (c) => (c === 'bueno' ? AZUL : ROJO)

/* Estados sobre una cara del diente — según la tabla de convenciones */
export const CARAS = [
  { id: 'caries',     nombre: 'Caries',     malo: true,  bueno: false },
  { id: 'obturacion', nombre: 'Obturación', malo: true,  bueno: true  },
  { id: 'sellante',   nombre: 'Sellante',   malo: true,  bueno: true  },
]

/* Estados sobre la pieza completa — según la tabla de convenciones */
export const PIEZAS = [
  { id: 'corona',              nombre: 'Corona',              malo: true,  bueno: true  },
  { id: 'provisional',         nombre: 'Provisional',         malo: true,  bueno: true  },
  { id: 'protesis_removible',  nombre: 'Prótesis removible',  malo: true,  bueno: true  },
  { id: 'perno',                nombre: 'Perno',               malo: true,  bueno: true  },
  { id: 'endodoncia',          nombre: 'Endodoncia',          malo: true,  bueno: true  },
  { id: 'extraccion_indicada', nombre: 'Extracción indicada', malo: true,  bueno: false },
  { id: 'extraido',            nombre: 'Extraído',            malo: false, bueno: true  },
  { id: 'sin_erupcionar',      nombre: 'Sin erupcionar',      malo: false, bueno: true  },
  { id: 'en_erupcion',         nombre: 'En erupción',         malo: false, bueno: true, verde: true },
]

/* ---------- geometría del círculo con 5 sectores ---------- */
const CX = 17, CY = 17, R_OUT = 16, R_IN = 7, R_MID = 11.5
const rad = (d) => (d * Math.PI) / 180
const punto = (r, deg) => [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))]

const RANGOS = { v: [-135, -45], d: [-45, 45], l: [45, 135], m: [135, 225] }
const MEDIO  = { v: -90, d: 0, l: 90, m: 180, o: null }

function sectorPath(desde, hasta) {
  const [x1i, y1i] = punto(R_IN, desde)
  const [x1o, y1o] = punto(R_OUT, desde)
  const [x2o, y2o] = punto(R_OUT, hasta)
  const [x2i, y2i] = punto(R_IN, hasta)
  return `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${R_OUT} ${R_OUT} 0 0 1 ${x2o} ${y2o} `
       + `L ${x2i} ${y2i} A ${R_IN} ${R_IN} 0 0 0 ${x1i} ${y1i} Z`
}

function posicionCara(cara) {
  if (cara === 'o') return [CX, CY]
  return punto(R_MID, MEDIO[cara])
}

const NOMBRE_CARA = { v: 'vestibular', d: 'distal', l: 'lingual', m: 'mesial', o: 'oclusal' }

/* ---------- símbolo real dentro de cada botón del menú ---------- */
function IconoMini({ id, c }) {
  const t = { font: '700 10px Archivo, sans-serif' }
  switch (id) {
    case 'caries':      return <circle cx="9" cy="9" r="3" fill={c} />
    case 'obturacion':  return <circle cx="9" cy="9" r="6.5" fill={c} />
    case 'sellante':    return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>S</text>
    case 'corona':      return <circle cx="9" cy="9" r="7" fill="none" stroke={c} strokeWidth="2" />
    case 'provisional': return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>P</text>
    case 'perno':       return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>N</text>
    case 'extraido':    return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>I</text>
    case 'protesis_removible': return <g>
      <line x1="3" y1="7" x2="15" y2="7" stroke={c} strokeWidth="1.8" />
      <line x1="3" y1="11" x2="15" y2="11" stroke={c} strokeWidth="1.8" />
    </g>
    case 'endodoncia':  return <polygon points="9,3 15,15 3,15" fill="none" stroke={c} strokeWidth="1.8" />
    case 'extraccion_indicada': return <g>
      <line x1="3" y1="3" x2="15" y2="15" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="3" x2="3" y2="15" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </g>
    case 'sin_erupcionar': return <line x1="3" y1="9" x2="15" y2="9" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    case 'en_erupcion': return <path d="M9 15 V3 M5 7 L9 3 L13 7" fill="none" stroke={c}
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    default: return null
  }
}

/* ---------- un diente ---------- */
function Diente({ pieza, estados, onTocar, temporal }) {
  const d = estados.diente
  const est = d?.estado
  const col = d ? (est === 'en_erupcion' ? VERDE : color(d.condicion)) : null
  const tam = temporal ? 30 : 34

  const rellenoSector = (cara) => {
    const e = estados[cara]
    return e?.estado === 'obturacion' ? color(e.condicion) : 'transparent'
  }

  const marcadorSector = (cara) => {
    const e = estados[cara]
    if (!e || e.estado === 'obturacion') return null
    const [x, y] = posicionCara(cara)
    if (e.estado === 'caries') return <circle cx={x} cy={y} r="2.4" fill={ROJO} />
    if (e.estado === 'sellante')
      return <text x={x} y={y + 3} textAnchor="middle" fill={color(e.condicion)}
        style={{ font: '600 9px Archivo, sans-serif' }}>S</text>
    return null
  }

  return (
    <div className="diente">
      <svg viewBox="0 0 34 34" style={{ width: tam, height: tam }}
        role="img" aria-label={`Pieza ${pieza}`}>
        {Object.entries(RANGOS).map(([c, [d1, d2]]) => (
          <path key={c} className="cara" d={sectorPath(d1, d2)}
            fill={rellenoSector(c)} stroke="var(--line)" strokeWidth="1"
            onClick={(e) => onTocar(e, pieza, c)} />
        ))}
        <circle className="cara" cx={CX} cy={CY} r={R_IN}
          fill={rellenoSector('o')} stroke="var(--line)" strokeWidth="1"
          onClick={(e) => onTocar(e, pieza, 'o')} />

        {['v','d','l','m','o'].map(c => <g key={c}>{marcadorSector(c)}</g>)}

        {est === 'corona' && (
          <circle cx={CX} cy={CY} r="15" fill="none" stroke={col} strokeWidth="2.4" />
        )}
        {est === 'protesis_removible' && <>
          <line x1="5" y1="14" x2="29" y2="14" stroke={col} strokeWidth="2.2" />
          <line x1="5" y1="20" x2="29" y2="20" stroke={col} strokeWidth="2.2" />
        </>}
        {est === 'extraccion_indicada' && <>
          <line x1="3" y1="3" x2="31" y2="31" stroke={ROJO} strokeWidth="2.6" strokeLinecap="round" />
          <line x1="31" y1="3" x2="3" y2="31" stroke={ROJO} strokeWidth="2.6" strokeLinecap="round" />
        </>}
        {est === 'sin_erupcionar' && (
          <line x1="5" y1="17" x2="29" y2="17" stroke={AZUL} strokeWidth="2.6" strokeLinecap="round" />
        )}
        {est === 'endodoncia' && <polygon points="17,6 26,24 8,24" fill="none" stroke={col} strokeWidth="2.2" />}
        {est === 'en_erupcion' && (
          <path d="M17 27 V7 M11 13 L17 7 L23 13" fill="none" stroke={VERDE}
            strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {est === 'perno' && (
          <text x="17" y="23" textAnchor="middle" fill={col}
            style={{ font: '600 17px Archivo, sans-serif' }}>N</text>
        )}
        {est === 'provisional' && (
          <text x="17" y="23" textAnchor="middle" fill={col}
            style={{ font: '600 17px Archivo, sans-serif' }}>P</text>
        )}
        {est === 'extraido' && (
          <text x="17" y="23" textAnchor="middle" fill={AZUL}
            style={{ font: '600 17px Archivo, sans-serif' }}>I</text>
        )}
      </svg>

      <button className="num-pieza" onClick={(e) => onTocar(e, pieza, 'diente')}
        title="Marcar la pieza completa" style={{ color: col || undefined }}>
        {pieza}
      </button>
    </div>
  )
}

/* ---------- menú contextual ---------- */
function Menu({ menu, marcaActual, onElegir, onBorrar, onCerrar }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const opciones = menu.cara === 'diente' ? PIEZAS : CARAS
  const ancho = 218
  const left = Math.min(menu.x, window.innerWidth - ancho - 12)
  const top  = Math.min(menu.y + 8, window.innerHeight - 340)

  return (
    <>
      <div className="odo-overlay" onClick={onCerrar} />
      <div className="odo-menu" style={{ left, top, width: ancho }}>
        <p className="odo-menu-titulo">
          Pieza {menu.pieza}{menu.cara !== 'diente' && ` · ${NOMBRE_CARA[menu.cara]}`}
        </p>
        {marcaActual && (
          <>
            <button className="borrar" onClick={onBorrar}>Borrar marca actual</button>
            <hr />
          </>
        )}
        {opciones.map(o => (
          <div className="fila" key={o.id}>
            <span className="lab">{o.nombre}</span>
            <div className="dots">
              {o.verde ? (
                <button className="dot" aria-label={`${o.nombre} — en erupción`}
                  onClick={() => onElegir(o.id, 'bueno')}>
                  <svg viewBox="0 0 18 18" width="16" height="16"><IconoMini id={o.id} c={VERDE} /></svg>
                </button>
              ) : <>
                {o.malo && (
                  <button className="dot" aria-label={`${o.nombre} — rojo`}
                    onClick={() => onElegir(o.id, 'malo')}>
                    <svg viewBox="0 0 18 18" width="16" height="16"><IconoMini id={o.id} c={ROJO} /></svg>
                  </button>
                )}
                {o.bueno && (
                  <button className="dot" aria-label={`${o.nombre} — azul`}
                    onClick={() => onElegir(o.id, 'bueno')}>
                    <svg viewBox="0 0 18 18" width="16" height="16"><IconoMini id={o.id} c={AZUL} /></svg>
                  </button>
                )}
              </>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- odontograma completo ---------- */
export default function Odontograma({ datos, onCambio }) {
  const [menu, setMenu] = useState(null)   // { pieza, cara, x, y }

  const abrir = (e, pieza, cara) => {
    e.stopPropagation()
    setMenu({ pieza, cara, x: e.clientX, y: e.clientY })
  }

  const marcaActual = menu ? datos[menu.pieza]?.[menu.cara] : null

  const elegir = (estado, condicion) => {
    onCambio(menu.pieza, menu.cara, { estado, condicion })
    setMenu(null)
  }

  const borrar = () => {
    onCambio(menu.pieza, menu.cara, null)
    setMenu(null)
  }

  const contar = (id) => Object.values(datos)
    .reduce((n, caras) => n + Object.values(caras).filter(e => e?.estado === id).length, 0)

  return (
    <>
      <div className="arcadas">
        {FILAS.map((fila, i) => (
          <div className="arch" key={i}>
            <div className="quad">
              {[fila.izq, fila.der].map((grupo, j) => (
                <div className="teeth" key={j}>
                  {grupo.map(pz => (
                    <Diente key={pz} pieza={pz} estados={datos[pz] || {}}
                      temporal={fila.clase === 'temp'} onTocar={abrir} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="legend">
        <div><span className="sw" style={{ background: ROJO, borderColor: ROJO }} />Rojo · por hacer o mal estado</div>
        <div><span className="sw" style={{ background: AZUL, borderColor: AZUL }} />Azul · hecho o buen estado</div>
        <div><span className="sw" style={{ background: VERDE, borderColor: VERDE }} />Verde · en erupción</div>
        <div>Caries <strong>{contar('caries')}</strong></div>
        <div>Obturaciones <strong>{contar('obturacion')}</strong></div>
      </div>

      <p className="hint">Toque cualquier sector o el número del diente para ver las opciones.</p>

      {menu && (
        <Menu menu={menu} marcaActual={marcaActual}
          onElegir={elegir} onBorrar={borrar} onCerrar={() => setMenu(null)} />
      )}
    </>
  )
}
