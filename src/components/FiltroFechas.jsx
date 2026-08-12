import { hoy, fechaLocal } from '../lib/format'
import { CalendarRange } from 'lucide-react'

function sumarDias(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return fechaLocal(d)
}
function inicioMes(offsetMeses = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offsetMeses, 1)
  return fechaLocal(d)
}

const PRESETS = [
  { id: 'mes',   label: 'Este mes',       calc: () => [inicioMes(0), hoy()] },
  { id: '7d',    label: '7 días',         calc: () => [sumarDias(hoy(), -6), hoy()] },
  { id: '30d',   label: '30 días',        calc: () => [sumarDias(hoy(), -29), hoy()] },
  { id: '3m',    label: '3 meses',        calc: () => [inicioMes(-2), hoy()] },
  { id: 'anio',  label: 'Este año',       calc: () => [`${hoy().slice(0, 4)}-01-01`, hoy()] },
  { id: 'todo',  label: 'Todo',           calc: () => [null, null] },
]

/* Filtro de rango de fechas reutilizable: atajos + "desde/hasta" con
   calendario nativo. onCambiar(desde, hasta) recibe ISO o null (= sin límite). */
export default function FiltroFechas({ desde, hasta, onCambiar }) {
  const presetActivo = PRESETS.find(p => {
    const [d, h] = p.calc()
    return d === (desde || null) && h === (hasta || null)
  })?.id

  return (
    <div className="filtro-fechas">
      <div className="ff-presets">
        {PRESETS.map(p => (
          <button key={p.id} type="button"
            className={presetActivo === p.id ? 'on' : ''}
            onClick={() => { const [d, h] = p.calc(); onCambiar(d, h) }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="ff-rango">
        <CalendarRange size={15} strokeWidth={2} style={{ color: 'var(--ink-3)', marginLeft: 8, flexShrink: 0 }} />
        <label className="ff-campo">
          <span>Desde</span>
          <input type="date" value={desde || ''} max={hasta || undefined}
            onChange={e => onCambiar(e.target.value || null, hasta)} />
        </label>
        <span className="ff-guion">–</span>
        <label className="ff-campo">
          <span>Hasta</span>
          <input type="date" value={hasta || ''} min={desde || undefined}
            onChange={e => onCambiar(desde, e.target.value || null)} />
        </label>
      </div>
    </div>
  )
}
