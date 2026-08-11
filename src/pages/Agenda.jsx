import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hoy, nombreCompleto, iniciales } from '../lib/format'
import { Modal, Campo, Vacio, Cargando, useToast, IconoEliminar, useConfirmar } from '../components/ui'
import { Plus, ChevronDown, CalendarDays } from 'lucide-react'

const ESTADOS = {
  pendiente:  { label: 'Pendiente',  color: 'var(--amber)', wash: 'var(--amber-wash)' },
  confirmada: { label: 'Confirmada', color: 'var(--green)', wash: 'var(--green-wash)' },
  atendida:   { label: 'Atendida',   color: 'var(--ink-3)', wash: 'var(--paper)' },
  cancelada:  { label: 'Cancelada',  color: 'var(--clay)',  wash: 'var(--clay-wash)' },
}

const VACIO = { paciente_id: '', paciente_nombre: '', fecha: hoy(), hora: '09:00', duracion: 30, motivo: '' }

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const JORNADA_INICIO = 7    // 7 am
const JORNADA_FIN = 19      // 7 pm

function sumarDias(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function inicioSemana(iso) {
  const d = new Date(iso + 'T00:00:00')
  return sumarDias(iso, -d.getDay())
}

function diaLegible(iso) {
  const d = new Date(iso + 'T00:00:00')
  const dif = Math.round((d - new Date(hoy() + 'T00:00:00')) / 86400000)
  const base = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  if (dif === 0) return `Hoy · ${base}`
  if (dif === 1) return `Mañana · ${base}`
  if (dif === -1) return `Ayer · ${base}`
  return base
}

function mesLegible(iso) {
  const d = new Date(iso + 'T00:00:00')
  const s = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/* Calcula los espacios libres de la jornada, dado lo que ya está ocupado */
function huecosLibres(citas) {
  const ocupado = citas
    .filter(c => c.estado !== 'cancelada')
    .map(c => ({ ini: aMinutos(c.hora), fin: aMinutos(c.hora) + (c.duracion || 30) }))
    .sort((a, b) => a.ini - b.ini)

  const libres = []
  let cursor = JORNADA_INICIO * 60
  ocupado.forEach(o => {
    if (o.ini - cursor >= 30) libres.push({ desde: cursor, hasta: o.ini })
    cursor = Math.max(cursor, o.fin)
  })
  if (JORNADA_FIN * 60 - cursor >= 30) libres.push({ desde: cursor, hasta: JORNADA_FIN * 60 })
  return libres
}

export default function Agenda() {
  const [fecha, setFecha] = useState(hoy())
  const [citas, setCitas] = useState(null)
  const [pacientes, setPacientes] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [mostrarSemana, setMostrarSemana] = useState(false)
  const navegar = useNavigate()
  const toast = useToast()
  const confirmar = useConfirmar()

  // Siempre cargamos la semana completa: así la tira de días puede mostrar
  // el puntito de "hay citas" y el resumen de semana está listo sin recargar.
  const desde = inicioSemana(fecha)
  const hasta = sumarDias(inicioSemana(fecha), 6)

  const cargar = async () => {
    const [c, p] = await Promise.all([
      supabase.from('citas')
        .select('*, pacientes(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)')
        .gte('fecha', desde).lte('fecha', hasta).order('fecha').order('hora'),
      supabase.from('pacientes').select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido')
        .order('primer_apellido'),
    ])
    if (c.error) { toast('No se pudieron cargar las citas'); setCitas([]); return }
    setCitas(c.data || [])
    setPacientes((p.data || []).map(x => ({ id: x.id, nombre: nombreCompleto(x) })))
  }

  useEffect(() => { cargar() }, [desde, hasta])

  const abrirNueva = (f = fecha, hora) => {
    setForm({ ...VACIO, fecha: f, hora: hora || '09:00' })
    setAbierto(true)
  }

  const guardar = async () => {
    if (!form.paciente_id && !form.paciente_nombre.trim()) {
      toast('Seleccione un paciente o escriba un nombre'); return
    }
    setGuardando(true)
    const { error } = await supabase.from('citas').insert({
      paciente_id: form.paciente_id || null,
      paciente_nombre: form.paciente_id ? null : form.paciente_nombre.trim(),
      fecha: form.fecha, hora: form.hora, duracion: Number(form.duracion) || 30,
      motivo: form.motivo,
    })
    setGuardando(false)
    if (error) { toast('No se pudo guardar la cita'); return }
    setAbierto(false); toast('Cita agendada'); cargar()
  }

  const cambiarEstado = async (cita, estado) => {
    const { error } = await supabase.from('citas').update({ estado }).eq('id', cita.id)
    if (error) { toast('No se pudo actualizar'); return }
    setCitas(cs => cs.map(c => c.id === cita.id ? { ...c, estado } : c))
  }

  const eliminar = (cita) => confirmar({
    titulo: 'Eliminar cita',
    mensaje: `¿Eliminar la cita de ${nombreDe(cita) || 'este paciente'} a las ${cita.hora}?`,
    textoBoton: 'Sí, eliminar',
    onConfirmar: async () => {
      const { error } = await supabase.from('citas').delete().eq('id', cita.id)
      if (error) { toast('No se pudo eliminar'); return }
      toast('Cita eliminada'); cargar()
    },
  })

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))
  const lista = citas || []
  const nombreDe = (c) => c.paciente_id ? nombreCompleto(c.pacientes) : c.paciente_nombre

  const delDia = lista.filter(c => c.fecha === fecha)
  const libres = huecosLibres(delDia)
  const diasSemana = Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana(fecha), i))
  const tieneCitas = (f) => lista.some(c => c.fecha === f && c.estado !== 'cancelada')
  const citasActivasDia = delDia.filter(c => c.estado !== 'cancelada').length

  return (
    <>
      <div className="card mb">
        <div className="barra-filtros">
          <span className="agenda-mes">{mesLegible(fecha)}</span>
          <div style={{ flex: 1 }} />
          {fecha !== hoy() && <button className="act ghost sm" onClick={() => setFecha(hoy())}>Hoy</button>}
          <label className="cal-jump" title="Ir a una fecha">
            <CalendarDays size={14} strokeWidth={2} />
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </label>
          <button className="act btn-nueva-cita" onClick={() => abrirNueva()}><Plus size={15} strokeWidth={2} /> Nueva cita</button>
        </div>

        <div className="tira-dias">
          <button className="tira-flecha" onClick={() => setFecha(sumarDias(fecha, -7))}>‹</button>
          {diasSemana.map(f => {
            const d = new Date(f + 'T00:00:00')
            const esHoy = f === hoy()
            const esElegido = f === fecha
            return (
              <button key={f}
                className={'tira-dia' + (esElegido ? ' elegido' : '') + (esHoy ? ' hoy' : '')}
                onClick={() => setFecha(f)}>
                <span className="tira-nom">{DIAS[d.getDay()]}</span>
                <span className="tira-num">{d.getDate()}</span>
                <span className={'tira-punto' + (tieneCitas(f) ? ' on' : '')} />
              </button>
            )
          })}
          <button className="tira-flecha" onClick={() => setFecha(sumarDias(fecha, 7))}>›</button>
        </div>
      </div>

      {citas === null ? <div className="card"><Cargando /></div> : (
        <div className="card">
          <div className="resumen-dia-cab">
            <h2 style={{ textTransform: 'capitalize' }}>{diaLegible(fecha)}</h2>
            {citasActivasDia > 0 && <span className="pill-count">{citasActivasDia}</span>}
          </div>

          {delDia.length === 0 ? (
            <Vacio titulo="Sin citas este día" texto="La jornada está libre."
              accion={<button className="act" onClick={() => abrirNueva()}>Agendar cita</button>} />
          ) : (
            <div className="lista-citas">
              {delDia.map(c => {
                const est = ESTADOS[c.estado] || ESTADOS.pendiente
                const nombre = nombreDe(c) || 'Paciente'
                return (
                  <div className="cita" key={c.id} style={{ borderLeftColor: est.color }}>
                    <div className="cita-hora">
                      <strong>{c.hora}</strong>
                      <span>{c.duracion} min</span>
                    </div>
                    <div className="cita-cuerpo" onClick={() => c.paciente_id && navegar(`/pacientes/${c.paciente_id}`)}>
                      <div className="cita-av" style={{ background: est.wash, color: est.color }}>{iniciales(nombre)}</div>
                      <div className="cita-info">
                        <div className={'cita-nom' + (c.paciente_id ? ' link' : '')}>{nombre}</div>
                        {c.motivo && <div className="sub">{c.motivo}</div>}
                      </div>
                    </div>
                    <div className="cita-secundaria">
                      <select className="cita-estado" style={{ background: est.wash, color: est.color }}
                        value={c.estado} onChange={e => cambiarEstado(c, e.target.value)}>
                        {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button className="icono danger" title="Eliminar" onClick={() => eliminar(c)}><IconoEliminar /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {libres.length > 0 && (
            <>
              <p className="grupo" style={{ marginTop: 22 }}>Espacios libres</p>
              <div className="huecos">
                {libres.map((l, i) => (
                  <button className="hueco" key={i} onClick={() => abrirNueva(fecha, aHora(l.desde))}>
                    {aHora(l.desde)} – {aHora(l.hasta)}
                    <span>{Math.round((l.hasta - l.desde) / 60 * 10) / 10} h</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <button className="toggle-semana" onClick={() => setMostrarSemana(v => !v)}>
            <ChevronDown size={13} strokeWidth={2.4}
              style={{ transform: mostrarSemana ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
            {mostrarSemana ? 'Ocultar' : 'Ver'} resumen de la semana
          </button>

          {mostrarSemana && (
            <div className="semana">
              {diasSemana.map(f => {
                const delDiaF = lista.filter(c => c.fecha === f)
                const esHoy = f === hoy()
                const d = new Date(f + 'T00:00:00')
                return (
                  <div className={'dia-col' + (esHoy ? ' hoy' : '')} key={f}>
                    <div className="dia-cab" onClick={() => setFecha(f)}>
                      <span className="dia-nom">{DIAS[d.getDay()]}</span>
                      <span className="dia-num">{d.getDate()}</span>
                    </div>
                    <div className="dia-body">
                      {delDiaF.length === 0 ? (
                        <button className="hueco-mini" onClick={() => abrirNueva(f)}><Plus size={15} strokeWidth={2} /></button>
                      ) : delDiaF.map(c => (
                        <div className="cita-mini" key={c.id}
                          style={{ borderLeftColor: ESTADOS[c.estado]?.color }}
                          onClick={() => setFecha(f)}>
                          <span className="h">{c.hora}</span>
                          <span className="n">{nombreDe(c) || 'Paciente'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <button className="fab-nueva" onClick={() => abrirNueva()} title="Nueva cita">
        <Plus size={22} strokeWidth={2.4} />
      </button>

      {abierto && (
        <Modal titulo="Nueva cita" onCerrar={() => setAbierto(false)} onGuardar={guardar} guardando={guardando}>
          <div className="grid" style={{ gap: 14 }}>
            <Campo label="Paciente registrado">
              <select value={form.paciente_id}
                onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value, paciente_nombre: '' }))} autoFocus>
                <option value="">— O escriba el nombre abajo —</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Campo>
            {!form.paciente_id && (
              <Campo label="O nombre de alguien nuevo">
                <input value={form.paciente_nombre} onChange={set('paciente_nombre')} placeholder="Nombre y apellido" />
              </Campo>
            )}
            <div className="grid g3">
              <Campo label="Fecha"><input type="date" value={form.fecha} onChange={set('fecha')} /></Campo>
              <Campo label="Hora"><input type="time" value={form.hora} onChange={set('hora')} /></Campo>
              <Campo label="Duración (min)">
                <input type="number" inputMode="numeric" value={form.duracion} onChange={set('duracion')} step="5" min="5" />
              </Campo>
            </div>
            <Campo label="Motivo">
              <input value={form.motivo} onChange={set('motivo')} placeholder="Control, limpieza, valoración…" />
            </Campo>
          </div>
        </Modal>
      )}
    </>
  )
}
