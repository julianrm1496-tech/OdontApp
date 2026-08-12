import { useEffect, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fecha, hoy, fechaLocal, pesos, nombreCompleto, agruparPorMes } from '../lib/format'
import { Modal, Campo, Vacio, Cargando, useToast, IconoEliminar, IconoEditar, useConfirmar } from '../components/ui'
import { Barras } from '../components/Grafico'
import FiltroFechas from '../components/FiltroFechas'
import { Plus } from 'lucide-react'

const VACIO = { paciente_id: '', fecha: hoy(), concepto: '', valor: '', metodo: 'efectivo' }
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const METODOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' }
const COLORES_METODO = {
  efectivo: 'var(--green)',
  transferencia: 'var(--pine-soft)',
  tarjeta: 'var(--amber)',
  _otros: ['var(--clay)', 'var(--pine)', '#8B5CF6', '#EC4899'],
}

function inicioMes() {
  const d = new Date()
  d.setDate(1)
  return fechaLocal(d)
}

export default function Pagos() {
  const [lista, setLista] = useState(null)
  const [pacientes, setPacientes] = useState([])
  const [desde, setDesde] = useState(inicioMes())
  const [hasta, setHasta] = useState(hoy())
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const navegar = useNavigate()
  const toast = useToast()
  const confirmar = useConfirmar()

  const cargar = async () => {
    let q = supabase.from('pagos')
      .select('*, pacientes(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)')
      .order('fecha', { ascending: false })

    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)

    const [pg, pac] = await Promise.all([
      q,
      supabase.from('pacientes')
        .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido')
        .order('primer_apellido'),
    ])
    if (pg.error) { toast('No se pudieron cargar los pagos'); setLista([]); return }
    setLista((pg.data || []).map(p => ({ ...p, nombre: nombreCompleto(p.pacientes) })))
    setPacientes((pac.data || []).map(p => ({ id: p.id, nombre: nombreCompleto(p) })))
  }

  useEffect(() => { cargar() }, [desde, hasta])

  const [editando, setEditando] = useState(null)

  const abrirEditar = (p) => {
    setEditando(p.id)
    setForm({ paciente_id: p.paciente_id, fecha: p.fecha, concepto: p.concepto || '', valor: p.valor, metodo: p.metodo || 'efectivo' })
    setAbierto(true)
  }

  const guardar = async () => {
    if (!form.paciente_id) { toast('Seleccione el paciente'); return }
    if (!Number(form.valor)) { toast('Ingrese el valor'); return }
    setGuardando(true)
    const { error } = editando
      ? await supabase.from('pagos').update({ ...form, valor: Number(form.valor) }).eq('id', editando)
      : await supabase.from('pagos').insert({ ...form, valor: Number(form.valor) })
    setGuardando(false)
    if (error) { toast('No se pudo guardar el pago'); return }
    setAbierto(false); setEditando(null); setForm(VACIO)
    toast(editando ? 'Pago actualizado' : 'Pago registrado')
    cargar()
  }

  const eliminar = (p) => confirmar({
    titulo: 'Eliminar pago',
    mensaje: `¿Eliminar el pago de ${pesos(p.valor)} de ${p.nombre}?`,
    detalle: 'El saldo de ese paciente se recalcula. No se puede deshacer.',
    textoBoton: 'Sí, eliminar',
    onConfirmar: async () => {
      const { error } = await supabase.from('pagos').delete().eq('id', p.id)
      if (error) { toast('No se pudo eliminar'); return }
      toast('Pago eliminado'); cargar()
    },
  })

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  const items = lista || []
  const total = items.reduce((s, p) => s + Number(p.valor || 0), 0)
  const promedio = items.length ? total / items.length : 0

  // serie por mes para el gráfico
  const porMes = {}
  items.forEach(p => {
    const k = p.fecha.slice(0, 7)
    porMes[k] = (porMes[k] || 0) + Number(p.valor || 0)
  })
  const serie = Object.keys(porMes).sort().slice(-12).map(k => ({
    etiqueta: MESES_CORTO[Number(k.slice(5, 7)) - 1],
    valor: porMes[k],
  }))

  // desglose por método
  const porMetodo = {}
  items.forEach(p => {
    const m = p.metodo || 'efectivo'
    porMetodo[m] = (porMetodo[m] || 0) + Number(p.valor || 0)
  })

  return (
    <>
      <p className="lede mb">El saldo pendiente de cada paciente se ve en su ficha.</p>

      <div className="card mb">
        <div className="barra-filtros">
          <FiltroFechas desde={desde} hasta={hasta} onCambiar={(d, h) => { setDesde(d); setHasta(h) }} />
          <div style={{ flex: 1 }} />
          <button className="act" onClick={() => { setEditando(null); setForm({ ...VACIO, metodo: items[0]?.metodo || 'efectivo' }); setAbierto(true) }}><Plus size={15} strokeWidth={2} /> Registrar pago</button>
        </div>
      </div>

      <div className="grid g3 mb stats-car">
        <div className="stat">
          <div className="k">Total recibido</div><div className="v">{pesos(total)}</div>
          <div className="n">{items.length} pagos en el periodo</div>
        </div>
        <div className="stat">
          <div className="k">Pago promedio</div><div className="v">{pesos(promedio)}</div>
        </div>
        <div className="stat">
          <div className="k">Método más usado</div>
          <div className="v" style={{ fontSize: 24 }}>
            {Object.keys(porMetodo).length
              ? METODOS[Object.entries(porMetodo).sort((a, b) => b[1] - a[1])[0][0]]
              : '—'}
          </div>
        </div>
      </div>

      {serie.length > 1 && (
        <div className="card mb">
          <h2>Ingresos por mes</h2>
          <Barras datos={serie} />
        </div>
      )}

      {Object.keys(porMetodo).length > 0 && (
        <div className="card mb">
          <h2>Cómo le pagan</h2>
          <div className="metodos-desglose">
            {Object.entries(porMetodo).sort((a, b) => b[1] - a[1]).map(([m, v], i) => {
              const pct = total > 0 ? Math.round((v / total) * 100) : 0
              const color = COLORES_METODO[m] || COLORES_METODO._otros[i % COLORES_METODO._otros.length]
              return (
                <div className="metodo-fila" key={m}>
                  <span className="metodo-dot" style={{ background: color }} />
                  <span className="metodo-nom">{METODOS[m] || m}</span>
                  <div className="metodo-barra-track"><div className="metodo-barra-fill" style={{ width: `${pct}%`, background: color }} /></div>
                  <span className="metodo-val">{pesos(v)}<span className="metodo-pct">{pct}%</span></span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Historial</h2>
        {lista === null ? <Cargando /> :
         items.length === 0 ? (
          <Vacio titulo="Sin pagos en este periodo"
            texto="Cambie el filtro de arriba o registre un pago nuevo."
            accion={<button className="act" onClick={() => { setEditando(null); setForm({ ...VACIO, metodo: items[0]?.metodo || 'efectivo' }); setAbierto(true) }}>Registrar pago</button>} />
         ) : (
          <>
            <div className="hide-mobile-block tabla-scroll">
              <table className="card-tabla">
                <thead>
                  <tr><th>Paciente</th><th>Fecha</th><th>Concepto</th><th>Método</th><th className="num">Valor</th><th className="acciones" /></tr>
                </thead>
                <tbody>
                  {agruparPorMes(items, p => p.fecha).map(grupo => (
                    <Fragment key={grupo.clave}>
                      <tr className="fila-grupo-mes">
                        <td colSpan={6}>{grupo.etiqueta}</td>
                      </tr>
                      {grupo.items.map(p => (
                        <tr key={p.id} className="clickable" onClick={() => navegar(`/pacientes/${p.paciente_id}`)}>
                          <td className="td-titulo">{p.nombre || '—'}</td>
                          <td data-label="Fecha" style={{ whiteSpace: 'nowrap' }}>{fecha(p.fecha)}</td>
                          <td className="sub" data-label="Concepto">{p.concepto || '—'}</td>
                          <td className="sub" data-label="Método">{METODOS[p.metodo] || p.metodo || '—'}</td>
                          <td className="num" data-label="Valor">{pesos(p.valor)}</td>
                          <td className="acciones">
                            <button className="icono" title="Editar"
                              onClick={e => { e.stopPropagation(); abrirEditar(p) }}><IconoEditar /></button>
                            <button className="icono danger" title="Eliminar"
                              onClick={e => { e.stopPropagation(); eliminar(p) }}><IconoEliminar /></button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="show-mobile-block">
              {agruparPorMes(items, p => p.fecha).map(grupo => (
                <div key={grupo.clave} style={{ marginBottom: 14 }}>
                  <p className="grupo">{grupo.etiqueta}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grupo.items.map(p => (
                      <div key={p.id} className="factura-card-mobile" onClick={() => navegar(`/pacientes/${p.paciente_id}`)} style={{ cursor: 'pointer' }}>
                        <div className="fcm-top">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{pesos(p.valor)}</div>
                            <div className="sub" style={{ marginTop: 2 }}>{p.nombre || '—'}</div>
                            {p.concepto && <div className="sub">{p.concepto}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div className="sub">{fecha(p.fecha)}</div>
                            <span className="tag neutral" style={{ marginTop: 4, display: 'inline-block' }}>{METODOS[p.metodo] || p.metodo || '—'}</span>
                          </div>
                        </div>
                        <div className="fcm-actions" onClick={e => e.stopPropagation()}>
                          <button className="icono" title="Editar" onClick={() => abrirEditar(p)}><IconoEditar /></button>
                          <button className="icono danger" title="Eliminar" onClick={() => eliminar(p)}><IconoEliminar /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {abierto && (
        <Modal titulo={editando ? 'Editar pago' : 'Registrar pago'}
          onCerrar={() => { setAbierto(false); setEditando(null) }}
          onGuardar={guardar} guardando={guardando} textoGuardar={editando ? 'Guardar cambios' : 'Guardar'}>
          <div className="grid" style={{ gap: 14 }}>
            <Campo label="Paciente">
              <select value={form.paciente_id} onChange={set('paciente_id')} autoFocus>
                <option value="">Seleccione…</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Concepto">
              <input value={form.concepto} onChange={set('concepto')} placeholder="Abono tratamiento" />
            </Campo>
            <div className="grid g3">
              <Campo label="Valor">
                <input type="number" inputMode="numeric" value={form.valor} onChange={set('valor')} placeholder="200000" min="0" />
              </Campo>
              <Campo label="Fecha">
                <input type="date" value={form.fecha} onChange={set('fecha')} max={hoy()} />
              </Campo>
              <Campo label="Método">
                <select value={form.metodo} onChange={set('metodo')}>
                  {Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Campo>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
