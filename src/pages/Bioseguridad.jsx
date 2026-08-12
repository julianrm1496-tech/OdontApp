import { useEffect, useState, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { fecha, hoy, fechaLocal, agruparPorMes } from '../lib/format'
import { Modal, Campo, Vacio, Cargando, useToast, useConfirmar, IconoEditar, IconoEliminar } from '../components/ui'
import FiltroFechas from '../components/FiltroFechas'
import { Plus } from 'lucide-react'

const TIPOS = {
  esterilizacion: { titulo: 'Esterilización', boton: 'Registrar ciclo', color: 'verde' },
  residuos:       { titulo: 'Residuos (RH1)', boton: 'Registrar pesaje', color: 'ambar' },
  ambiente:       { titulo: 'Temperatura y humedad', boton: 'Registrar lectura', color: 'azul' },
}

const RESIDUOS = [
  { id: 'biosanitarios',    nombre: 'Biosanitarios',    grupo: 'Riesgo biológico' },
  { id: 'cortopunzantes',   nombre: 'Cortopunzantes',   grupo: 'Riesgo biológico' },
  { id: 'no_aprovechables', nombre: 'No aprovechables', grupo: 'No peligrosos' },
  { id: 'aprovechables',    nombre: 'Aprovechables',    grupo: 'No peligrosos' },
  { id: 'mercuriales',      nombre: 'Mercuriales',      grupo: 'Químicos' },
  { id: 'farmaceuticos',    nombre: 'Farmacéuticos',    grupo: 'Químicos' },
  { id: 'otros',            nombre: 'Otros',            grupo: 'Químicos' },
]

const VACIOS = {
  esterilizacion: { lote: '', hora: '', paquetes: '', descripcion: '', tiempo: '45',
                    temperatura: '134', cinta: 'conforme', indicador: 'conforme', trazabilidad: 'conforme' },
  residuos: Object.fromEntries(RESIDUOS.map(r => [r.id, ''])),
  ambiente: { m_temperatura: '', m_humedad: '', m_hora: '', t_temperatura: '', t_humedad: '', t_hora: '' },
}

/* Devuelve todas las fechas entre dos días, inclusive */
function rangoFechas(desde, hasta) {
  const out = []
  const d = new Date(desde + 'T00:00:00')
  const fin = new Date(hasta + 'T00:00:00')
  while (d <= fin) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
    if (out.length > 366) break   // tope de seguridad
  }
  return out
}


/* Selector de fecha, con opción de aplicar el mismo registro a varios días */
function SelectorFecha({ form, set, setForm, permiteVarios = true }) {
  return (
    <>
      <div className="grid g2 mb">
        <Campo label="Fecha del registro">
          <input type="date" value={form.fecha || ''} onChange={set('fecha')} max={hoy()} />
        </Campo>
        {permiteVarios && form.varios && (
          <Campo label="Hasta el día">
            <input type="date" value={form.fecha_hasta || ''} onChange={set('fecha_hasta')}
              min={form.fecha} max={hoy()} />
          </Campo>
        )}
      </div>
      {permiteVarios && (
        <label className="check-linea">
          <input type="checkbox" checked={!!form.varios}
            onChange={e => setForm(f => ({ ...f, varios: e.target.checked,
              fecha_hasta: e.target.checked ? (f.fecha_hasta || f.fecha) : f.fecha }))} />
          <span>Aplicar lo mismo a varios días seguidos</span>
        </label>
      )}
    </>
  )
}

