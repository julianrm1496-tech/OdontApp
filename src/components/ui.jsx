import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { Pencil, Trash2, Undo2, X, Loader2 } from 'lucide-react'

/* ---------- Avisos flotantes ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('')
  const [on, setOn] = useState(false)

  const toast = useCallback((texto) => {
    setMsg(texto)
    setOn(true)
    setTimeout(() => setOn(false), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={'toast' + (on ? ' on' : '')}>{msg}</div>
    </ToastCtx.Provider>
  )
}

/* ---------- Confirmaciones ----------
   Reemplaza el confirm() del navegador por un modal con el estilo de la app.
   Uso:  const confirmar = useConfirmar()
         confirmar({ titulo, mensaje, textoBoton, peligro, onConfirmar })         */
const ConfirmCtx = createContext(() => {})
export const useConfirmar = () => useContext(ConfirmCtx)

export function ConfirmarProvider({ children }) {
  const [cfg, setCfg] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const confirmar = useCallback((opciones) => setCfg(opciones), [])

  const aceptar = async () => {
    setOcupado(true)
    try { await cfg.onConfirmar() } finally { setOcupado(false); setCfg(null) }
  }

  return (
    <ConfirmCtx.Provider value={confirmar}>
      {children}
      {cfg && (
        <Modal titulo={cfg.titulo} onCerrar={() => setCfg(null)}
          onGuardar={aceptar} guardando={ocupado}
          textoGuardar={cfg.textoBoton || 'Sí, continuar'} peligro={cfg.peligro !== false}>
          <p style={{ fontSize: 14, color: 'var(--ink)' }}>{cfg.mensaje}</p>
          {cfg.detalle && <p className="sub" style={{ marginTop: 8 }}>{cfg.detalle}</p>}
        </Modal>
      )}
    </ConfirmCtx.Provider>
  )
}

/* ---------- Ventana modal ---------- */
export function Modal({ titulo, children, onCerrar, onGuardar, guardando, textoGuardar = 'Guardar', peligro }) {
  const caja = useRef(null)
  const inicial = useRef(null)

  // Guarda una "foto" de lo escrito al abrir, para saber si hubo cambios.
  const leerCampos = () => {
    if (!caja.current) return ''
    return Array.from(caja.current.querySelectorAll('input, textarea, select'))
      .map(c => (c.type === 'checkbox' || c.type === 'radio') ? String(c.checked) : c.value)
      .join('\u0001')
  }

  useEffect(() => {
    const t = setTimeout(() => { inicial.current = leerCampos() }, 60)
    return () => clearTimeout(t)
  }, [])

  const cerrarConAviso = () => {
    if (onGuardar && inicial.current !== null && leerCampos() !== inicial.current) {
      if (!window.confirm('Hay cambios sin guardar. ¿Cerrar de todos modos?')) return
    }
    onCerrar()
  }

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && cerrarConAviso()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  })

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && cerrarConAviso()}>
      <div className="modal" ref={caja}>
        <div className="modal-header">
          <span className="modal-title">{titulo}</span>
          <button className="icono" onClick={cerrarConAviso} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          <button className="act ghost" onClick={cerrarConAviso}>Cancelar</button>
          {onGuardar && (
            <button className={peligro ? 'act peligro' : 'act'} onClick={onGuardar} disabled={guardando}>
              {guardando ? <><Loader2 size={14} className="girando" /> Guardando…</> : textoGuardar}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Íconos (Lucide, igual que FactuPro) ---------- */
export function IconoEditar(props) { return <Pencil size={15} strokeWidth={2} {...props} /> }
export function IconoEliminar(props) { return <Trash2 size={15} strokeWidth={2} {...props} /> }
export function IconoDeshacer(props) { return <Undo2 size={15} strokeWidth={2} {...props} /> }

export function Campo({ label, rips, children }) {
  return (
    <div className="field">
      <label>{label}{rips && <span className="rips-badge">RIPS</span>}</label>
      {children}
    </div>
  )
}

/* ---------- Estados ---------- */
export function Vacio({ titulo, texto, accion }) {
  return (
    <div className="empty">
      <div className="big serif">{titulo}</div>
      <p>{texto}</p>
      {accion}
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return <div className="loading">{texto}</div>
}
