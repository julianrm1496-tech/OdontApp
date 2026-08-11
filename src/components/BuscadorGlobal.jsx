import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { nombreCompleto, pesos } from '../lib/format'
import { Search } from 'lucide-react'

/* Buscador de pacientes disponible desde cualquier pantalla.
   Se abre con la lupa o con la tecla "/" en el computador. */
export default function BuscadorGlobal() {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(false)
  const campo = useRef(null)
  const navegar = useNavigate()

  // atajo de teclado: "/" abre el buscador
  useEffect(() => {
    const tecla = (e) => {
      const escribiendo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (e.key === '/' && !escribiendo) { e.preventDefault(); setAbierto(true) }
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  useEffect(() => { if (abierto) setTimeout(() => campo.current?.focus(), 50) }, [abierto])

  // busca mientras escribe, con una pequeña espera para no consultar en cada tecla
  useEffect(() => {
    const q = texto.trim()
    if (q.length < 1) { setLista([]); return }
    setCargando(true)
    const t = setTimeout(async () => {
      const { data } = await supabase.from('pacientes_resumen')
        .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, documento, saldo, alergia')
        .or(`primer_nombre.ilike.%${q}%,primer_apellido.ilike.%${q}%,segundo_apellido.ilike.%${q}%,documento.ilike.%${q}%`)
        .limit(8)
      setLista((data || []).map(p => ({ ...p, nombre: nombreCompleto(p) })))
      setCargando(false)
    }, 250)
    return () => clearTimeout(t)
  }, [texto])

  const ir = (p) => {
    setAbierto(false); setTexto(''); setLista([])
    navegar(`/pacientes/${p.id}`)
  }

  return (
    <>
      <button className="btn-buscar" onClick={() => setAbierto(true)} title="Buscar paciente ( / )">
        <Search size={16} strokeWidth={2} />
        <span>Buscar paciente</span>
      </button>

      {abierto && (
        <div className="overlay buscador-overlay" onClick={e => e.target === e.currentTarget && setAbierto(false)}>
          <div className="buscador">
            <input ref={campo} value={texto} onChange={e => setTexto(e.target.value)}
              placeholder="Nombre o número de documento…" />
            <div className="buscador-res">
              {texto.trim().length < 1 ? (
                <p className="nota">Empiece a escribir para buscar.</p>
              ) : cargando ? (
                <p className="nota">Buscando…</p>
              ) : lista.length === 0 ? (
                <p className="nota">Ningún paciente coincide con "{texto}".</p>
              ) : lista.map(p => (
                <div className="buscador-item" key={p.id} onClick={() => ir(p)}>
                  <div>
                    <div className="bi-nom">
                      {p.nombre}
                      {p.alergia && p.alergia.toLowerCase() !== 'ninguna' && (
                        <span className="tag warn">Alergia</span>
                      )}
                    </div>
                    <div className="sub">{p.documento}</div>
                  </div>
                  {Number(p.saldo) > 0 && (
                    <span className="num" style={{ color: 'var(--clay)', fontWeight: 600 }}>
                      {pesos(p.saldo)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
