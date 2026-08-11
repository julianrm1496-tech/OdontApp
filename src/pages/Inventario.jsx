import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fecha, semaforo } from '../lib/format'
import { Modal, Campo, Vacio, Cargando, useToast, IconoEditar, IconoEliminar, useConfirmar } from '../components/ui'
import { MoreVertical, Plus } from 'lucide-react'

const VACIO = {
  principio_activo: '', forma: '', concentracion: '', lote: '',
  fecha_vencimiento: '', presentacion: '', unidad: '', registro_sanitario: '',
  fecha_apertura: '', fecha_desecho: '',
}

export default function Inventario() {
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(null)
  const toast = useToast()
  const confirmar = useConfirmar()

  const cargar = async () => {
    const { data, error } = await supabase.from('inventario')
      .select('*').order('fecha_vencimiento', { nullsFirst: false })
    if (error) { toast('No se pudo cargar el inventario'); setLista([]); return }
    setLista(data || [])
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => { setEditando(null); setForm(VACIO); setAbierto(true) }

  const abrirEditar = (item) => {
    setEditando(item.id)
    const o = {}
    Object.keys(VACIO).forEach(k => { o[k] = item[k] ?? '' })
    setForm(o)
    setAbierto(true)
  }

  const guardar = async () => {
    if (!form.principio_activo.trim()) { toast('El nombre del insumo es obligatorio'); return }
    setGuardando(true)
    const payload = {
      ...form,
      fecha_vencimiento: form.fecha_vencimiento || null,
      fecha_apertura: form.fecha_apertura || null,
      fecha_desecho: form.fecha_desecho || null,
    }
    const { error } = editando
      ? await supabase.from('inventario').update(payload).eq('id', editando)
      : await supabase.from('inventario').insert(payload)
    setGuardando(false)
    if (error) { toast('No se pudo guardar'); return }
    setAbierto(false)
    toast(editando ? 'Insumo actualizado' : 'Insumo agregado')
    cargar()
  }

  const eliminar = (item) => confirmar({
    titulo: 'Eliminar insumo',
    mensaje: `¿Eliminar "${item.principio_activo}" del inventario?`,
    detalle: item.lote ? `Lote ${item.lote}. No se puede deshacer.` : 'No se puede deshacer.',
    textoBoton: 'Sí, eliminar',
    onConfirmar: async () => {
      const { error } = await supabase.from('inventario').delete().eq('id', item.id)
      if (error) { toast('No se pudo eliminar'); return }
      toast('Insumo eliminado')
      cargar()
    },
  })

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  const items = lista || []
  const filtrada = items.filter(i => {
    const q = busca.trim().toLowerCase()
    return !q || i.principio_activo.toLowerCase().includes(q) || (i.lote || '').toLowerCase().includes(q)
  })
  const porVencer = items.filter(i => { const s = semaforo(i.fecha_vencimiento); return s.dias != null && s.dias >= 0 && s.dias <= 90 }).length
  const vencidos = items.filter(i => { const s = semaforo(i.fecha_vencimiento); return s.dias != null && s.dias < 0 }).length

  return (
    <>
      <p className="lede mb">Verde sobre 6 meses, amarillo entre 3 y 6, rojo bajo 3 meses.</p>

      <div className="grid g3 mb stats-car">
        <div className="stat"><div className="k">Insumos registrados</div><div className="v">{items.length}</div></div>
        <div className={'stat' + (vencidos ? ' warn' : '')}>
          <div className="k">Vencidos</div><div className="v">{vencidos}</div>
          <div className="n">{vencidos ? 'Retirar del uso' : 'Ninguno'}</div>
        </div>
        <div className={'stat' + (porVencer ? ' warn' : '')}>
          <div className="k">Por vencer</div><div className="v">{porVencer}</div>
          <div className="n">En menos de 3 meses</div>
        </div>
      </div>

      <div className="card mb">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por insumo o lote…" style={{ flex: 1, minWidth: 200 }} />
          <button className="act" onClick={abrirNuevo}><Plus size={15} strokeWidth={2} /> Agregar insumo</button>
        </div>
      </div>

      <div className="card">
        {lista === null ? <Cargando /> :
         items.length === 0 ? (
          <Vacio titulo="Inventario vacío"
            texto="Agregue sus insumos con lote y vencimiento, y la app le avisa antes de que se venzan."
            accion={<button className="act" onClick={abrirNuevo}>Agregar el primero</button>} />
         ) : filtrada.length === 0 ? (
          <Vacio titulo="Sin resultados" texto={`Ningún insumo coincide con "${busca}".`} />
         ) : (
          <>
            <div className="hide-mobile-block tabla-scroll">
              <table className="card-tabla">
                <thead>
                  <tr><th>Insumo</th><th>Presentación</th><th>Lote</th>
                      <th>Unidad</th><th>Vence</th><th>Estado</th><th className="acciones" /></tr>
                </thead>
                <tbody>
                  {filtrada.map(i => {
                    const s = semaforo(i.fecha_vencimiento)
                    const vencido = s.dias != null && s.dias < 0
                    return (
                      <tr key={i.id} className={vencido ? 'fila-vencida' : ''}>
                        <td className="td-titulo">
                          <div className="celda-nombre">
                            <span className={'franja ' + (vencido ? 'warn' : s.nivel)} />
                            {i.principio_activo}
                          </div>
                          {i.concentracion && <div className="sub">{i.concentracion}</div>}
                        </td>
                        <td className="sub" data-label="Presentación">{i.presentacion || i.forma || '—'}</td>
                        <td className="num" data-label="Lote">{i.lote || '—'}</td>
                        <td data-label="Unidad">{i.unidad || '—'}</td>
                        <td data-label="Vence">{i.fecha_vencimiento ? fecha(i.fecha_vencimiento) : '—'}</td>
                        <td data-label="Estado"><span className={'tag ' + s.nivel}>{vencido ? 'Vencido' : s.texto}</span></td>
                        <td className="acciones">
                          <button className="icono" title="Editar" onClick={() => abrirEditar(i)}><IconoEditar /></button>
                          <button className="icono danger" title="Eliminar" onClick={() => eliminar(i)}><IconoEliminar /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="show-mobile-block client-grid">
              {filtrada.map(i => {
                const s = semaforo(i.fecha_vencimiento)
                const vencido = s.dias != null && s.dias < 0
                return (
                  <div key={i.id} className="p-card">
                    <span className={'franja ' + (vencido ? 'warn' : s.nivel)} style={{ alignSelf: 'stretch', flexShrink: 0 }} />
                    <div className="p-info" style={{ cursor: 'default' }}>
                      <div className="p-nombre">{i.principio_activo}</div>
                      <div className="p-sub">
                        {i.concentracion && `${i.concentracion} · `}{i.presentacion || i.forma || '—'}
                        {i.lote && ` · Lote ${i.lote}`}
                      </div>
                    </div>
                    <div className="p-derecha">
                      <span className={'tag ' + s.nivel}>{vencido ? 'Vencido' : s.texto}</span>
                    </div>
                    <div className="p-menu-wrap">
                      <button className="p-kebab" onClick={() => setMenuAbierto(menuAbierto === i.id ? null : i.id)}>
                        <MoreVertical size={16} strokeWidth={2} />
                      </button>
                      {menuAbierto === i.id && (
                        <>
                          <div className="menu-overlay" onClick={() => setMenuAbierto(null)} />
                          <div className="menu-desplegable">
                            <button onClick={() => { abrirEditar(i); setMenuAbierto(null) }}>
                              <IconoEditar /> Editar
                            </button>
                            <button className="danger" onClick={() => { eliminar(i); setMenuAbierto(null) }}>
                              <IconoEliminar /> Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {abierto && (
        <Modal titulo={editando ? 'Editar insumo' : 'Agregar insumo'} onCerrar={() => setAbierto(false)}
          onGuardar={guardar} guardando={guardando}>
          <p className="grupo">Identificación</p>
          <div className="grid g2 mb">
            <Campo label="Principio activo o insumo">
              <input value={form.principio_activo} onChange={set('principio_activo')}
                placeholder="Resina de zirconio nano híbrida" autoFocus />
            </Campo>
            <Campo label="Forma farmacéutica">
              <input value={form.forma} onChange={set('forma')} placeholder="Jeringa" />
            </Campo>
            <Campo label="Concentración">
              <input value={form.concentracion} onChange={set('concentracion')} placeholder="4G" />
            </Campo>
            <Campo label="Presentación comercial">
              <input value={form.presentacion} onChange={set('presentacion')} placeholder="Forma A2B" />
            </Campo>
            <Campo label="Registro sanitario">
              <input value={form.registro_sanitario} onChange={set('registro_sanitario')} placeholder="2017DM-0015951" />
            </Campo>
          </div>

          <p className="grupo">Lote y control</p>
          <div className="grid g2">
            <Campo label="Lote"><input value={form.lote} onChange={set('lote')} placeholder="D0RAI" /></Campo>
            <Campo label="Fecha de vencimiento">
              <input type="date" value={form.fecha_vencimiento} onChange={set('fecha_vencimiento')} />
            </Campo>
            <Campo label="Unidad de medida">
              <input value={form.unidad} onChange={set('unidad')} placeholder="4G" />
            </Campo>
            <Campo label="Fecha de apertura">
              <input type="date" value={form.fecha_apertura} onChange={set('fecha_apertura')} />
            </Campo>
            <Campo label="Fecha de desecho">
              <input type="date" value={form.fecha_desecho} onChange={set('fecha_desecho')} />
            </Campo>
          </div>
        </Modal>
      )}
    </>
  )
}
