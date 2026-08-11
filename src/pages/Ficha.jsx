import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fecha, hoy, pesos, edad, iniciales, nombreCompleto } from '../lib/format'
import { CUPS, CIE10, GRUPOS_SERVICIO, FINALIDADES_RIPS } from '../lib/catalogos'
import { Modal, Campo, Vacio, Cargando, useToast, useConfirmar, IconoEditar, IconoEliminar } from '../components/ui'
import { FormPaciente, PACIENTE_VACIO } from './Pacientes'
import Odontograma from '../components/Odontograma'
import Radiografias from '../components/Radiografias'
import { generarPdfHistoria } from '../lib/pdfHistoria'
import { Plus } from 'lucide-react'

const ATENCION_VACIA = {
  fecha: hoy(), hora_inicio: '', hora_fin: '', grupo_servicio: 'Consulta',
  motivo: '', evolucion: '', cie10: '', cie10_1: '', tipo_dx: '1', finalidad: '16',
  cups: '', procedimiento: '', piezas: '', valor: '', abono: '',
}
const PLAN_VACIO = { descripcion: '', pieza: '', valor: '', fecha_realizado: '' }

const FILA_PLAN_VACIA = { descripcion: '', pieza: '', valor: '' }

export default function Ficha() {
  const { id } = useParams()
  const navegar = useNavigate()
  const toast = useToast()
  const confirmar = useConfirmar()

  const [paciente, setPaciente] = useState(null)
  const [atenciones, setAtenciones] = useState([])
  const [plan, setPlan] = useState([])
  const [pagos, setPagos] = useState([])
  const [dientes, setDientes] = useState({})

  const [modal, setModal] = useState(null)   // atencion | movimiento | plan | abono | editar
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)

  const [editandoAtencionId, setEditandoAtencionId] = useState(null)
  const [editandoMovimientoId, setEditandoMovimientoId] = useState(null)
  const [editandoAbonoVinculado, setEditandoAbonoVinculado] = useState(null)
  const [editandoPagoId, setEditandoPagoId] = useState(null)
  const [editandoPlanId, setEditandoPlanId] = useState(null)
  const [filasPlan, setFilasPlan] = useState([{ ...FILA_PLAN_VACIA }])

  const [graduar, setGraduar] = useState(null)       // ítem del plan que se está marcando hecho
  const [fechaGraduar, setFechaGraduar] = useState(hoy())
  const [graduando, setGraduando] = useState(false)

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    const [p, a, o, pl, pg] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', id).single(),
      supabase.from('atenciones').select('*').eq('paciente_id', id).order('fecha', { ascending: false }),
      supabase.from('odontograma').select('pieza, cara, estado, condicion').eq('paciente_id', id),
      supabase.from('plan_tratamiento').select('*').eq('paciente_id', id).order('orden'),
      supabase.from('pagos').select('*').eq('paciente_id', id).order('fecha', { ascending: false }),
    ])
    if (p.error) { toast('No se encontró el paciente'); navegar('/pacientes'); return }
    setPaciente(p.data)
    setAtenciones(a.data || [])
    setPlan(pl.data || [])
    setPagos(pg.data || [])

    const mapa = {}
    ;(o.data || []).forEach(d => {
      if (!mapa[d.pieza]) mapa[d.pieza] = {}
      mapa[d.pieza][d.cara] = { estado: d.estado, condicion: d.condicion }
    })
    setDientes(mapa)
  }

  /* ---------- odontograma ---------- */
  const marcar = async (pieza, cara, valor) => {
    const previo = dientes[pieza]?.[cara]
    setDientes(d => {
      const caras = { ...(d[pieza] || {}) }
      if (valor) caras[cara] = valor; else delete caras[cara]
      return { ...d, [pieza]: caras }
    })

    const { error } = valor
      ? await supabase.from('odontograma').upsert(
          { paciente_id: id, pieza, cara, estado: valor.estado, condicion: valor.condicion,
            actualizado: new Date().toISOString() },
          { onConflict: 'paciente_id,pieza,cara' })
      : await supabase.from('odontograma').delete()
          .eq('paciente_id', id).eq('pieza', pieza).eq('cara', cara)

    if (error) {
      setDientes(d => {
        const caras = { ...(d[pieza] || {}) }
        if (previo) caras[cara] = previo; else delete caras[cara]
        return { ...d, [pieza]: caras }
      })
      toast('No se pudo guardar el cambio')
    }
  }

  /* ---------- abrir modales ---------- */
  const abrir = (tipo) => {
    setModal(tipo)
    setEditandoAtencionId(null)
    setEditandoMovimientoId(null)
    setEditandoAbonoVinculado(null)
    setEditandoPagoId(null)
    setEditandoPlanId(null)
    if (tipo === 'atencion') setForm(ATENCION_VACIA)
    if (tipo === 'plan')     { setForm(PLAN_VACIO); setFilasPlan([{ ...FILA_PLAN_VACIA }]) }
    if (tipo === 'abono')    setForm({ fecha: hoy(), valor: '', concepto: 'Abono',
                                       metodo: pagos[0]?.metodo || 'efectivo' })
    if (tipo === 'editar')   setForm({ ...PACIENTE_VACIO, ...limpiar(paciente) })
  }

  // Editar SOLO el monto/fecha/pieza del cargo, desde el estado de cuenta —
  // sin abrir el formulario clínico completo (evolución, CIE10, motivo...).
  const abrirEditarMovimiento = (a, abonoVinculado) => {
    setEditandoMovimientoId(a.id)
    setEditandoAbonoVinculado(abonoVinculado)
    setForm({
      fecha: a.fecha, concepto: a.procedimiento || a.motivo || '', pieza: a.piezas || '',
      valor: a.valor ?? '', abono: abonoVinculado ? abonoVinculado.valor : '',
    })
    setModal('movimiento')
  }

  const abrirEditarAtencion = (a, abonoVinculado = null) => {
    setEditandoAtencionId(a.id)
    setEditandoAbonoVinculado(abonoVinculado)
    setForm({
      fecha: a.fecha, hora_inicio: a.hora_inicio || '', hora_fin: a.hora_fin || '',
      grupo_servicio: a.grupo_servicio || 'Consulta', motivo: a.motivo || '', evolucion: a.evolucion || '',
      cie10: a.cie10 || '', cie10_1: a.cie10_1 || '', tipo_dx: a.tipo_dx || '1', finalidad: a.finalidad || '16',
      cups: a.cups || '', piezas: a.piezas || '', valor: a.valor ?? '',
      abono: abonoVinculado ? abonoVinculado.valor : '',
    })
    setModal('atencion')
  }

  const abrirEditarPago = (p) => {
    setEditandoPagoId(p.id)
    setForm({ fecha: p.fecha, valor: p.valor, concepto: p.concepto || '', metodo: p.metodo || 'efectivo' })
    setModal('abono')
  }

  const abrirEditarPlan = (item) => {
    setEditandoPlanId(item.id)
    setForm({
      descripcion: item.descripcion, pieza: item.pieza || '', valor: item.valor ?? '',
      fecha_realizado: item.fecha_realizado || hoy(),
    })
    setModal('plan')
  }

  const limpiar = (p) => {
    const o = {}
    Object.keys(PACIENTE_VACIO).forEach(k => { o[k] = p[k] ?? '' })
    return o
  }

  const guardar = async () => {
    setGuardando(true)
    let error = null
    let mensajeExito = 'Guardado'

    if (modal === 'atencion') {
      if (!form.evolucion.trim()) { toast('Escriba la evolución de la visita'); setGuardando(false); return }
      const proc = CUPS.find(c => c.codigo === form.cups)
      const payload = {
        fecha: form.fecha, hora_inicio: form.hora_inicio || null, hora_fin: form.hora_fin || null,
        grupo_servicio: form.grupo_servicio, motivo: form.motivo, evolucion: form.evolucion,
        cie10: form.cie10 || null, cie10_1: form.cie10_1 || null, tipo_dx: form.tipo_dx,
        finalidad: form.finalidad, cups: form.cups || null,
        procedimiento: proc?.nombre || '', piezas: form.piezas || null, valor: Number(form.valor) || 0,
      }
      if (editandoAtencionId) {
        const r = await supabase.from('atenciones').update(payload).eq('id', editandoAtencionId)
        error = r.error
        if (!error) {
          const nuevoAbono = Number(form.abono) || 0
          if (editandoAbonoVinculado) {
            if (nuevoAbono > 0) {
              await supabase.from('pagos').update({ valor: nuevoAbono, fecha: form.fecha })
                .eq('id', editandoAbonoVinculado.id)
            } else {
              await supabase.from('pagos').delete().eq('id', editandoAbonoVinculado.id)
            }
          } else if (nuevoAbono > 0) {
            await supabase.from('pagos').insert({
              paciente_id: id, atencion_id: editandoAtencionId, fecha: form.fecha,
              valor: nuevoAbono, concepto: proc?.nombre || 'Atención', metodo: 'efectivo',
            })
          }
        }
      } else {
        const r = await supabase.from('atenciones')
          .insert({ ...payload, paciente_id: id, abono: Number(form.abono) || 0 })
          .select('id').single()
        error = r.error
        if (!error && Number(form.abono) > 0) {
          await supabase.from('pagos').insert({
            paciente_id: id, atencion_id: r.data.id, fecha: form.fecha, valor: Number(form.abono),
            concepto: proc?.nombre || 'Atención', metodo: 'efectivo',
          })
        }
      }
    }

    if (modal === 'movimiento') {
      if (!form.concepto.trim()) { toast('Escriba el tratamiento'); setGuardando(false); return }
      const r = await supabase.from('atenciones').update({
        fecha: form.fecha, procedimiento: form.concepto, piezas: form.pieza || null,
        valor: Number(form.valor) || 0,
      }).eq('id', editandoMovimientoId)
      error = r.error
      if (!error) {
        const nuevoAbono = Number(form.abono) || 0
        if (editandoAbonoVinculado) {
          if (nuevoAbono > 0) {
            await supabase.from('pagos').update({ valor: nuevoAbono, fecha: form.fecha })
              .eq('id', editandoAbonoVinculado.id)
          } else {
            await supabase.from('pagos').delete().eq('id', editandoAbonoVinculado.id)
          }
        } else if (nuevoAbono > 0) {
          await supabase.from('pagos').insert({
            paciente_id: id, atencion_id: editandoMovimientoId, fecha: form.fecha,
            valor: nuevoAbono, concepto: form.concepto, metodo: 'efectivo',
          })
        }
      }
    }

    if (modal === 'plan') {
      if (editandoPlanId) {
        if (!form.descripcion.trim()) { toast('Escriba el tratamiento'); setGuardando(false); return }
        const item = plan.find(x => x.id === editandoPlanId)
        const payload = { descripcion: form.descripcion, pieza: form.pieza, valor: Number(form.valor) || 0 }
        if (item?.estado === 'hecho') payload.fecha_realizado = form.fecha_realizado || null
        const r = await supabase.from('plan_tratamiento').update(payload).eq('id', editandoPlanId)
        error = r.error
      } else {
        const validas = filasPlan.filter(f => f.descripcion.trim())
        if (validas.length === 0) { toast('Escriba al menos un tratamiento'); setGuardando(false); return }
        const r = await supabase.from('plan_tratamiento').insert(
          validas.map((f, i) => ({
            paciente_id: id, descripcion: f.descripcion.trim(), pieza: f.pieza.trim() || null,
            valor: Number(f.valor) || 0, orden: plan.length + i,
          }))
        )
        error = r.error
        if (!error) mensajeExito = validas.length > 1 ? `${validas.length} tratamientos agregados` : 'Guardado'
      }
    }

    if (modal === 'abono') {
      if (!Number(form.valor)) { toast('Ingrese el valor del abono'); setGuardando(false); return }
      const payload = { fecha: form.fecha, valor: Number(form.valor), concepto: form.concepto, metodo: form.metodo }
      if (editandoPagoId) {
        const r = await supabase.from('pagos').update(payload).eq('id', editandoPagoId)
        error = r.error
      } else {
        const r = await supabase.from('pagos').insert({ ...payload, paciente_id: id })
        error = r.error
      }
    }

    if (modal === 'editar') {
      const payload = { ...form, fecha_nacimiento: form.fecha_nacimiento || null }
      if (payload.tipo_usuario !== 'eps') payload.eps = null
      const r = await supabase.from('pacientes').update(payload).eq('id', id)
      error = r.error
    }

    setGuardando(false)
    if (error) { toast('No se pudo guardar'); return }
    setModal(null)
    toast(mensajeExito)
    cargar()
  }

  /* ---------- graduar del plan al estado de cuenta (no toca evolución) ---------- */
  const confirmarGraduar = async () => {
    setGraduando(true)
    const { error } = await supabase.from('plan_tratamiento')
      .update({ estado: 'hecho', fecha_realizado: fechaGraduar })
      .eq('id', graduar.id)
    setGraduando(false)
    if (error) { toast('No se pudo registrar'); return }
    setGraduar(null)
    toast('Se agregó al estado de cuenta')
    cargar()
  }

  const deshacerGraduado = (item) => confirmar({
    titulo: 'Devolver a pendiente',
    mensaje: `¿Devolver "${item.descripcion}" a la lista de plan pendiente?`,
    detalle: 'Sale del estado de cuenta. El tratamiento no se borra, solo vuelve a quedar por hacer.',
    textoBoton: 'Sí, devolver',
    peligro: false,
    onConfirmar: async () => {
      const { error } = await supabase.from('plan_tratamiento')
        .update({ estado: 'pendiente', fecha_realizado: null }).eq('id', item.id)
      if (error) { toast('No se pudo deshacer'); return }
      toast('Vuelve a estar pendiente')
      cargar()
    },
  })

  const borrarPlan = (item) => confirmar({
    titulo: 'Quitar del plan',
    mensaje: `¿Quitar "${item.descripcion}" del plan de tratamiento?`,
    textoBoton: 'Sí, quitar',
    onConfirmar: async () => {
      const { error } = await supabase.from('plan_tratamiento').delete().eq('id', item.id)
      if (error) { toast('No se pudo eliminar'); return }
      toast('Eliminado')
      cargar()
    },
  })

  const eliminarAtencion = (a, abonoVinculado = null) => confirmar({
    titulo: 'Eliminar atención',
    mensaje: `¿Eliminar la atención del ${fecha(a.fecha)}?`,
    detalle: abonoVinculado
      ? `Se borra también su nota en la evolución y el abono de ${pesos(abonoVinculado.valor)} que tenía vinculado. No se puede deshacer.`
      : 'Se borra también su nota en la evolución y del estado de cuenta. No se puede deshacer.',
    textoBoton: 'Sí, eliminar',
    onConfirmar: async () => {
      const { error } = await supabase.from('atenciones').delete().eq('id', a.id)
      if (error) { toast('No se pudo eliminar'); return }
      if (abonoVinculado) await supabase.from('pagos').delete().eq('id', abonoVinculado.id)
      toast('Atención eliminada')
      cargar()
    },
  })

  const eliminarPago = (p) => confirmar({
    titulo: 'Eliminar abono',
    mensaje: `¿Eliminar el abono de ${pesos(p.valor)} del ${fecha(p.fecha)}?`,
    detalle: 'El saldo del paciente se recalcula. No se puede deshacer.',
    textoBoton: 'Sí, eliminar',
    onConfirmar: async () => {
      const { error } = await supabase.from('pagos').delete().eq('id', p.id)
      if (error) { toast('No se pudo eliminar'); return }
      toast('Abono eliminado')
      cargar()
    },
  })

  // Precarga los códigos de la última visita — lo clínico repetido (CUPS, CIE10,
  // grupo, finalidad) sin copiar la evolución ni el dinero, que cambian cada vez.
  const repetirUltima = () => {
    const u = atenciones[0]
    if (!u) return
    setEditandoAtencionId(null)
    setEditandoAbonoVinculado(null)
    setForm({
      ...ATENCION_VACIA,
      grupo_servicio: u.grupo_servicio || 'Consulta',
      motivo: u.motivo || '',
      cie10: u.cie10 || '', cie10_1: u.cie10_1 || '',
      tipo_dx: u.tipo_dx || '1', finalidad: u.finalidad || '16',
      cups: u.cups || '', piezas: u.piezas || '',
      valor: u.valor ?? '',
    })
    setModal('atencion')
    toast('Datos de la última visita precargados')
  }

  const cambiarFilaPlan = (i, campo, valor) =>
    setFilasPlan(fs => fs.map((f, j) => j === i ? { ...f, [campo]: valor } : f))
  const agregarFilaPlan = () => setFilasPlan(fs => [...fs, { ...FILA_PLAN_VACIA }])
  const quitarFilaPlan = (i) => setFilasPlan(fs => fs.length === 1 ? fs : fs.filter((_, j) => j !== i))

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  if (!paciente) return <Cargando texto="Abriendo la historia clínica…" />

  const nombre = nombreCompleto(paciente)
  const años = edad(paciente.fecha_nacimiento)
  const planPendiente = plan.filter(x => x.estado !== 'hecho')
  const planHecho = plan.filter(x => x.estado === 'hecho')
  const totalPlanPendiente = planPendiente.reduce((s, x) => s + Number(x.valor || 0), 0)
  const totalPlanHecho = planHecho.reduce((s, x) => s + Number(x.valor || 0), 0)
  const totalAtenciones = atenciones.reduce((s, x) => s + Number(x.valor || 0), 0)
  // Lo que falta del plan + lo que ya se hizo (plan graduado + atenciones) — nada se pisa entre sí.
  const totalCobrar = totalPlanPendiente + totalPlanHecho + totalAtenciones

  // Un pago vinculado a la atención que lo originó, el mismo día — se usa tanto
  // para fusionar filas en el estado de cuenta como para prellenar al editar.
  const pagoVinculado = (atencionId, fechaAtencion) =>
    pagos.find(p => p.atencion_id === atencionId && p.fecha === fechaAtencion)

  // Estado de cuenta: cargos de atenciones, cargos del plan ya hecho (aunque sea $0),
  // y abonos — en orden cronológico con saldo corriente. Si un abono está vinculado
  // a la atención de la que salió y es del mismo día, se fusiona en una sola fila
  // (cobro y pago del mismo tratamiento no deben verse como dos movimientos aparte).
  const movimientos = (() => {
    const idsPagosFusionados = new Set()

    const cargosAtencion = atenciones.map(a => {
      const pv = pagoVinculado(a.id, a.fecha)
      if (pv) idsPagosFusionados.add(pv.id)
      return {
        id: 'at-' + a.id, fecha: a.fecha, tipo: 'cargo', origen: 'atencion',
        concepto: a.procedimiento || a.motivo || 'Atención', pieza: a.piezas,
        monto: Number(a.valor) || 0, abonoVinculado: pv || null, item: a,
      }
    })
    const cargosPlan = planHecho.map(x => ({
      id: 'pl-' + x.id, fecha: x.fecha_realizado || x.creado_en?.slice(0, 10) || hoy(),
      tipo: 'cargo', origen: 'plan', concepto: x.descripcion, pieza: x.pieza,
      monto: Number(x.valor) || 0, abonoVinculado: null, item: x,
    }))
    const abonosSueltos = pagos.filter(p => !idsPagosFusionados.has(p.id)).map(p => ({
      id: 'pg-' + p.id, fecha: p.fecha, tipo: 'abono', origen: 'pago',
      concepto: p.concepto || 'Abono', pieza: null, monto: Number(p.valor), abonoVinculado: null, item: p,
    }))
    const todos = [...cargosAtencion, ...cargosPlan, ...abonosSueltos].sort((x, y) => {
      if (x.fecha !== y.fecha) return x.fecha.localeCompare(y.fecha)
      return x.tipo === 'cargo' ? -1 : 1
    })
    let saldo = 0
    todos.forEach(m => {
      const abonoExtra = m.abonoVinculado ? Number(m.abonoVinculado.valor) || 0 : 0
      saldo += m.tipo === 'cargo' ? (m.monto - abonoExtra) : -m.monto
      m.saldoTras = saldo
    })
    // igual, pero para mostrar: más reciente arriba, sin invertir el orden dentro del día
    return [...todos].sort((x, y) => {
      if (x.fecha !== y.fecha) return y.fecha.localeCompare(x.fecha)
      return x.tipo === 'cargo' ? -1 : 1
    })
  })()

  const totalAbonos = pagos.reduce((s, x) => s + Number(x.valor || 0), 0)
  const saldo = totalCobrar - totalAbonos

  const alteraciones = [
    ['Patología', paciente.patologia], ['Farmacoterapia', paciente.farmacoterapia],
    ['Alergia', paciente.alergia], ['Cirugías', paciente.cirugias],
    ['Trauma', paciente.trauma], ['Antecedentes', paciente.antecedentes],
    ['Ocupación familiar', paciente.ocupacion_familia], ['Otro', paciente.otro],
  ].filter(([, v]) => v)

  const tieneAlergia = paciente.alergia &&
    !['ninguna', 'no refiere', 'no', 'n/a', 'na'].includes(paciente.alergia.trim().toLowerCase())

  return (
    <>
      <div className="head">
        <button className="act ghost sm" onClick={() => navegar('/pacientes')} style={{ marginBottom: 14 }}>
          ← Volver a pacientes
        </button>
        <div className="patient-head">
          <div className="avatar">{iniciales(nombre)}</div>
          <div className="patient-head-info">
            <div className="nm">{nombre}</div>
            <div className="meta">
              {paciente.tipo_documento} {paciente.documento}
              {años != null && ` · ${años} años`}
              {paciente.sexo && ` · ${paciente.sexo === 'F' ? 'Femenino' : 'Masculino'}`}
              {' · '}{paciente.tipo_usuario === 'eps' ? (paciente.eps || 'EPS') : 'Particular'}
            </div>
          </div>
          <button className="act ghost sm" onClick={() => generarPdfHistoria({ paciente, atenciones, plan, pagos, dientes })}>
            Descargar PDF
          </button>
          <button className="act ghost sm" onClick={() => abrir('editar')}>Editar datos</button>
        </div>
      </div>

      {tieneAlergia && (
        <div className="alerta-alergia">
          <span className="ic">⚠</span>
          <div>
            <strong>Alergia</strong>
            <span>{paciente.alergia}</span>
          </div>
        </div>
      )}

      {/* ---------- DATOS ---------- */}
      <div className="card mb">
        <div className="grid g2">
          <div>
            <div className="kv"><span className="k">Teléfono</span><span className="v">{paciente.telefono || '—'}</span></div>
            <div className="kv"><span className="k">Dirección</span><span className="v">{paciente.direccion || '—'}</span></div>
            <div className="kv"><span className="k">Localidad</span><span className="v">{paciente.localidad || '—'}</span></div>
            <div className="kv"><span className="k">Ocupación</span><span className="v">{paciente.ocupacion || '—'}</span></div>
          </div>
          <div>
            <div className="kv"><span className="k">Grupo sanguíneo</span><span className="v">{paciente.grupo_sanguineo || '—'}</span></div>
            <div className="kv"><span className="k">Estado civil</span><span className="v">{paciente.estado_civil || '—'}</span></div>
            <div className="kv"><span className="k">Responsable</span><span className="v">{paciente.responsable || '—'}</span></div>
            <div className="kv"><span className="k">Acompañante</span><span className="v">{paciente.acompanante || '—'}</span></div>
          </div>
        </div>

        {alteraciones.length > 0 && (
          <>
            <p className="grupo" style={{ marginTop: 18 }}>Alteraciones</p>
            <div className="grid g2">
              {alteraciones.map(([k, v]) => (
                <div className="kv" key={k}>
                  <span className="k">{k}</span>
                  <span className="v" style={{ color: k === 'Alergia' ? 'var(--clay)' : undefined }}>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------- ODONTOGRAMA ---------- */}
      <div className="card mb">
        <h2>Odontograma</h2>
        <Odontograma datos={dientes} onCambio={marcar} />
      </div>

      <Radiografias pacienteId={id} />

      {/* ---------- CUENTA DEL PACIENTE ---------- */}
      <div className="card mb">
        <div className="card-head">
          <h2>Cuenta del paciente</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="act ghost sm" onClick={() => abrir('plan')}><Plus size={14} strokeWidth={2} /> Plan</button>
            <button className="act sm" onClick={() => abrir('abono')}><Plus size={14} strokeWidth={2} /> Abono</button>
          </div>
        </div>

        {planPendiente.length === 0 && movimientos.length === 0 ? (
          <p className="nota">Sin movimientos todavía. Agregue un plan de tratamiento o registre una atención con valor.</p>
        ) : (
          <>
            {planPendiente.length > 0 && (
              <>
                <p className="grupo">Plan pendiente</p>
                {planPendiente.map(x => (
                  <div className="row" key={x.id}>
                    <input type="checkbox" checked={false}
                      onChange={() => { setGraduar(x); setFechaGraduar(hoy()) }}
                      style={{ width: 16, flex: 'none' }} title="Marcar hecho" />
                    <span className="n">{x.descripcion}{x.pieza && ` · pieza ${x.pieza}`}</span>
                    <span className="num" style={{ fontSize: 12.5 }}>{pesos(x.valor)}</span>
                    <button className="icono" title="Editar" onClick={() => abrirEditarPlan(x)}><IconoEditar /></button>
                    <button className="icono danger" title="Quitar del plan" onClick={() => borrarPlan(x)}>
                      <IconoEliminar />
                    </button>
                  </div>
                ))}
              </>
            )}

            {movimientos.length > 0 && (
              <>
                <p className="grupo" style={{ marginTop: planPendiente.length > 0 ? 18 : 0 }}>Estado de cuenta</p>
                <div className="hide-mobile-block tabla-scroll">
                  <table className="tabla-cuenta card-tabla">
                    <thead>
                      <tr><th>Fecha</th><th>Movimiento</th><th className="num">Cargo</th>
                          <th className="num">Abono</th><th className="num">Saldo</th><th className="acciones" /></tr>
                    </thead>
                    <tbody>
                      {movimientos.map(m => (
                        <tr key={m.id}>
                          <td className="td-titulo">
                            {m.concepto}{m.pieza && <span className="sub"> · pieza {m.pieza}</span>}
                            <div className="sub">{fecha(m.fecha)}</div>
                          </td>
                          <td className="num" data-label="Cargo">{m.tipo === 'cargo' ? pesos(m.monto) : '—'}</td>
                          <td className="num" data-label="Abono" style={{ color: (m.tipo === 'abono' || m.abonoVinculado) ? 'var(--green-dark)' : undefined }}>
                            {m.tipo === 'abono' ? pesos(m.monto) : m.abonoVinculado ? pesos(m.abonoVinculado.valor) : '—'}
                          </td>
                          <td className="num" data-label="Saldo">
                            <strong style={{ color: m.saldoTras > 0 ? 'var(--clay)' : 'var(--green-dark)' }}>
                              {pesos(Math.abs(m.saldoTras))}
                            </strong>
                          </td>
                          <td className="acciones">
                            {m.origen === 'atencion' && <>
                              <button className="icono" title="Editar movimiento" onClick={() => abrirEditarMovimiento(m.item, m.abonoVinculado)}><IconoEditar /></button>
                              <button className="icono danger" title="Eliminar" onClick={() => eliminarAtencion(m.item, m.abonoVinculado)}><IconoEliminar /></button>
                            </>}
                            {m.origen === 'plan' && <>
                              <button className="icono" title="Editar" onClick={() => abrirEditarPlan(m.item)}><IconoEditar /></button>
                              <button className="act ghost sm" title="Vuelve a la lista de plan pendiente"
                                onClick={() => deshacerGraduado(m.item)}>Deshacer</button>
                            </>}
                            {m.origen === 'pago' && <>
                              <button className="icono" title="Editar abono" onClick={() => abrirEditarPago(m.item)}><IconoEditar /></button>
                              <button className="icono danger" title="Eliminar abono" onClick={() => eliminarPago(m.item)}><IconoEliminar /></button>
                            </>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="show-mobile-block lista-vert">
                  {movimientos.map(m => (
                    <div key={m.id} className="factura-card-mobile">
                      <div className="fcm-top">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                            {m.concepto}{m.pieza && <span className="sub"> · pieza {m.pieza}</span>}
                          </div>
                          <div className="sub" style={{ marginTop: 2 }}>{fecha(m.fecha)}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {m.tipo === 'cargo' && <div style={{ fontWeight: 700, fontSize: 13.5 }}>{pesos(m.monto)}</div>}
                          {(m.tipo === 'abono' || m.abonoVinculado) && (
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--green-dark)' }}>
                              {pesos(m.tipo === 'abono' ? m.monto : m.abonoVinculado.valor)}
                            </div>
                          )}
                          <div className="sub" style={{ color: m.saldoTras > 0 ? 'var(--clay)' : 'var(--green-dark)' }}>
                            saldo {pesos(Math.abs(m.saldoTras))}
                          </div>
                        </div>
                      </div>
                      {(m.origen === 'atencion' || m.origen === 'plan' || m.origen === 'pago') && (
                        <div className="fcm-actions">
                          {m.origen === 'atencion' && <>
                            <button className="icono" title="Editar movimiento" onClick={() => abrirEditarMovimiento(m.item, m.abonoVinculado)}><IconoEditar /></button>
                            <button className="icono danger" title="Eliminar" onClick={() => eliminarAtencion(m.item, m.abonoVinculado)}><IconoEliminar /></button>
                          </>}
                          {m.origen === 'plan' && <>
                            <button className="icono" title="Editar" onClick={() => abrirEditarPlan(m.item)}><IconoEditar /></button>
                            <button className="act ghost sm" title="Vuelve a la lista de plan pendiente"
                              onClick={() => deshacerGraduado(m.item)}>Deshacer</button>
                          </>}
                          {m.origen === 'pago' && <>
                            <button className="icono" title="Editar abono" onClick={() => abrirEditarPago(m.item)}><IconoEditar /></button>
                            <button className="icono danger" title="Eliminar abono" onClick={() => eliminarPago(m.item)}><IconoEliminar /></button>
                          </>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div className="kv"><span className="k">Valor a cobrar</span><span className="v">{pesos(totalCobrar)}</span></div>
              <div className="kv"><span className="k">Total abonado</span><span className="v">{pesos(totalAbonos)}</span></div>
              <div className="kv">
                <span className="k">{saldo >= 0 ? 'Saldo pendiente' : 'Saldo a favor'}</span>
                <span className="v" style={{ color: saldo > 0 ? 'var(--clay)' : 'var(--pine-dark)' }}>
                  {pesos(Math.abs(saldo))}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------- EVOLUCIÓN ---------- */}
      <div className="card">
        <div className="card-head">
          <h2>Evolución</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {atenciones.length > 0 && (
              <button className="act ghost sm" onClick={repetirUltima}
                title="Precarga los códigos de la visita anterior">Repetir la anterior</button>
            )}
            <button className="act sm" onClick={() => abrir('atencion')}><Plus size={14} strokeWidth={2} /> Registrar atención</button>
          </div>
        </div>

        {atenciones.length === 0 ? (
          <Vacio titulo="Sin visitas todavía"
            texto="Cuando registre la primera atención aparecerá aquí, en orden cronológico."
            accion={<button className="act" onClick={() => abrir('atencion')}>Registrar la primera</button>} />
        ) : (
          <div className="evo">
            {atenciones.map(a => (
              <div className="evo-item" key={a.id}>
                <div className="d">
                  <span>{fecha(a.fecha)}{a.hora_inicio && ` · ${a.hora_inicio}${a.hora_fin ? '-' + a.hora_fin : ''}`}</span>
                  <span className="evo-acciones">
                    <button className="icono" title="Editar" onClick={() => abrirEditarAtencion(a, pagoVinculado(a.id, a.fecha))}><IconoEditar /></button>
                    <button className="icono danger" title="Eliminar" onClick={() => eliminarAtencion(a, pagoVinculado(a.id, a.fecha))}><IconoEliminar /></button>
                  </span>
                </div>
                <div className="x">{a.evolucion}</div>
                <div className="codes">
                  {a.procedimiento && <>{a.procedimiento}</>}
                  {a.cups && ` · CUPS ${a.cups}`}
                  {a.cie10 && ` · CIE10 ${a.cie10}`}
                  {a.piezas && ` · pieza ${a.piezas}`}
                  {a.valor > 0 && ` · ${pesos(a.valor)}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- MODALES ---------- */}
      {modal === 'movimiento' && (
        <Modal titulo="Editar movimiento" onCerrar={() => setModal(null)}
          onGuardar={guardar} guardando={guardando} textoGuardar="Guardar cambios">
          <p className="sub" style={{ marginBottom: 14 }}>
            Esto solo cambia el cobro en la cuenta del paciente. Para editar la nota clínica de
            esta visita, hágalo desde "Evolución" más abajo.
          </p>
          <div className="grid g2 mb">
            <Campo label="Fecha"><input type="date" value={form.fecha} onChange={set('fecha')} max={hoy()} /></Campo>
            <Campo label="Pieza"><input value={form.pieza} onChange={set('pieza')} placeholder="16" /></Campo>
          </div>
          <Campo label="Tratamiento">
            <input value={form.concepto} onChange={set('concepto')} placeholder="Obturación en resina" autoFocus />
          </Campo>
          <div className="grid g2" style={{ marginTop: 14 }}>
            <Campo label="Valor"><input type="number" inputMode="numeric" value={form.valor} onChange={set('valor')} placeholder="180000" min="0" /></Campo>
            <Campo label="Abono"><input type="number" inputMode="numeric" value={form.abono} onChange={set('abono')} placeholder="0" min="0" /></Campo>
          </div>
        </Modal>
      )}

      {modal === 'atencion' && (
        <Modal titulo={editandoAtencionId ? 'Editar atención' : 'Registrar atención'} onCerrar={() => setModal(null)}
          onGuardar={guardar} guardando={guardando} textoGuardar={editandoAtencionId ? 'Guardar cambios' : 'Guardar atención'}>
          <p className="nota-rips"><span className="rips-badge">RIPS</span> Estos campos van en el reporte al Ministerio</p>
          <div className="grid g2 mb">
            <Campo label="Fecha" rips><input type="date" value={form.fecha} onChange={set('fecha')} max={hoy()} /></Campo>
            <Campo label="Grupo de servicio">
              <select value={form.grupo_servicio} onChange={set('grupo_servicio')}>
                {GRUPOS_SERVICIO.map(g => <option key={g}>{g}</option>)}
              </select>
            </Campo>
            <Campo label="Hora de inicio" rips><input type="time" value={form.hora_inicio} onChange={set('hora_inicio')} /></Campo>
            <Campo label="Hora de fin"><input type="time" value={form.hora_fin} onChange={set('hora_fin')} /></Campo>
          </div>

          <Campo label="Motivo de consulta">
            <input value={form.motivo} onChange={set('motivo')} placeholder="Quiero arreglarme estos dientes" />
          </Campo>

          <div style={{ marginTop: 14 }}>
            <Campo label="Evolución — qué se hizo en esta visita">
              <textarea value={form.evolucion} onChange={set('evolucion')}
                placeholder="Obturación en resina pieza 16. Paciente tolera bien. Control en 6 meses." />
            </Campo>
          </div>

          <p className="grupo" style={{ marginTop: 18 }}>Códigos para el RIPS</p>
          <div className="grid g2 mb">
            <Campo label="Diagnóstico principal (CIE-10)" rips>
              <select value={form.cie10} onChange={set('cie10')}>
                <option value="">Seleccione…</option>
                {CIE10.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Diagnóstico secundario">
              <select value={form.cie10_1} onChange={set('cie10_1')}>
                <option value="">Ninguno</option>
                {CIE10.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Procedimiento (CUPS)" rips>
              <select value={form.cups} onChange={set('cups')}>
                <option value="">Seleccione…</option>
                {CUPS.map(c => <option key={c.codigo + c.nombre} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Tipo de diagnóstico">
              <select value={form.tipo_dx} onChange={set('tipo_dx')}>
                <option value="1">Impresión diagnóstica</option>
                <option value="2">Confirmado nuevo</option>
                <option value="3">Confirmado repetido</option>
              </select>
            </Campo>
            <Campo label="Finalidad" rips>
              <select value={form.finalidad} onChange={set('finalidad')}>
                {FINALIDADES_RIPS.map(f => <option key={f.codigo} value={f.codigo}>{f.nombre}</option>)}
              </select>
            </Campo>
          </div>

          <div className="grid g3">
            <Campo label="Piezas"><input value={form.piezas} onChange={set('piezas')} placeholder="16" /></Campo>
            <Campo label="Valor" rips><input type="number" inputMode="numeric" value={form.valor} onChange={set('valor')} placeholder="180000" min="0" /></Campo>
            <Campo label={editandoAtencionId ? 'Abono' : 'Abono de hoy'}>
              <input type="number" inputMode="numeric" value={form.abono} onChange={set('abono')} placeholder="0" min="0" />
            </Campo>
          </div>
          {editandoAtencionId && editandoAbonoVinculado && (
            <p className="sub" style={{ marginTop: 8 }}>
              El abono se muestra aquí porque quedó vinculado a esta atención. Cambiarlo actualiza el
              pago en el estado de cuenta; dejarlo en $0 lo elimina.
            </p>
          )}
        </Modal>
      )}

      {modal === 'plan' && (
        <Modal titulo={editandoPlanId ? 'Editar tratamiento' : 'Agregar al plan de tratamiento'} onCerrar={() => setModal(null)}
          onGuardar={guardar} guardando={guardando}
          textoGuardar={editandoPlanId ? 'Guardar cambios'
            : filasPlan.filter(f => f.descripcion.trim()).length > 1
              ? `Guardar ${filasPlan.filter(f => f.descripcion.trim()).length} tratamientos` : 'Guardar'}>
          {editandoPlanId ? (
            <div className="grid" style={{ gap: 14 }}>
              <Campo label="Tratamiento">
                <input value={form.descripcion} onChange={set('descripcion')} placeholder="Resina" autoFocus />
              </Campo>
              <div className="grid g2">
                <Campo label="Pieza"><input value={form.pieza} onChange={set('pieza')} placeholder="22" /></Campo>
                <Campo label="Valor"><input type="number" inputMode="numeric" value={form.valor} onChange={set('valor')} placeholder="80000" min="0" /></Campo>
              </div>
              {plan.find(x => x.id === editandoPlanId)?.estado === 'hecho' && (
                <Campo label="Fecha en que se hizo">
                  <input type="date" value={form.fecha_realizado} onChange={set('fecha_realizado')} max={hoy()} />
                </Campo>
              )}
            </div>
          ) : (
            <>
              <p className="sub" style={{ marginBottom: 12 }}>
                Puede cargar varios tratamientos de una vez — por ejemplo, si el paciente necesita
                trabajo en varias piezas y se harán en sesiones distintas.
              </p>
              <div className="filas-plan">
                {filasPlan.map((f, i) => (
                  <div className="fila-plan" key={i}>
                    <input value={f.descripcion} placeholder="Tratamiento (ej. Resina)" autoFocus={i === 0}
                      aria-label="Tratamiento"
                      onChange={e => cambiarFilaPlan(i, 'descripcion', e.target.value)} />
                    <input value={f.pieza} placeholder="Pieza" aria-label="Pieza"
                      onChange={e => cambiarFilaPlan(i, 'pieza', e.target.value)} />
                    <input type="number" inputMode="numeric" value={f.valor} placeholder="Valor" min="0"
                      aria-label="Valor"
                      onChange={e => cambiarFilaPlan(i, 'valor', e.target.value)} />
                    <button className="icono danger" title="Quitar esta fila"
                      onClick={() => quitarFilaPlan(i)} disabled={filasPlan.length === 1}>
                      <IconoEliminar />
                    </button>
                  </div>
                ))}
              </div>
              <button className="act ghost sm" style={{ marginTop: 10 }} onClick={agregarFilaPlan}>
                + Agregar otro tratamiento
              </button>
            </>
          )}
        </Modal>
      )}

      {modal === 'abono' && (
        <Modal titulo={editandoPagoId ? 'Editar abono' : 'Registrar abono'} onCerrar={() => setModal(null)}
          onGuardar={guardar} guardando={guardando} textoGuardar={editandoPagoId ? 'Guardar cambios' : 'Guardar'}>
          <div className="grid g2">
            <Campo label="Fecha"><input type="date" value={form.fecha} onChange={set('fecha')} max={hoy()} /></Campo>
            <Campo label="Valor"><input type="number" inputMode="numeric" value={form.valor} onChange={set('valor')} placeholder="200000" min="0" autoFocus /></Campo>
            <Campo label="Concepto"><input value={form.concepto} onChange={set('concepto')} /></Campo>
            <Campo label="Método">
              <select value={form.metodo} onChange={set('metodo')}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </Campo>
          </div>
        </Modal>
      )}

      {modal === 'editar' && (
        <Modal titulo="Editar datos del paciente" onCerrar={() => setModal(null)}
          onGuardar={guardar} guardando={guardando}>
          <FormPaciente form={form} set={set} />
        </Modal>
      )}

      {graduar && (
        <Modal titulo="Marcar como hecho" onCerrar={() => setGraduar(null)}
          onGuardar={confirmarGraduar} guardando={graduando} textoGuardar="Registrar">
          <p style={{ fontSize: 14, marginBottom: 16 }}>
            <strong>{graduar.descripcion}</strong>{graduar.pieza && ` · pieza ${graduar.pieza}`} · {pesos(graduar.valor)}
          </p>
          <Campo label="¿Qué día se hizo?">
            <input type="date" value={fechaGraduar} onChange={e => setFechaGraduar(e.target.value)} max={hoy()} autoFocus />
          </Campo>
          <p className="sub" style={{ marginTop: 10 }}>
            Se agrega al estado de cuenta con esa fecha. No se toca la evolución — eso solo se
            modifica al registrar una atención.
          </p>
        </Modal>
      )}
    </>
  )
}
