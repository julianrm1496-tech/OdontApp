import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fecha, hoy, pesos, semaforo, nombreCompleto } from '../lib/format'
import { Cargando } from '../components/ui'
import { Barras } from '../components/Grafico'

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

/* Devuelve los últimos n meses en formato YYYY-MM */
function ultimosMeses(n) {
  const out = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push({
      clave: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
      etiqueta: MESES_CORTO[m.getMonth()],
    })
  }
  return out
}

export default function Inicio() {
  const [datos, setDatos] = useState(null)
  const navegar = useNavigate()

  useEffect(() => {
    const cargar = async () => {
      const meses = ultimosMeses(6)
      const desde = meses[0].clave + '-01'

      const [inv, bio, pag, citas, resumen] = await Promise.all([
        supabase.from('inventario').select('*'),
        supabase.from('bioseguridad').select('tipo').eq('fecha', hoy()),
        supabase.from('pagos').select('fecha, valor').gte('fecha', desde),
        supabase.from('citas')
          .select('id, hora, motivo, estado, paciente_id, paciente_nombre, pacientes(primer_nombre, primer_apellido)')
          .eq('fecha', hoy()).neq('estado', 'cancelada').order('hora'),
        supabase.from('pacientes_resumen').select('saldo, ultima_visita'),
      ])

      const alertas = (inv.data || [])
        .map(i => ({ ...i, s: semaforo(i.fecha_vencimiento) }))
        .filter(i => i.s.dias != null && i.s.dias <= 180)
        .sort((a, b) => (a.s.dias ?? 9999) - (b.s.dias ?? 9999))
        .slice(0, 5)

      const tiposHoy = new Set((bio.data || []).map(b => b.tipo))
      const faltan = ['esterilizacion', 'residuos', 'ambiente'].filter(t => !tiposHoy.has(t)).length

      // ingresos agrupados por mes
      const porMes = {}
      ;(pag.data || []).forEach(p => {
        const k = p.fecha.slice(0, 7)
        porMes[k] = (porMes[k] || 0) + Number(p.valor || 0)
      })
      const serie = meses.map(m => ({ etiqueta: m.etiqueta, valor: porMes[m.clave] || 0 }))

      const mesActual = meses[meses.length - 1].clave
      const mesAnterior = meses[meses.length - 2]?.clave
      const cobradoMes = porMes[mesActual] || 0
      const cobradoAnterior = porMes[mesAnterior] || 0
      const variacion = cobradoAnterior > 0
        ? Math.round(((cobradoMes - cobradoAnterior) / cobradoAnterior) * 100)
        : null

      const porCobrar = (resumen.data || [])
        .reduce((s, p) => s + Math.max(Number(p.saldo) || 0, 0), 0)
      const conDeuda = (resumen.data || []).filter(p => Number(p.saldo) > 0).length

      setDatos({
        alertas, faltan, serie, cobradoMes, variacion, porCobrar, conDeuda,
        citasHoy: (citas.data || []).map(c => ({
          ...c, nombre: c.paciente_id ? nombreCompleto(c.pacientes) : c.paciente_nombre,
        })),
      })
    }
    cargar()
  }, [])

  if (!datos) return <Cargando texto="Preparando el consultorio…" />

  const ahora = new Date()
  const h = ahora.getHours()
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  const horaActual = `${String(h).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  const proxima = datos.citasHoy.find(c => c.hora >= horaActual && c.estado !== 'atendida')

  return (
    <>
      <div className="grid g4 mb">
        <div className="stat">
          <div className="k">Citas hoy</div>
          <div className="v">{datos.citasHoy.length}</div>
          <div className="n">{proxima ? `Próxima ${proxima.hora}` : 'Sin citas pendientes'}</div>
        </div>
        <div className="stat">
          <div className="k">Cobrado este mes</div>
          <div className="v">{pesos(datos.cobradoMes)}</div>
          <div className="n">
            {datos.variacion === null ? 'Primer mes con registros' : (
              <span className={datos.variacion >= 0 ? 'delta up' : 'delta down'}>
                {datos.variacion >= 0 ? '▲' : '▼'} {Math.abs(datos.variacion)}% vs. mes pasado
              </span>
            )}
          </div>
        </div>
        <div className={'stat' + (datos.porCobrar > 0 ? ' warn' : '')}>
          <div className="k">Por cobrar</div>
          <div className="v">{pesos(datos.porCobrar)}</div>
          <div className="n">{datos.conDeuda ? `${datos.conDeuda} pacientes con saldo` : 'Todo al día'}</div>
        </div>
        <div className={'stat' + (datos.faltan ? ' warn' : '')}>
          <div className="k">Bioseguridad</div>
          <div className="v">{3 - datos.faltan}<span style={{ fontSize: 18, color: 'var(--ink-3)' }}> / 3</span></div>
          <div className="n">{datos.faltan ? `Faltan ${datos.faltan} registros` : 'Todo al día'}</div>
        </div>
      </div>

      <div className="card mb">
        <h2>Ingresos de los últimos 6 meses</h2>
        <Barras datos={datos.serie} />
      </div>

      <div className="split">
        <div className="card">
          <h2>Agenda de hoy</h2>
          {datos.citasHoy.length === 0 ? (
            <p className="nota">No hay citas agendadas para hoy.</p>
          ) : datos.citasHoy.map(c => {
            const pasada = c.hora < horaActual || c.estado === 'atendida'
            const esProxima = proxima && c.id === proxima.id
            return (
              <div className={'row clickable' + (pasada ? ' apagada' : '') + (esProxima ? ' destacada' : '')}
                key={c.id} onClick={() => c.paciente_id && navegar(`/pacientes/${c.paciente_id}`)}>
                <span className="t">{c.hora}</span>
                <span className="n">{c.nombre || 'Paciente'}</span>
                {esProxima && <span className="tag ok">Sigue</span>}
                <span className="sub" style={{ fontSize: 12 }}>{c.motivo || ''}</span>
              </div>
            )
          })}
          <div style={{ marginTop: 14 }}>
            <button className="act ghost sm" onClick={() => navegar('/agenda')}>Ver agenda</button>
          </div>
        </div>

        <div className="card">
          <h2>Requiere atención</h2>
          {datos.alertas.length === 0 && datos.faltan === 0 ? (
            <p className="nota">Todo en orden por ahora.</p>
          ) : (
            <>
              {datos.faltan > 0 && (
                <div className="row">
                  <span className="n">Bioseguridad de hoy</span>
                  <span className="tag soon">{datos.faltan} pendientes</span>
                </div>
              )}
              {datos.alertas.map(i => (
                <div className="row" key={i.id}>
                  <span className="n">{i.principio_activo}{i.lote ? ` · ${i.lote}` : ''}</span>
                  <span className={'tag ' + i.s.nivel}>{i.s.texto}</span>
                </div>
              ))}
            </>
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="act ghost sm" onClick={() => navegar('/inventario')}>Inventario</button>
            <button className="act ghost sm" onClick={() => navegar('/bioseguridad')}>Bioseguridad</button>
          </div>
        </div>
      </div>
    </>
  )
}