export default function Bioseguridad() {
  const [registros, setRegistros] = useState(null)
  const [tipo, setTipo] = useState(null)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 2, 1); return fechaLocal(d) })
  const [hasta, setHasta] = useState(hoy())
  const toast = useToast()
  const confirmar = useConfirmar()

  const cargar = async () => {
    let q = supabase.from('bioseguridad')
      .select('*').order('fecha', { ascending: false }).order('creado_en', { ascending: false }).limit(500)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data, error } = await q
    if (error) { toast('No se pudieron cargar los registros'); setRegistros([]); return }
    setRegistros(data || [])
  }

  useEffect(() => { cargar() }, [desde, hasta])

  const abrir = (t, registro = null) => {
    setTipo(t)
    setEditando(registro?.id || null)
    if (registro) {
      const d = registro.datos || {}
      let campos = {}
      if (t === 'esterilizacion') {
        campos = {
          lote: d.lote || '', hora: d.hora || '', descripcion: d.descripcion || '',
          paquetes: d.paquetes ?? '', tiempo: d.tiempo ?? '45', temperatura: d.temperatura ?? '134',
          cinta: d.cinta || 'conforme', indicador: d.indicador || 'conforme', trazabilidad: d.trazabilidad || 'conforme',
        }
      } else if (t === 'residuos') {
        campos = Object.fromEntries(RESIDUOS.map(r => [r.id, d[r.id] ?? '']))
      } else if (t === 'ambiente') {
        campos = {
          m_temperatura: d.manana?.temperatura ?? '', m_humedad: d.manana?.humedad ?? '', m_hora: d.manana?.hora || '',
          t_temperatura: d.tarde?.temperatura ?? '', t_humedad: d.tarde?.humedad ?? '', t_hora: d.tarde?.hora || '',
        }
      }
      setForm({ ...campos, fecha: registro.fecha, fecha_hasta: registro.fecha, varios: false })
    } else {
      setForm({ ...VACIOS[t], fecha: hoy(), fecha_hasta: hoy(), varios: false })
    }
  }

  const guardar = async () => {
    setGuardando(true)
    let datos = {}

    if (tipo === 'esterilizacion') {
      if (!form.descripcion.trim()) { toast('Describa el paquete esterilizado'); setGuardando(false); return }
      datos = {
        lote: form.lote, hora: form.hora, descripcion: form.descripcion,
        paquetes: Number(form.paquetes) || 0,
        tiempo: Number(form.tiempo) || 0,
        temperatura: Number(form.temperatura) || 0,
        cinta: form.cinta, indicador: form.indicador, trazabilidad: form.trazabilidad,
      }
    }
    if (tipo === 'residuos') {
      datos = Object.fromEntries(RESIDUOS.map(r => [r.id, Number(form[r.id]) || 0]))
    }
    if (tipo === 'ambiente') {
      datos = {
        manana: { temperatura: Number(form.m_temperatura) || null, humedad: Number(form.m_humedad) || null, hora: form.m_hora },
        tarde:  { temperatura: Number(form.t_temperatura) || null, humedad: Number(form.t_humedad) || null, hora: form.t_hora },
      }
    }

    if (editando) {
      const { error } = await supabase.from('bioseguridad').update({ fecha: form.fecha, datos }).eq('id', editando)
      setGuardando(false)
      if (error) { toast('No se pudo guardar'); return }
      setTipo(null); setEditando(null)
      toast('Registro actualizado')
      cargar()
      return
    }

    const fechas = form.varios && form.fecha_hasta >= form.fecha
      ? rangoFechas(form.fecha, form.fecha_hasta)
      : [form.fecha]

    const { error } = await supabase.from('bioseguridad')
      .insert(fechas.map(f => ({ tipo, fecha: f, datos })))
    setGuardando(false)
    if (error) { toast('No se pudo guardar'); return }
    setTipo(null)
    toast(fechas.length > 1 ? `${fechas.length} registros guardados` : 'Registro guardado')
    cargar()
  }

  const eliminar = (registro) => confirmar({
    titulo: 'Eliminar registro',
    mensaje: `¿Eliminar el registro de ${TIPOS[registro.tipo].titulo.toLowerCase()} del ${fecha(registro.fecha)}?`,
    textoBoton: 'Sí, eliminar',
    onConfirmar: async () => {
      const { error } = await supabase.from('bioseguridad').delete().eq('id', registro.id)
      if (error) { toast('No se pudo eliminar'); return }
      toast('Registro eliminado')
      cargar()
    },
  })

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  const lista = registros || []
  const de = (t) => lista.filter(r => r.tipo === t)
  const hoyTiene = (t) => de(t).some(r => r.fecha === hoy())
  const pendientes = Object.keys(TIPOS).filter(t => !hoyTiene(t)).length

  const ultAmbiente = de('ambiente')[0]?.datos
  const totalResiduos = de('residuos')
    .filter(r => r.fecha.startsWith(hoy().slice(0, 7)))
    .reduce((s, r) => s + Object.values(r.datos || {}).reduce((a, b) => a + Number(b || 0), 0), 0)

  const conforme = (v) => v === 'conforme'

  return (
    <>
      <p className="lede mb">Los tres formatos que le piden en la visita de habilitación, con fecha y trazabilidad.</p>

      <div className="card mb">
        <div className="barra-filtros">
          <FiltroFechas desde={desde} hasta={hasta} onCambiar={(d, h) => { setDesde(d); setHasta(h) }} />
        </div>
      </div>

      <div className="grid g3 mb stats-car">
        <div className={'stat' + (pendientes ? ' warn' : '')}>
          <div className="k">Registros de hoy</div>
          <div className="v">{3 - pendientes}<span style={{ fontSize: 18, color: 'var(--ink-3)' }}> / 3</span></div>
          <div className="n">{pendientes ? `Faltan ${pendientes}` : 'Todo al día'}</div>
        </div>
        <div className="stat">
          <div className="k">Última lectura</div>
          <div className="v" style={{ fontSize: 23 }}>
            {ultAmbiente?.tarde?.temperatura || ultAmbiente?.manana?.temperatura
              ? `${ultAmbiente.tarde?.temperatura || ultAmbiente.manana.temperatura}°C · ${ultAmbiente.tarde?.humedad || ultAmbiente.manana.humedad}%`
              : '—'}
          </div>
          <div className="n">Termohigrómetro</div>
        </div>
        <div className="stat">
          <div className="k">Residuos del mes</div>
          <div className="v" style={{ fontSize: 26 }}>{totalResiduos.toFixed(2)} <span style={{ fontSize: 15, color: 'var(--ink-3)' }}>kg</span></div>
          <div className="n">Suma de todas las categorías</div>
        </div>
      </div>

      {registros === null ? <div className="card"><Cargando /></div> : (
        <>
          {/* ---------- ESTERILIZACIÓN ---------- */}
          <div className="card mb bio-card bio-verde">
            <div className="card-head">
              <h2>Esterilización</h2>
              <button className="act sm" onClick={() => abrir('esterilizacion')}><Plus size={15} strokeWidth={2} /> Registrar ciclo</button>
            </div>
            {de('esterilizacion').length === 0 ? (
              <Vacio titulo="Sin registros todavía"
                texto="Cada ciclo de esterilización que registre aparecerá aquí, con su lote y control." />
            ) : (
              <>
                <div className="hide-mobile-block tabla-scroll">
                  <table className="card-tabla">
                    <thead>
                      <tr><th>Fecha</th><th>Lote</th><th>Paquete</th><th className="num">Cant.</th>
                          <th>Temp. / Tiempo</th><th>Control</th><th className="acciones" /></tr>
                    </thead>
                    <tbody>
                      {agruparPorMes(de('esterilizacion'), r => r.fecha).map(grupo => (
                        <Fragment key={grupo.clave}>
                          <tr className="fila-grupo-mes"><td colSpan={7}>{grupo.etiqueta}</td></tr>
                          {grupo.items.map(r => {
                            const d = r.datos || {}
                            const ok = conforme(d.cinta) && conforme(d.indicador) && conforme(d.trazabilidad)
                            return (
                              <tr key={r.id}>
                                <td className="td-titulo">{fecha(r.fecha)}</td>
                                <td className="num" data-label="Lote">{d.lote || '—'}</td>
                                <td data-label="Paquete">{d.descripcion}</td>
                                <td className="num" data-label="Cantidad">{d.paquetes}</td>
                                <td className="sub" data-label="Temp. / Tiempo">{d.temperatura}°C · {d.tiempo} min</td>
                                <td data-label="Control"><span className={'tag ' + (ok ? 'ok' : 'warn')}>{ok ? 'Conforme' : 'Revisar'}</span></td>
                                <td className="acciones">
                                  <button className="icono" title="Editar" onClick={() => abrir('esterilizacion', r)}><IconoEditar /></button>
                                  <button className="icono danger" title="Eliminar" onClick={() => eliminar(r)}><IconoEliminar /></button>
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="show-mobile-block">
                  {agruparPorMes(de('esterilizacion'), r => r.fecha).map(grupo => (
                    <div key={grupo.clave} style={{ marginBottom: 14 }}>
                      <p className="grupo">{grupo.etiqueta}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {grupo.items.map(r => {
                          const d = r.datos || {}
                          const ok = conforme(d.cinta) && conforme(d.indicador) && conforme(d.trazabilidad)
                          return (
                            <div key={r.id} className="factura-card-mobile">
                              <div className="fcm-top" style={{ cursor: 'default' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.descripcion}</div>
                                  <div className="sub" style={{ marginTop: 2 }}>{fecha(r.fecha)} · Lote {d.lote || '—'} · {d.paquetes} paq.</div>
                                  <div className="sub">{d.temperatura}°C · {d.tiempo} min</div>
                                </div>
                                <span className={'tag ' + (ok ? 'ok' : 'warn')} style={{ flexShrink: 0 }}>{ok ? 'Conforme' : 'Revisar'}</span>
                              </div>
                              <div className="fcm-actions">
                                <button className="icono" title="Editar" onClick={() => abrir('esterilizacion', r)}><IconoEditar /></button>
                                <button className="icono danger" title="Eliminar" onClick={() => eliminar(r)}><IconoEliminar /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ---------- RESIDUOS ---------- */}
          <div className="card mb bio-card bio-ambar">
            <div className="card-head">
              <h2>Residuos (RH1)</h2>
              <button className="act sm" onClick={() => abrir('residuos')}><Plus size={15} strokeWidth={2} /> Registrar pesaje</button>
            </div>
            {de('residuos').length === 0 ? (
              <Vacio titulo="Sin registros todavía"
                texto="Cada pesaje diario que registre aparecerá aquí, por categoría." />
            ) : (
              <>
                <div className="hide-mobile-block tabla-scroll">
                  <table className="card-tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        {RESIDUOS.map(r => <th key={r.id} className="num">{r.nombre}</th>)}
                        <th className="num">Total</th>
                        <th className="acciones" />
                      </tr>
                    </thead>
                    <tbody>
                      {agruparPorMes(de('residuos'), r => r.fecha).map(grupo => (
                        <Fragment key={grupo.clave}>
                          <tr className="fila-grupo-mes"><td colSpan={RESIDUOS.length + 3}>{grupo.etiqueta}</td></tr>
                          {grupo.items.map(r => {
                            const d = r.datos || {}
                            const total = RESIDUOS.reduce((s, x) => s + Number(d[x.id] || 0), 0)
                            return (
                              <tr key={r.id}>
                                <td className="td-titulo">{fecha(r.fecha)}</td>
                                {RESIDUOS.map(x => (
                                  <td key={x.id} className="num" data-label={x.nombre}>{Number(d[x.id] || 0) > 0 ? `${d[x.id]} kg` : '—'}</td>
                                ))}
                                <td className="num" data-label="Total"><strong>{total.toFixed(2)} kg</strong></td>
                                <td className="acciones">
                                  <button className="icono" title="Editar" onClick={() => abrir('residuos', r)}><IconoEditar /></button>
                                  <button className="icono danger" title="Eliminar" onClick={() => eliminar(r)}><IconoEliminar /></button>
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="show-mobile-block">
                  {agruparPorMes(de('residuos'), r => r.fecha).map(grupo => (
                    <div key={grupo.clave} style={{ marginBottom: 14 }}>
                      <p className="grupo">{grupo.etiqueta}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {grupo.items.map(r => {
                          const d = r.datos || {}
                          const total = RESIDUOS.reduce((s, x) => s + Number(d[x.id] || 0), 0)
                          return (
                            <div key={r.id} className="factura-card-mobile">
                              <div className="fcm-top" style={{ cursor: 'default' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{fecha(r.fecha)}</div>
                                  <div className="sub" style={{ marginTop: 2 }}>
                                    {RESIDUOS.filter(x => Number(d[x.id] || 0) > 0).map(x => `${x.nombre} ${d[x.id]}kg`).join(' · ') || 'Sin pesaje'}
                                  </div>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 13.5, flexShrink: 0 }}>{total.toFixed(2)} kg</div>
                              </div>
                              <div className="fcm-actions">
                                <button className="icono" title="Editar" onClick={() => abrir('residuos', r)}><IconoEditar /></button>
                                <button className="icono danger" title="Eliminar" onClick={() => eliminar(r)}><IconoEliminar /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ---------- TEMPERATURA Y HUMEDAD ---------- */}
          <div className="card mb bio-card bio-azul">
            <div className="card-head">
              <h2>Temperatura y humedad</h2>
              <button className="act sm" onClick={() => abrir('ambiente')}><Plus size={15} strokeWidth={2} /> Registrar lectura</button>
            </div>
            {de('ambiente').length === 0 ? (
              <Vacio titulo="Sin registros todavía"
                texto="Las lecturas de mañana y tarde del termohigrómetro aparecerán aquí." />
            ) : (
              <>
                <div className="hide-mobile-block tabla-scroll">
                  <table className="card-tabla">
                    <thead><tr><th>Fecha</th><th>Mañana</th><th>Tarde</th><th className="acciones" /></tr></thead>
                    <tbody>
                      {agruparPorMes(de('ambiente'), r => r.fecha).map(grupo => (
                        <Fragment key={grupo.clave}>
                          <tr className="fila-grupo-mes"><td colSpan={4}>{grupo.etiqueta}</td></tr>
                          {grupo.items.map(r => {
                            const d = r.datos || {}
                            return (
                              <tr key={r.id}>
                                <td className="td-titulo">{fecha(r.fecha)}</td>
                                <td className="sub" data-label="Mañana">{d.manana?.temperatura ? `${d.manana.temperatura}°C · ${d.manana.humedad}%` : '—'}</td>
                                <td className="sub" data-label="Tarde">{d.tarde?.temperatura ? `${d.tarde.temperatura}°C · ${d.tarde.humedad}%` : '—'}</td>
                                <td className="acciones">
                                  <button className="icono" title="Editar" onClick={() => abrir('ambiente', r)}><IconoEditar /></button>
                                  <button className="icono danger" title="Eliminar" onClick={() => eliminar(r)}><IconoEliminar /></button>
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="show-mobile-block">
                  {agruparPorMes(de('ambiente'), r => r.fecha).map(grupo => (
                    <div key={grupo.clave} style={{ marginBottom: 14 }}>
                      <p className="grupo">{grupo.etiqueta}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {grupo.items.map(r => {
                          const d = r.datos || {}
                          return (
                            <div key={r.id} className="factura-card-mobile">
                              <div className="fcm-top" style={{ cursor: 'default' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{fecha(r.fecha)}</div>
                                  <div className="sub" style={{ marginTop: 2 }}>
                                    Mañana: {d.manana?.temperatura ? `${d.manana.temperatura}°C · ${d.manana.humedad}%` : '—'}
                                  </div>
                                  <div className="sub">
                                    Tarde: {d.tarde?.temperatura ? `${d.tarde.temperatura}°C · ${d.tarde.humedad}%` : '—'}
                                  </div>
                                </div>
                              </div>
                              <div className="fcm-actions">
                                <button className="icono" title="Editar" onClick={() => abrir('ambiente', r)}><IconoEditar /></button>
                                <button className="icono danger" title="Eliminar" onClick={() => eliminar(r)}><IconoEliminar /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tipo === 'esterilizacion' && (
        <Modal titulo={editando ? 'Editar ciclo de esterilización' : 'Registrar ciclo de esterilización'}
          onCerrar={() => { setTipo(null); setEditando(null) }}
          onGuardar={guardar} guardando={guardando} textoGuardar={editando ? 'Guardar cambios' : 'Guardar'}>
          <SelectorFecha form={form} set={set} setForm={setForm} permiteVarios={!editando} />
          <p className="grupo">Programación</p>
          <div className="grid g2 mb">
            <Campo label="Lote"><input value={form.lote} onChange={set('lote')} placeholder="1" autoFocus /></Campo>
            <Campo label="Hora"><input type="time" value={form.hora} onChange={set('hora')} /></Campo>
            <Campo label="Cantidad de paquetes">
              <input type="number" inputMode="numeric" value={form.paquetes} onChange={set('paquetes')} placeholder="6" min="0" />
            </Campo>
            <Campo label="Descripción del paquete">
              <input value={form.descripcion} onChange={set('descripcion')} placeholder="Instrumental de examen" />
            </Campo>
            <Campo label="Tiempo (minutos)">
              <input type="number" inputMode="numeric" value={form.tiempo} onChange={set('tiempo')} />
            </Campo>
            <Campo label="Temperatura (°C)">
              <input type="number" inputMode="numeric" value={form.temperatura} onChange={set('temperatura')} />
            </Campo>
          </div>

          <p className="grupo">Control del proceso</p>
          <div className="grid g3">
            {['cinta', 'indicador', 'trazabilidad'].map(c => (
              <Campo key={c} label={c === 'cinta' ? 'Cinta testigo' : c === 'indicador' ? 'Indicador químico' : 'Trazabilidad'}>
                <select value={form[c]} onChange={set(c)}>
                  <option value="conforme">Conforme</option>
                  <option value="no conforme">No conforme</option>
                </select>
              </Campo>
            ))}
          </div>
        </Modal>
      )}

      {tipo === 'residuos' && (
        <Modal titulo={editando ? 'Editar pesaje de residuos' : 'Registrar pesaje de residuos'}
          onCerrar={() => { setTipo(null); setEditando(null) }}
          onGuardar={guardar} guardando={guardando} textoGuardar={editando ? 'Guardar cambios' : 'Guardar'}>
          <SelectorFecha form={form} set={set} setForm={setForm} permiteVarios={false} />
          {['Riesgo biológico', 'No peligrosos', 'Químicos'].map(g => (
            <div key={g}>
              <p className="grupo">{g}</p>
              <div className="grid g2 mb">
                {RESIDUOS.filter(r => r.grupo === g).map(r => (
                  <Campo key={r.id} label={`${r.nombre} (kg)`}>
                    <input type="number" inputMode="numeric" step="0.001" value={form[r.id]} onChange={set(r.id)} placeholder="0" min="0" />
                  </Campo>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}

      {tipo === 'ambiente' && (
        <Modal titulo={editando ? 'Editar temperatura y humedad' : 'Registrar temperatura y humedad'}
          onCerrar={() => { setTipo(null); setEditando(null) }}
          onGuardar={guardar} guardando={guardando} textoGuardar={editando ? 'Guardar cambios' : 'Guardar'}>
          <SelectorFecha form={form} set={set} setForm={setForm} permiteVarios={false} />
          <p className="grupo">Mañana</p>
          <div className="grid g3 mb">
            <Campo label="Temperatura (°C)">
              <input type="number" inputMode="numeric" value={form.m_temperatura} onChange={set('m_temperatura')} placeholder="22" autoFocus />
            </Campo>
            <Campo label="Humedad (%)">
              <input type="number" inputMode="numeric" value={form.m_humedad} onChange={set('m_humedad')} placeholder="50" />
            </Campo>
            <Campo label="Hora"><input type="time" value={form.m_hora} onChange={set('m_hora')} /></Campo>
          </div>

          <p className="grupo">Tarde</p>
          <div className="grid g3">
            <Campo label="Temperatura (°C)">
              <input type="number" inputMode="numeric" value={form.t_temperatura} onChange={set('t_temperatura')} placeholder="24" />
            </Campo>
            <Campo label="Humedad (%)">
              <input type="number" inputMode="numeric" value={form.t_humedad} onChange={set('t_humedad')} placeholder="54" />
            </Campo>
            <Campo label="Hora"><input type="time" value={form.t_hora} onChange={set('t_hora')} /></Campo>
          </div>
        </Modal>
      )}
    </>
  )
}
