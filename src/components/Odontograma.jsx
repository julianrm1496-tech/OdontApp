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
export const AZUL_OSCURO = '#0A1E42'
export const VERDE = '#2E8B4A'
export const NEGRO = '#000000'
const color = (c) => (c === 'bueno' ? AZUL : ROJO)

/* Estados sobre una cara del diente — según la tabla de convenciones.
   "verde": true = una sola opción fija en verde.
   "existente": true = agrega un 3er punto, azul oscuro, para "el paciente ya
   la traía" (a diferencia de "bueno" = la hizo la doctora en esta consulta). */
export const CARAS = [
  { id: 'caries',     nombre: 'Caries',     malo: true,  bueno: false },
  { id: 'resina',     nombre: 'Resina',     malo: true,  bueno: true, existente: true },
  { id: 'amalgama',   nombre: 'Amalgama',   malo: true,  bueno: true, existente: true },
  { id: 'sellante',   nombre: 'Sellante',   malo: true,  bueno: true  },
  { id: 'desgaste',   nombre: 'Desgaste',   malo: false, bueno: false, verde: true },
]

/* Estados sobre la pieza completa — según la tabla de convenciones.
   "negro": true = una sola opción fija en negro. "verde": true = fija en verde. */
export const PIEZAS = [
  { id: 'corona',              nombre: 'Corona',              malo: true,  bueno: true  },
  { id: 'provisional',         nombre: 'Provisional',         malo: true,  bueno: true  },
  { id: 'protesis_removible',  nombre: 'Prótesis removible',  malo: true,  bueno: true  },
  { id: 'perno',                nombre: 'Perno',               malo: true,  bueno: true  },
  { id: 'endodoncia',          nombre: 'Endodoncia',          malo: true,  bueno: true  },
  { id: 'extraccion_indicada', nombre: 'Extracción indicada', malo: true,  bueno: false },
  { id: 'implante',            nombre: 'Implante',            malo: true,  bueno: true  },
  { id: 'retenido',            nombre: 'Retenedor',           malo: true,  bueno: true  },
  { id: 'extraido',            nombre: 'Extraído',            malo: false, bueno: false, negro: true },
  { id: 'ausente',             nombre: 'Ausente',             malo: false, bueno: false, negro: true },
  { id: 'sin_erupcionar',      nombre: 'Sin erupcionar',      malo: false, bueno: false, negro: true },
  { id: 'en_erupcion',         nombre: 'En erupción',         malo: false, bueno: false, verde: true },
  { id: 'sano',                nombre: 'Sano',                malo: false, bueno: true  },
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

/* colorDe: color real que corresponde a una marca, según su tipo */
function colorDe(estado, condicion) {
  if (estado === 'en_erupcion' || estado === 'desgaste') return VERDE
  if (condicion === 'negro') return NEGRO
  if (condicion === 'verde') return VERDE
  if (condicion === 'existente') return AZUL_OSCURO
  return color(condicion)
}

/* ---------- símbolo real dentro de cada botón del menú ---------- */
function IconoMini({ id, c }) {
  const t = { font: '700 10px Archivo, sans-serif' }
  switch (id) {
    case 'caries':      return <circle cx="9" cy="9" r="3" fill={c} />
    case 'resina':      return <circle cx="9" cy="9" r="6.5" fill={c} />
    case 'amalgama': {
      const cid = 'clip-mini-amalgama-' + c.replace('#', '')
      return <g>
        <clipPath id={cid}><circle cx="9" cy="9" r="6.5" /></clipPath>
        <g clipPath={`url(#${cid})`}>
          {[-6,-3,0,3,6,9,12,15,18,21,24].map(pos => (
            <line key={pos} x1={pos - 6} y1="18" x2={pos + 1.5} y2="0" stroke={c} strokeWidth="1.1" />
          ))}
        </g>
      </g>
    }
    case 'desgaste':    return <circle cx="9" cy="9" r="6.5" fill={c} />
    case 'sellante':    return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>S</text>
    case 'sano':        return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>S</text>
    case 'corona':      return <circle cx="9" cy="9" r="7" fill="none" stroke={c} strokeWidth="2" />
    case 'provisional': return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>P</text>
    case 'perno':       return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>N</text>
    case 'protesis_removible': return <g>
      <line x1="3" y1="7" x2="15" y2="7" stroke={c} strokeWidth="1.8" />
      <line x1="3" y1="11" x2="15" y2="11" stroke={c} strokeWidth="1.8" />
    </g>
    case 'endodoncia':  return <polygon points="9,3 15,15 3,15" fill="none" stroke={c} strokeWidth="1.8" />
    case 'extraccion_indicada': return <g>
      <line x1="3" y1="3" x2="15" y2="15" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="3" x2="3" y2="15" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </g>
    case 'implante': return <g>
      <line x1="9" y1="4" x2="9" y2="14" stroke={c} strokeWidth="1.8" />
      <line x1="5" y1="4" x2="13" y2="4" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="5" y1="14" x2="13" y2="14" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </g>
    case 'retenido': return <line x1="3" y1="9" x2="15" y2="9" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    case 'sin_erupcionar': return <path d="M4 13 L9 5 L14 13" fill="none" stroke={c}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    case 'ausente': return <text x="9" y="12.5" textAnchor="middle" fill={c} style={t}>A</text>
    case 'extraido': return <g>
      <line x1="4" y1="4" x2="14" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="4" x2="4" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </g>
    case 'en_erupcion': return <path d="M9 15 V3 M5 7 L9 3 L13 7" fill="none" stroke={c}
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    default: return null
  }
}

/* ---------- símbolo grande sobre la pieza completa, según estado ---------- */
function SimboloPieza({ estado, col }) {
  switch (estado) {
    case 'corona':
      return <circle cx={CX} cy={CY} r="15" fill="none" stroke={col} strokeWidth="2.4" />
    case 'protesis_removible':
      return <>
        <line x1="5" y1="14" x2="29" y2="14" stroke={col} strokeWidth="2.2" />
        <line x1="5" y1="20" x2="29" y2="20" stroke={col} strokeWidth="2.2" />
      </>
    case 'extraccion_indicada':
      return <>
        <line x1="3" y1="3" x2="31" y2="31" stroke={ROJO} strokeWidth="2.6" strokeLinecap="round" />
        <line x1="31" y1="3" x2="3" y2="31" stroke={ROJO} strokeWidth="2.6" strokeLinecap="round" />
      </>
    case 'sin_erupcionar':
      return <path d="M8 24 L17 8 L26 24" fill="none" stroke={NEGRO}
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    case 'retenido':
      return <line x1="5" y1="17" x2="29" y2="17" stroke={col} strokeWidth="2.6" strokeLinecap="round" />
    case 'implante':
      return <>
        <line x1="17" y1="8" x2="17" y2="26" stroke={col} strokeWidth="2.2" />
        <line x1="10" y1="8" x2="24" y2="8" stroke={col} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="10" y1="26" x2="24" y2="26" stroke={col} strokeWidth="2.2" strokeLinecap="round" />
      </>
    case 'ausente':
      return <text x="17" y="23" textAnchor="middle" fill={NEGRO}
        style={{ font: '700 17px Archivo, sans-serif' }}>A</text>
    case 'sano':
      return <text x="17" y="23" textAnchor="middle" fill={col}
        style={{ font: '700 17px Archivo, sans-serif' }}>S</text>
    case 'endodoncia':
      return <polygon points="17,6 26,24 8,24" fill="none" stroke={col} strokeWidth="2.2" />
    case 'en_erupcion':
      return <path d="M17 27 V7 M11 13 L17 7 L23 13" fill="none" stroke={VERDE}
        strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    case 'perno':
      return <text x="17" y="23" textAnchor="middle" fill={col}
        style={{ font: '600 17px Archivo, sans-serif' }}>N</text>
    case 'provisional':
      return <text x="17" y="23" textAnchor="middle" fill={col}
        style={{ font: '600 17px Archivo, sans-serif' }}>P</text>
    case 'extraido':
      return <>
        <line x1="8" y1="8" x2="26" y2="26" stroke={NEGRO} strokeWidth="2.6" strokeLinecap="round" />
        <line x1="26" y1="8" x2="8" y2="26" stroke={NEGRO} strokeWidth="2.6" strokeLinecap="round" />
      </>
    default: return null
  }
}

/* ---------- un diente ---------- */
function Diente({ pieza, estados, onTocar, temporal, seleccionable, seleccionado, onSeleccionar }) {
  const marcasPieza = estados.diente || []       // array de {estado, condicion}
  const primeraMarca = marcasPieza[0]
  const colNumero = primeraMarca ? colorDe(primeraMarca.estado, primeraMarca.condicion) : null
  const tam = temporal ? 30 : 34

  const marcasCara = (cara) => estados[cara] || []

  const rellenoSector = (cara) => {
    const marcas = marcasCara(cara)
    const rellena = marcas.find(m => m.estado === 'resina' || m.estado === 'desgaste')
    return rellena ? colorDe(rellena.estado, rellena.condicion) : 'transparent'
  }

  const marcaAmalgama = (cara) => marcasCara(cara).find(m => m.estado === 'amalgama')

  const marcadoresSector = (cara) => {
    const marcas = marcasCara(cara).filter(m => !['resina', 'desgaste', 'amalgama'].includes(m.estado))
    if (marcas.length === 0) return null
    const [x, y] = posicionCara(cara)
    const dx = marcas.length > 1 ? 4 : 0
    return marcas.slice(0, 2).map((m, i) => {
      const offsetX = x + (i === 0 ? -dx : dx)
      if (m.estado === 'caries') return <circle key={i} cx={offsetX} cy={y} r="2.4" fill={ROJO} />
      if (m.estado === 'sellante')
        return <text key={i} x={offsetX} y={y + 3} textAnchor="middle" fill={color(m.condicion)}
          style={{ font: '600 9px Archivo, sans-serif' }}>S</text>
      return null
    })
  }

  const click = (e) => {
    if (seleccionable) { e.stopPropagation(); onSeleccionar(pieza); return }
    onTocar(e, pieza, 'diente')
  }

  return (
    <div className="diente">
      <svg viewBox="0 0 34 34" style={{ width: tam, height: tam }}
        role="img" aria-label={`Pieza ${pieza}`}>
        <defs>
          {['v','d','l','m'].map(c => (
            <clipPath key={c} id={`clip-${pieza}-${c}`}><path d={sectorPath(...RANGOS[c])} /></clipPath>
          ))}
          <clipPath id={`clip-${pieza}-o`}><circle cx={CX} cy={CY} r={R_IN} /></clipPath>
        </defs>

        {Object.entries(RANGOS).map(([c, [d1, d2]]) => (
          <path key={c} className="cara" d={sectorPath(d1, d2)}
            fill={rellenoSector(c)} stroke="var(--line)" strokeWidth="1"
            onClick={(e) => seleccionable ? click(e) : onTocar(e, pieza, c)} />
        ))}
        <circle className="cara" cx={CX} cy={CY} r={R_IN}
          fill={rellenoSector('o')} stroke="var(--line)" strokeWidth="1"
          onClick={(e) => seleccionable ? click(e) : onTocar(e, pieza, 'o')} />

        {['v','d','l','m','o'].map(c => {
          const am = marcaAmalgama(c)
          if (!am) return null
          const col = colorDe(am.estado, am.condicion)
          return (
            <g key={'am-' + c} clipPath={`url(#clip-${pieza}-${c})`} style={{ pointerEvents: 'none' }}>
              {[-8,-5,-2,1,4,7,10,13,16,19,22,25,28,31,34,37,40,43].map(pos => (
                <line key={pos} x1={pos - 12} y1={34} x2={pos + 3} y2={0} stroke={col} strokeWidth="1.3" />
              ))}
            </g>
          )
        })}

        {['v','d','l','m','o'].map(c => <g key={c}>{marcadoresSector(c)}</g>)}

        {marcasPieza.map((m, i) => (
          <SimboloPieza key={i} estado={m.estado} col={colorDe(m.estado, m.condicion)} />
        ))}
      </svg>

      <button className={'num-pieza' + (seleccionado ? ' num-pieza-sel' : '')} onClick={click}
        title={seleccionable ? 'Seleccionar esta pieza' : 'Marcar la pieza completa'}
        style={{ color: colNumero || undefined }}>
        {pieza}
      </button>
    </div>
  )
}

/* ---------- menú contextual (multi-selección con casillas) ---------- */
function Menu({ menu, marcasActuales, onGuardar, onBorrarTodo, onCerrar }) {
  // selección local: mapa estado -> condicion (o ausente si no está marcado)
  const [sel, setSel] = useState(() => {
    const m = {}
    marcasActuales.forEach(x => { m[x.estado] = x.condicion })
    return m
  })

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const opciones = menu.cara === 'diente' ? PIEZAS : CARAS
  const ancho = 236
  const left = Math.min(menu.x, window.innerWidth - ancho - 12)
  const top  = Math.min(menu.y + 8, window.innerHeight - 380)

  const toggle = (estado, condicion) => {
    setSel(s => {
      const actual = s[estado]
      const nuevo = { ...s }
      if (actual === condicion) delete nuevo[estado]   // ya estaba así → lo quita
      else nuevo[estado] = condicion                    // lo agrega o le cambia el color
      return nuevo
    })
  }

  return (
    <>
      <div className="odo-overlay" onClick={onCerrar} />
      <div className="odo-menu" style={{ left, top, width: ancho }}>
        <p className="odo-menu-titulo">
          {menu.lote ? `${menu.nPiezas} piezas seleccionadas` : `Pieza ${menu.pieza}${menu.cara !== 'diente' ? ` · ${NOMBRE_CARA[menu.cara]}` : ''}`}
        </p>
        <p className="odo-menu-sub">Marca las que apliquen — pueden ser varias a la vez</p>
        {marcasActuales.length > 0 && !menu.lote && (
          <>
            <button className="borrar" onClick={onBorrarTodo}>Borrar todas las marcas</button>
            <hr />
          </>
        )}
        {opciones.map(o => {
          const activo = sel[o.id] !== undefined
          return (
            <div className={'fila' + (activo ? ' fila-activa' : '')} key={o.id}>
              <span className="lab">{o.nombre}</span>
              <div className="dots">
                {o.verde ? (
                  <button className={'dot' + (sel[o.id] === 'verde' ? ' dot-on' : '')}
                    aria-label={`${o.nombre} — verde`} onClick={() => toggle(o.id, 'verde')}>
                    <svg viewBox="0 0 18 18" width="16" height="16"><IconoMini id={o.id} c={VERDE} /></svg>
                  </button>
                ) : o.negro ? (
                  <button className={'dot' + (sel[o.id] === 'negro' ? ' dot-on' : '')}
                    aria-label={`${o.nombre} — negro`} onClick={() => toggle(o.id, 'negro')}>
                    <svg viewBox="0 0 18 18" width="16" height="16"><IconoMini id={o.id} c={NEGRO} /></svg>
                  </button>
                ) : <>
                  {o.malo && (
                    <button className={'dot' + (sel[o.id] === 'malo' ? ' dot-on' : '')}
                      aria-label={`${o.nombre} — rojo`} onClick={() => toggle(o.id, 'malo')}>
                      <svg viewBox="0 0 18 18" width="16" height="16"><IconoMini id={o.id} c={ROJO} /></svg>
                    </button>
                  )}
                  {o.bueno && (
                    <button className={'dot' + (sel[o.id] === 'bueno' ? ' dot-on' : '')}
                      aria-label={`${o.nombre} — azul`} onClick={() => toggle(o.id, 'bueno')}>
                      <svg viewBox="0 0 18 18" width="16" height="16"><IconoMini id={o.id} c={AZUL} /></svg>
                    </button>
                  )}
                  {o.existente && (
                    <button className={'dot' + (sel[o.id] === 'existente' ? ' dot-on' : '')}
                      aria-label={`${o.nombre} — ya la traía`} title="Ya la traía (no la hizo la doctora)"
                      onClick={() => toggle(o.id, 'existente')}>
                      <svg viewBox="0 0 18 18" width="16" height="16"><IconoMini id={o.id} c={AZUL_OSCURO} /></svg>
                    </button>
                  )}
                </>}
              </div>
            </div>
          )
        })}
        <div className="odo-menu-botones">
          <button className="act ghost sm" onClick={onCerrar}>Cancelar</button>
          <button className="act sm" onClick={() => onGuardar(sel)}>Guardar</button>
        </div>
      </div>
    </>
  )
}

/* ---------- odontograma completo ---------- */
export default function Odontograma({ datos, onCambio }) {
  const [menu, setMenu] = useState(null)   // { pieza, cara, x, y }
  const [editandoNota, setEditandoNota] = useState(false)
  const notaGeneral = datos?.general?.general?.[0]?.condicion || ''
  const [borradorNota, setBorradorNota] = useState(notaGeneral)
  const [modoMultiple, setModoMultiple] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])

  const abrirNota = () => { setBorradorNota(notaGeneral); setEditandoNota(true) }
  const guardarNota = () => {
    const texto = borradorNota.trim()
    onCambio('general', 'general', 'nota', texto || null)
    setEditandoNota(false)
  }

  const abrir = (e, pieza, cara) => {
    e.stopPropagation()
    setMenu({ pieza, cara, x: e.clientX, y: e.clientY })
  }

  const toggleSeleccion = (pieza) => {
    setSeleccionados(s => s.includes(pieza) ? s.filter(p => p !== pieza) : [...s, pieza])
  }

  const abrirAplicarLote = (e) => {
    setMenu({ pieza: null, cara: 'diente', x: e.clientX, y: e.clientY, lote: true, nPiezas: seleccionados.length })
  }

  const marcasActuales = menu && !menu.lote ? (datos[menu.pieza]?.[menu.cara] || []) : []

  const guardarMenu = (seleccion) => {
    // seleccion: { estado: condicion, ... } — el estado completo que debe quedar marcado
    if (menu.lote) {
      seleccionados.forEach(pieza => {
        const actuales = datos[pieza]?.diente || []
        actuales.forEach(m => { if (seleccion[m.estado] === undefined) onCambio(pieza, 'diente', m.estado, null) })
        Object.entries(seleccion).forEach(([estado, condicion]) => onCambio(pieza, 'diente', estado, condicion))
      })
      setSeleccionados([])
      setModoMultiple(false)
    } else {
      const actuales = marcasActuales
      actuales.forEach(m => { if (seleccion[m.estado] === undefined) onCambio(menu.pieza, menu.cara, m.estado, null) })
      Object.entries(seleccion).forEach(([estado, condicion]) => onCambio(menu.pieza, menu.cara, estado, condicion))
    }
    setMenu(null)
  }

  const borrarTodo = () => {
    marcasActuales.forEach(m => onCambio(menu.pieza, menu.cara, m.estado, null))
    setMenu(null)
  }

  const contar = (id) => Object.values(datos)
    .reduce((n, caras) => n + Object.values(caras)
      .reduce((m, arr) => m + (Array.isArray(arr) ? arr.filter(e => e?.estado === id).length : 0), 0), 0)

  return (
    <>
      {editandoNota ? (
        <div className="odo-nota editando">
          <textarea value={borradorNota} onChange={e => setBorradorNota(e.target.value)}
            placeholder="Ej: Paciente bruxista, usa férula nocturna. Sensibilidad generalizada en cuadrante superior derecho."
            rows={3} autoFocus />
          <div className="odo-nota-botones">
            <button className="act ghost sm" onClick={() => setEditandoNota(false)}>Cancelar</button>
            <button className="act sm" onClick={guardarNota}>Guardar nota</button>
          </div>
        </div>
      ) : notaGeneral ? (
        <div className="odo-nota">
          <p className="odo-nota-titulo">Nota del odontograma</p>
          <p className="odo-nota-texto">{notaGeneral}</p>
          <button className="act ghost sm" onClick={abrirNota}>Editar nota</button>
        </div>
      ) : (
        <button className="odo-nota-agregar" onClick={abrirNota}>+ Agregar nota general del odontograma</button>
      )}

      <div className="odo-modo-multiple">
        <span>Modo selección múltiple</span>
        <button className={'odo-toggle' + (modoMultiple ? ' on' : '')}
          onClick={() => { setModoMultiple(m => !m); setSeleccionados([]) }}
          aria-label="Activar o desactivar el modo de selección múltiple" />
      </div>

      <div className="arcadas">
        {FILAS.map((fila, i) => (
          <div className="arch" key={i}>
            <div className="quad">
              {[fila.izq, fila.der].map((grupo, j) => (
                <div className="teeth" key={j}>
                  {grupo.map(pz => (
                    <Diente key={pz} pieza={pz} estados={datos[pz] || {}}
                      temporal={fila.clase === 'temp'} onTocar={abrir}
                      seleccionable={modoMultiple} seleccionado={seleccionados.includes(pz)}
                      onSeleccionar={toggleSeleccion} />
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
        <div><span className="sw" style={{ background: VERDE, borderColor: VERDE }} />Verde · en erupción o desgaste</div>
        <div>Caries <strong>{contar('caries')}</strong></div>
        <div>Resinas <strong>{contar('resina')}</strong></div>
        <div>Amalgamas <strong>{contar('amalgama')}</strong></div>
      </div>

      <p className="hint">
        {modoMultiple
          ? 'Toque los números de las piezas que quiera marcar igual, luego aplique el estado.'
          : 'Toque cualquier sector o el número del diente para ver las opciones. Puede marcar varios estados a la vez.'}
      </p>

      {modoMultiple && seleccionados.length > 0 && (
        <div className="odo-barra-lote">
          <span>{seleccionados.length} {seleccionados.length === 1 ? 'pieza seleccionada' : 'piezas seleccionadas'}</span>
          <button className="act sm" onClick={abrirAplicarLote}>Aplicar estado →</button>
        </div>
      )}

      {menu && (
        <Menu menu={menu} marcasActuales={marcasActuales}
          onGuardar={guardarMenu} onBorrarTodo={borrarTodo} onCerrar={() => setMenu(null)} />
      )}
    </>
  )
}
