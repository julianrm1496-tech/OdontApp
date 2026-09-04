import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fecha, hoy } from '../lib/format'
import { generarPdfFormula } from '../lib/pdfFormula'
import { Modal, Campo, useToast, useConfirmar, IconoEditar, IconoEliminar } from './ui'
import { Plus, FileDown } from 'lucide-react'

const MED_VACIO = { nombre: '', dosificacion: '' }
const FORMULA_VACIA = { fecha: hoy(), medicamentos: [{ ...MED_VACIO }], recomendacion: '' }

export default function FormulasMedicas({ pacienteId, paciente }) {
  const [formulas, setFormulas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORMULA_VACIA)
  const [guardando, setGuardando] = useState(false)
  const [sugerencias, setSugerencias] = useState([])
  const [sugerenciaAbierta, setSugerenciaAbierta] = useState(null)
  const toast = useToast()
  const confirmar = useConfirmar()

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase.from('formulas_medicas').select('*')
      .eq('paciente_id', pacienteId).order('fecha', { ascending: false })
    setFormulas(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [pacienteId])

  // Nombres de medicamentos ya recetados antes (a este paciente o a otros),
  // para autocompletar — así "va aprendiendo" con lo que ya se ha usado.
  const cargarSugerencias = async () => {
    const { data } = await supabase.from('formulas_medicas').select('medicamentos').limit(500)
    const nombres = new Set()
    ;(data || []).forEach(f => (f.medicamentos || []).forEach(m => { if (m?.nombre) nombres.add(m.nombre) }))
    setSugerencias([...nombres].sort())
  }

  const abrirNueva = () => {
    setEditandoId(null)
    setForm(FORMULA_VACIA)
    cargarSugerencias()
    setModal(true)
  }

  const abrirEditar = (f) => {
    setEditandoId(f.id)
    setForm({ fecha: f.fecha, medicamentos: f.medicamentos?.length ? f.medicamentos : [{ ...MED_VACIO }],
               recomendacion: f.recomendacion || '' })
    cargarSugerencias()
    setModal(true)
  }

  const agregarMedicamento = () => setForm(f => ({ ...f, medicamentos: [...f.medicamentos, { ...MED_VACIO }] }))
  const quitarMedicamento = (i) => setForm(f => ({ ...f, medicamentos: f.medicamentos.filter((_, j) => j !== i) }))
  const cambiarMedicamento = (i, campo, valor) => setForm(f => ({
    ...f, medicamentos: f.medicamentos.map((m, j) => j === i ? { ...m, [campo]: valor } : m),
  }))

  const guardar = async () => {
    const medicamentos = form.medicamentos.filter(m => m.nombre.trim())
    if (medicamentos.length === 0) { toast('Agregue al menos un medicamento'); return }
    setGuardando(true)
    const payload = { paciente_id: pacienteId, fecha: form.fecha, medicamentos, recomendacion: form.recomendacion || null }
    const { error } = editandoId
      ? await supabase.from('formulas_medicas').update(payload).eq('id', editandoId)
      : await supabase.from('formulas_medicas').insert(payload)
    setGuardando(false)
    if (error) { toast('No se pudo guardar la fórmula'); return }
    setModal(false)
    toast(editandoId ? 'Fórmula actualizada' : 'Fórmula creada')
    cargar()
  }

  const eliminar = (f) => confirmar({
    titulo: 'Eliminar fórmula médica',
    mensaje: `¿Eliminar la fórmula del ${fecha(f.fecha)}?`,
    detalle: 'No se puede deshacer.',
    textoBoton: 'Sí, eliminar',
    onConfirmar: async () => {
      const { error } = await supabase.from('formulas_medicas').delete().eq('id', f.id)
      if (error) { toast('No se pudo eliminar'); return }
      toast('Fórmula eliminada')
      cargar()
    },
  })

  const descargar = (f) => generarPdfFormula({ paciente, formula: f })

  if (cargando) return null

  return (
    <div className="card mb">
      <div className="card-head">
        <h2>Fórmulas médicas</h2>
        <button className="act sm" onClick={abrirNueva}><Plus size={14} /> Nueva fórmula</button>
      </div>

      {formulas.length === 0 ? (
        <p className="vacio-mini">Sin fórmulas registradas todavía.</p>
      ) : (
        <div className="lista-vert">
          {formulas.map(f => (
            <div className="row" key={f.id}>
              <span className="n">
                {fecha(f.fecha)} · {(f.medicamentos || []).map(m => m.nombre).filter(Boolean).join(', ') || 'Sin medicamentos'}
              </span>
              <button className="icono" title="Descargar PDF" onClick={() => descargar(f)}><FileDown size={16} /></button>
              <button className="icono" title="Editar" onClick={() => abrirEditar(f)}><IconoEditar /></button>
              <button className="icono danger" title="Eliminar" onClick={() => eliminar(f)}><IconoEliminar /></button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal titulo={editandoId ? 'Editar fórmula' : 'Nueva fórmula médica'}
          onCerrar={() => setModal(false)} onGuardar={guardar} guardando={guardando}>
          <Campo label="Fecha">
            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} max={hoy()} />
          </Campo>

          <p className="grupo" style={{ marginTop: 14 }}>Medicamentos</p>
          {form.medicamentos.map((m, i) => (
            <div className="bloque-proc" key={i} style={{ position: 'relative', marginBottom: 10 }}>
              {form.medicamentos.length > 1 && (
                <button type="button" className="quitar-bloque" onClick={() => quitarMedicamento(i)}
                  title="Quitar este medicamento">✕</button>
              )}
              <div className="grid g2">
                <Campo label="Medicamento">
                  <input value={m.nombre}
                    onChange={e => { cambiarMedicamento(i, 'nombre', e.target.value); setSugerenciaAbierta(i) }}
                    onFocus={() => setSugerenciaAbierta(i)}
                    onBlur={() => setTimeout(() => setSugerenciaAbierta(s => s === i ? null : s), 150)}
                    placeholder="Ej: Ibuprofeno 400mg" autoComplete="off" />
                  {sugerenciaAbierta === i && m.nombre.trim() && (
                    <div className="lista-buscar-paciente" style={{ position: 'absolute', zIndex: 5, width: '100%' }}>
                      {sugerencias
                        .filter(s => s.toLowerCase().includes(m.nombre.trim().toLowerCase()) && s !== m.nombre)
                        .slice(0, 6)
                        .map(s => (
                          <div key={s} className="opcion-buscar-paciente"
                            onMouseDown={() => { cambiarMedicamento(i, 'nombre', s); setSugerenciaAbierta(null) }}>
                            {s}
                          </div>
                        ))}
                    </div>
                  )}
                </Campo>
                <Campo label="Dosificación">
                  <input value={m.dosificacion} onChange={e => cambiarMedicamento(i, 'dosificacion', e.target.value)}
                    placeholder="1 tableta cada 8h por 5 días" />
                </Campo>
              </div>
            </div>
          ))}
          <button type="button" className="btn-agregar-proc" onClick={agregarMedicamento}>+ Agregar otro medicamento</button>

          <div style={{ marginTop: 14 }}>
            <Campo label="Recomendación">
              <textarea rows={3} value={form.recomendacion}
                onChange={e => setForm(f => ({ ...f, recomendacion: e.target.value }))}
                placeholder="Ej: Aplicar hielo local, evitar alimentos duros por 48 horas..." />
            </Campo>
          </div>
        </Modal>
      )}
    </div>
  )
}
