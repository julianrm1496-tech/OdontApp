import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fecha, hoy, pesos, nombreCompleto, iniciales } from '../lib/format'
import { LOCALIDADES, TIPOS_DOCUMENTO } from '../lib/catalogos'
import { Modal, Campo, Vacio, Cargando, useToast, IconoEditar, IconoEliminar } from '../components/ui'
import { ChevronRight, MoreVertical, Plus } from 'lucide-react'

export const PACIENTE_VACIO = {
  historia: '', primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
  tipo_documento: 'CC', documento: '', fecha_nacimiento: '', sexo: 'F',
  estado_civil: '', grupo_sanguineo: '', ocupacion: '',
  telefono: '', correo: '', direccion: '', localidad: '', zona_residencia: 'U',
  tipo_usuario: 'particular', eps: '',
  responsable: '', responsable_tel: '', acompanante: '', acompanante_tel: '',
  patologia: '', farmacoterapia: '', alergia: '', cirugias: '',
  trauma: '', antecedentes: '', ocupacion_familia: '', otro: '',
}

/* Formulario reutilizado al crear y al editar */
export function FormPaciente({ form, set }) {
  return (
    <>
      <p className="nota-rips"><span className="rips-badge">RIPS</span> Estos campos van en el reporte al Ministerio</p>
      <p className="grupo">Datos personales</p>
      <div className="grid g2 mb">
        <Campo label="Primer nombre"><input value={form.primer_nombre} onChange={set('primer_nombre')} autoFocus /></Campo>
        <Campo label="Segundo nombre"><input value={form.segundo_nombre} onChange={set('segundo_nombre')} /></Campo>
        <Campo label="Primer apellido"><input value={form.primer_apellido} onChange={set('primer_apellido')} /></Campo>
        <Campo label="Segundo apellido"><input value={form.segundo_apellido} onChange={set('segundo_apellido')} /></Campo>
        <Campo label="Documento" rips>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={form.tipo_documento} onChange={set('tipo_documento')} style={{ width: 88 }}>
              {TIPOS_DOCUMENTO.map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={form.documento} onChange={set('documento')} placeholder="1020304050" />
          </div>
        </Campo>
        <Campo label="N.º de historia clínica"><input value={form.historia} onChange={set('historia')} placeholder="Opcional" /></Campo>
        <Campo label="Fecha de nacimiento" rips><input type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} max={hoy()} /></Campo>
        <Campo label="Sexo" rips>
          <select value={form.sexo} onChange={set('sexo')}>
            <option value="F">Femenino</option><option value="M">Masculino</option>
          </select>
        </Campo>
        <Campo label="Estado civil"><input value={form.estado_civil} onChange={set('estado_civil')} placeholder="Soltero" /></Campo>
        <Campo label="Grupo sanguíneo"><input value={form.grupo_sanguineo} onChange={set('grupo_sanguineo')} placeholder="O+" /></Campo>
        <Campo label="Ocupación"><input value={form.ocupacion} onChange={set('ocupacion')} placeholder="Independiente" /></Campo>
        <Campo label="Teléfono"><input value={form.telefono} onChange={set('telefono')} inputMode="tel" placeholder="310 000 0000" /></Campo>
      </div>

      <p className="grupo">Residencia y afiliación</p>
      <div className="grid g2 mb">
        <Campo label="Dirección"><input value={form.direccion} onChange={set('direccion')} placeholder="Cl 70 # 63F-37" /></Campo>
        <Campo label="Localidad">
          <select value={form.localidad} onChange={set('localidad')}>
            <option value="">Seleccione…</option>
            {LOCALIDADES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Campo>
        <Campo label="Zona de residencia">
          <select value={form.zona_residencia} onChange={set('zona_residencia')}>
            <option value="U">Urbana</option><option value="R">Rural</option>
          </select>
        </Campo>
        <Campo label="Tipo de paciente">
          <select value={form.tipo_usuario} onChange={set('tipo_usuario')}>
            <option value="particular">Particular</option><option value="eps">EPS</option>
          </select>
        </Campo>
        {form.tipo_usuario === 'eps' && (
          <Campo label="EPS"><input value={form.eps} onChange={set('eps')} /></Campo>
        )}
      </div>

      <p className="grupo">Responsable y acompañante</p>
      <div className="grid g2 mb">
        <Campo label="Responsable"><input value={form.responsable} onChange={set('responsable')} /></Campo>
        <Campo label="Celular del responsable"><input value={form.responsable_tel} onChange={set('responsable_tel')} /></Campo>
        <Campo label="Acompañante"><input value={form.acompanante} onChange={set('acompanante')} /></Campo>
        <Campo label="Celular del acompañante"><input value={form.acompanante_tel} onChange={set('acompanante_tel')} /></Campo>
      </div>

      <p className="grupo">Alteraciones y antecedentes</p>
      <div className="grid g2">
        <Campo label="Patología"><input value={form.patologia} onChange={set('patologia')} placeholder="No refiere" /></Campo>
        <Campo label="Farmacoterapia"><input value={form.farmacoterapia} onChange={set('farmacoterapia')} placeholder="No refiere" /></Campo>
        <Campo label="Alergia"><input value={form.alergia} onChange={set('alergia')} placeholder="Ninguna" /></Campo>
        <Campo label="Cirugías"><input value={form.cirugias} onChange={set('cirugias')} placeholder="Ninguna" /></Campo>
        <Campo label="Trauma"><input value={form.trauma} onChange={set('trauma')} placeholder="No refiere" /></Campo>
        <Campo label="Antecedentes"><input value={form.antecedentes} onChange={set('antecedentes')} placeholder="No refiere" /></Campo>
        <Campo label="Ocupación familiar"><input value={form.ocupacion_familia} onChange={set('ocupacion_familia')} /></Campo>
        <Campo label="Otro"><input value={form.otro} onChange={set('otro')} /></Campo>
      </div>
    </>
  )
}

const ORDENES = {
  nombre: { label: 'Nombre', fn: (a, b) => a.nombre.localeCompare(b.nombre) },
  saldo:  { label: 'Saldo',  fn: (a, b) => b.saldo - a.saldo },
  visita: { label: 'Última visita', fn: (a, b) => (b.ultima_visita || '').localeCompare(a.ultima_visita || '') },
  visitas:{ label: 'Visitas', fn: (a, b) => b.visitas - a.visitas },
}

export default function Pacientes() {
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState('nombre')
  const [modal, setModal] = useState(null)       // 'nuevo' | 'editar'
  const [form, setForm] = useState(PACIENTE_VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [aEliminar, setAEliminar] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(null)
  const navegar = useNavigate()
  const toast = useToast()

  const cargar = async () => {
    const { data, error } = await supabase.from('pacientes_resumen').select('*')
    if (error) { toast('No se pudo cargar la lista'); setLista([]); return }
    setLista((data || []).map(p => ({ ...p, nombre: nombreCompleto(p) })))
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => { setEditandoId(null); setForm(PACIENTE_VACIO); setModal('nuevo') }

  const abrirEditar = async (e, p) => {
    e.stopPropagation()
    const { data, error } = await supabase.from('pacientes').select('*').eq('id', p.id).single()
    if (error) { toast('No se pudo abrir el paciente'); return }
    const o = {}
    Object.keys(PACIENTE_VACIO).forEach(k => { o[k] = data[k] ?? '' })
    setEditandoId(p.id)
    setForm(o)
    setModal('editar')
  }

  const guardar = async () => {
    if (!form.primer_nombre.trim() || !form.primer_apellido.trim() || !form.documento.trim()) {
      toast('Nombre, apellido y documento son obligatorios'); return
    }
    setGuardando(true)
    const payload = { ...form, fecha_nacimiento: form.fecha_nacimiento || null }
    if (payload.tipo_usuario !== 'eps') payload.eps = null

    if (editandoId) {
      const { error } = await supabase.from('pacientes').update(payload).eq('id', editandoId)
      setGuardando(false)
      if (error) { toast(error.code === '23505' ? 'Ya existe otro paciente con ese documento' : 'No se pudo guardar'); return }
      setModal(null); toast('Datos actualizados'); cargar()
    } else {
      const { data, error } = await supabase.from('pacientes').insert(payload).select('id').single()
      setGuardando(false)
      if (error) { toast(error.code === '23505' ? 'Ya existe un paciente con ese documento' : 'No se pudo guardar'); return }
      setModal(null); toast('Paciente registrado'); navegar(`/pacientes/${data.id}`)
    }
  }

  const confirmarEliminar = async () => {
    const { error } = await supabase.from('pacientes').delete().eq('id', aEliminar.id)
    if (error) { toast('No se pudo eliminar'); return }
    toast('Paciente eliminado')
    setAEliminar(null)
    cargar()
  }

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  const items = lista || []
  const filtrada = items
    .filter(p => {
      const q = busca.trim().toLowerCase()
      return !q || p.nombre.toLowerCase().includes(q) || p.documento.includes(q)
    })
    .sort(ORDENES[orden].fn)

  const mes = hoy().slice(0, 7)
  const atendidosMes = items.filter(p => (p.ultima_visita || '').startsWith(mes)).length
  const porCobrar = items.reduce((s, p) => s + Math.max(Number(p.saldo) || 0, 0), 0)
  const conDeuda = items.filter(p => Number(p.saldo) > 0).length

  return (
    <>
      <div className="grid g3 mb stats-car">
        <div className="stat">
          <div className="k">Pacientes</div>
          <div className="v">{items.length}</div>
          <div className="n">{atendidosMes} atendidos este mes</div>
        </div>
        <div className={'stat' + (porCobrar > 0 ? ' warn' : '')}>
          <div className="k">Por cobrar</div>
          <div className="v">{pesos(porCobrar)}</div>
          <div className="n">{conDeuda ? `${conDeuda} pacientes con saldo` : 'Todo al día'}</div>
        </div>
        <div className="stat">
          <div className="k">Visitas registradas</div>
          <div className="v">{items.reduce((s, p) => s + Number(p.visitas || 0), 0)}</div>
          <div className="n">Histórico completo</div>
        </div>
      </div>

      <div className="card mb">
        <div className="barra-filtros">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nombre o documento…" style={{ flex: 1, minWidth: 180 }} />
          <select value={orden} onChange={e => setOrden(e.target.value)} style={{ width: 165 }}>
            {Object.entries(ORDENES).map(([k, v]) => <option key={k} value={k}>Ordenar: {v.label}</option>)}
          </select>
          <button className="act" onClick={abrirNuevo}><Plus size={15} strokeWidth={2} /> Registrar paciente</button>
        </div>
      </div>

      {lista === null ? <div className="card"><Cargando /></div> :
       items.length === 0 ? (
        <div className="card">
          <Vacio titulo="Todavía no hay pacientes"
            texto="Registre al primero y su historia clínica queda abierta desde ese momento."
            accion={<button className="act" onClick={abrirNuevo}>Registrar el primero</button>} />
        </div>
       ) : filtrada.length === 0 ? (
        <div className="card"><Vacio titulo="Sin resultados" texto={`Ningún paciente coincide con "${busca}".`} /></div>
       ) : (
        <>
          <div className="card hide-mobile-block">
            <div className="tabla-scroll">
              <table className="card-tabla">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Última visita</th>
                    <th className="num">Visitas</th>
                    <th className="num">Facturado</th>
                    <th className="num">Saldo</th>
                    <th className="acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filtrada.map(p => {
                    const saldo = Number(p.saldo) || 0
                    return (
                      <tr key={p.id} className="clickable" onClick={() => navegar(`/pacientes/${p.id}`)}>
                        <td className="td-titulo">
                          <div className="celda-nombre">
                            <div className="avatar avatar-sm">{iniciales(p.nombre)}</div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {p.nombre}
                                <ChevronRight size={13} style={{ color: 'var(--ink-3)' }} />
                                {p.alergia && p.alergia.toLowerCase() !== 'ninguna' && (
                                  <span className="tag warn" title={`Alergia: ${p.alergia}`}>Alergia</span>
                                )}
                              </div>
                              <div className="sub">{p.tipo_documento} {p.documento}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Última visita">{p.ultima_visita
                          ? fecha(p.ultima_visita)
                          : <span style={{ color: 'var(--ink-3)' }}>Sin visitas</span>}</td>
                        <td className="num" data-label="Visitas">{p.visitas}</td>
                        <td className="num" data-label="Facturado">{pesos(p.facturado)}</td>
                        <td className="num" data-label="Saldo">
                          {saldo > 0
                            ? <strong style={{ color: 'var(--clay)' }}>{pesos(saldo)}</strong>
                            : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                        </td>
                        <td className="acciones">
                          <button className="icono" title="Editar datos" onClick={e => abrirEditar(e, p)}><IconoEditar /></button>
                          <button className="icono danger" title="Eliminar"
                            onClick={e => { e.stopPropagation(); setAEliminar(p) }}><IconoEliminar /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="show-mobile-block client-grid">
            {filtrada.map(p => {
              const saldo = Number(p.saldo) || 0
              return (
                <div key={p.id} className="p-card">
                  <div className="p-avatar">{iniciales(p.nombre)}</div>
                  <div className="p-info" onClick={() => navegar(`/pacientes/${p.id}`)}>
                    <div className="p-nombre">{p.nombre}</div>
                    <div className="p-sub">
                      {p.alergia && p.alergia.toLowerCase() !== 'ninguna' && <span className="tag warn">Alergia</span>}
                      {p.tipo_documento} {p.documento} · {p.visitas} vis.
                    </div>
                  </div>
                  <div className="p-derecha">
                    {saldo > 0
                      ? <span className="p-saldo">{pesos(saldo)}</span>
                      : <span className="p-saldo ok">Al día</span>}
                  </div>
                  <div className="p-menu-wrap">
                    <button className="p-kebab" onClick={() => setMenuAbierto(menuAbierto === p.id ? null : p.id)}>
                      <MoreVertical size={16} strokeWidth={2} />
                    </button>
                    {menuAbierto === p.id && (
                      <>
                        <div className="menu-overlay" onClick={() => setMenuAbierto(null)} />
                        <div className="menu-desplegable">
                          <button onClick={e => { abrirEditar(e, p); setMenuAbierto(null) }}>
                            <IconoEditar /> Editar
                          </button>
                          <button className="danger" onClick={() => { setAEliminar(p); setMenuAbierto(null) }}>
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

      {modal && (
        <Modal titulo={editandoId ? 'Editar datos del paciente' : 'Registrar paciente'}
          onCerrar={() => setModal(null)} onGuardar={guardar} guardando={guardando}
          textoGuardar={editandoId ? 'Guardar cambios' : 'Guardar paciente'}>
          <FormPaciente form={form} set={set} />
        </Modal>
      )}

      {aEliminar && (
        <Modal titulo="Eliminar paciente" onCerrar={() => setAEliminar(null)}
          onGuardar={confirmarEliminar} textoGuardar="Sí, eliminar" peligro>
          <p style={{ fontSize: 14, color: 'var(--ink)' }}>
            ¿Eliminar a <strong>{aEliminar.nombre}</strong>?
          </p>
          <p className="sub" style={{ marginTop: 8 }}>
            Se borra toda su historia clínica, odontograma, pagos y citas. No se puede deshacer.
          </p>
        </Modal>
      )}
    </>
  )
}
