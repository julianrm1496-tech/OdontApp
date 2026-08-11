import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { edad, pesos } from '../lib/format'
import { CUPS, CIE10 } from '../lib/catalogos'
import { generarJsonRips, agruparPorPaciente } from '../lib/generarRips'
import { Cargando, Vacio, Campo, useToast } from '../components/ui'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const HOY = new Date()
const nombreCups = (c) => CUPS.find(x => x.codigo === c)?.nombre || ''
const nombreCie10 = (c) => CIE10.find(x => x.codigo === c)?.nombre || ''

function csvEscape(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function Rips() {
  const [anio, setAnio] = useState(HOY.getFullYear())
  const [mes, setMes] = useState(HOY.getMonth() + 1)
  const [filas, setFilas] = useState(null)
  const [config, setConfig] = useState(null)
  const [editandoConfig, setEditandoConfig] = useState(false)
  const [formConfig, setFormConfig] = useState({})
  const toast = useToast()

  const cargarConfig = async () => {
    const { data, error } = await supabase.from('configuracion').select('*').eq('id', 1).single()
    if (!error) { setConfig(data); setFormConfig(data) }
  }

  const guardarConfig = async () => {
    const { error } = await supabase.from('configuracion').update(formConfig).eq('id', 1)
    if (error) { toast('No se pudo guardar la configuración'); return }
    setConfig(formConfig)
    setEditandoConfig(false)
    toast('Configuración guardada')
  }

  const cargar = async () => {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
    const hastaDate = new Date(anio, mes, 0)
    const hasta = hastaDate.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('atenciones')
      .select('*, pacientes(*)')
      .gte('fecha', desde).lte('fecha', hasta)
      .order('fecha')

    if (error) { toast('No se pudo cargar la información'); setFilas([]); return }
    setFilas(data || [])
  }

  useEffect(() => { cargar() }, [anio, mes])
  useEffect(() => { cargarConfig() }, [])

  const lista = filas || []

  const filaCsv = (a) => {
    const p = a.pacientes || {}
    return [
      a.fecha, p.tipo_documento, p.documento, p.fecha_nacimiento || '',
      edad(p.fecha_nacimiento) ?? '', p.primer_apellido, p.segundo_apellido || '',
      p.primer_nombre, p.segundo_nombre || '', p.sexo || '',
      (p.localidad || '').split('·')[0]?.trim() || '',
      a.fecha, `${a.hora_inicio || ''}${a.hora_fin ? '-' + a.hora_fin : ''}`,
      a.grupo_servicio || '', a.motivo || '',
      a.cie10 || '', a.cie10_1 || '', a.tipo_dx || '1',
      a.cups || '', a.valor || 0, a.abono || 0,
    ]
  }

  const encabezados = [
    'FECHA','TIPO DOCUMENTO USUARIO','NÚMERO DOCUMENTO','FECHA NACIMIENTO','EDAD',
    'PRIMER APELLIDO','SEGUNDO APELLIDO','PRIMER NOMBRE','SEGUNDO NOMBRE','SEXO','ZONA RESIDENCIA',
    'FECHA CONSULTA O PROCEDIMIENTO','HORA ATENCIÓN','GRUPO DE SERVICIOS','CONSULTA',
    'CIE 10 DIAGNÓSTICO PRINCIPAL','CIE 10 DIAGNÓSTICO 1','TIPO DIAGNÓSTICO','CUPS PROCEDIMIENTO',
    'VALOR TRATAMIENTO','ABONO',
  ]

  const descargarJson = () => {
    if (lista.length === 0) { toast('No hay atenciones registradas en ese mes'); return }
    if (!config?.codigo_prestador || !config?.num_documento_id_obligado) {
      toast('Complete primero los datos del consultorio (abajo)'); return
    }
    const sinDatos = lista.filter(a => !a.cups || !a.cie10 || !a.pacientes?.fecha_nacimiento || !a.pacientes?.sexo)
    if (sinDatos.length > 0) {
      toast(`${sinDatos.length} atenciones les falta CUPS, CIE10, fecha de nacimiento o sexo — revise la vista previa`)
      return
    }
    const agrupado = agruparPorPaciente(lista)
    const json = generarJsonRips({ config, atencionesPorPaciente: agrupado, numNota: `${anio}${String(mes).padStart(2, '0')}` })
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RIPS_${MESES[mes - 1]}_${anio}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('JSON descargado')
  }

  const descargar = () => {
    if (lista.length === 0) { toast('No hay atenciones registradas en ese mes'); return }
    const filasCsv = lista.map(filaCsv)
    const contenido = [encabezados, ...filasCsv]
      .map(fila => fila.map(csvEscape).join(';'))
      .join('\r\n')
    const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RIPS_${MESES[mes - 1]}_${anio}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('Archivo descargado')
  }

  const totalValor = lista.reduce((s, a) => s + Number(a.valor || 0), 0)
  const sinCodigos = lista.filter(a => !a.cups || !a.cie10).length

  return (
    <>
      <p className="lede mb">
        Genera el archivo con la misma estructura que usa hoy en Excel, listo para revisar
        y subir a la plataforma de validación del Ministerio.
      </p>

      <div className="card mb">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ width: 160 }}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ width: 110 }}>
            {[HOY.getFullYear() - 1, HOY.getFullYear(), HOY.getFullYear() + 1].map(a => <option key={a}>{a}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button className="act ghost" onClick={descargar}>Descargar CSV (borrador)</button>
          <button className="act" onClick={descargarJson}>Descargar JSON (RIPS oficial)</button>
        </div>
      </div>

      <div className="grid g3 mb">
        <div className="stat"><div className="k">Atenciones</div><div className="v">{lista.length}</div>
          <div className="n">{MESES[mes - 1]} {anio}</div></div>
        <div className="stat"><div className="k">Valor total</div><div className="v">{pesos(totalValor)}</div></div>
        <div className={'stat' + (sinCodigos ? ' warn' : '')}>
          <div className="k">Sin códigos completos</div><div className="v">{sinCodigos}</div>
          <div className="n">{sinCodigos ? 'Revise CUPS y CIE10' : 'Todas con código'}</div>
        </div>
      </div>

      <div className="card">
        <h2>Vista previa</h2>
        {filas === null ? <Cargando /> :
         lista.length === 0 ? (
          <Vacio titulo="Sin atenciones este mes"
            texto="Cuando registre atenciones en las fichas de sus pacientes, aparecerán aquí para exportar." />
         ) : (
          <>
            <div className="hide-mobile-block tabla-scroll">
              <table className="card-tabla">
                <thead>
                  <tr><th>Paciente</th><th>Fecha</th><th>CUPS</th><th>CIE10</th><th className="num">Valor</th><th>Alerta</th></tr>
                </thead>
                <tbody>
                  {lista.map(a => {
                    const p = a.pacientes || {}
                    const faltan = !a.cups || !a.cie10
                    return (
                      <tr key={a.id}>
                        <td className="td-titulo">{[p.primer_nombre, p.primer_apellido].filter(Boolean).join(' ')}</td>
                        <td data-label="Fecha" style={{ whiteSpace: 'nowrap' }}>{a.fecha}</td>
                        <td className="sub" data-label="CUPS">{a.cups ? `${a.cups} · ${nombreCups(a.cups)}` : '—'}</td>
                        <td className="sub" data-label="CIE10">{a.cie10 ? `${a.cie10} · ${nombreCie10(a.cie10)}` : '—'}</td>
                        <td className="num" data-label="Valor">{pesos(a.valor)}</td>
                        <td data-label="Alerta">{faltan ? <span className="tag warn">Falta código</span> : <span className="sub">—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="show-mobile-block lista-vert">
              {lista.map(a => {
                const p = a.pacientes || {}
                const faltan = !a.cups || !a.cie10
                return (
                  <div key={a.id} className="factura-card-mobile">
                    <div className="fcm-top" style={{ cursor: 'default' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                          {[p.primer_nombre, p.primer_apellido].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="sub" style={{ marginTop: 2 }}>{a.fecha}</div>
                        <div className="sub">CUPS {a.cups ? `${a.cups} · ${nombreCups(a.cups)}` : '—'}</div>
                        <div className="sub">CIE10 {a.cie10 ? `${a.cie10} · ${nombreCie10(a.cie10)}` : '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{pesos(a.valor)}</div>
                        {faltan && <span className="tag warn" style={{ marginTop: 4, display: 'inline-block' }}>Falta código</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="card mb" style={{ marginTop: 14 }}>
        <div className="card-head">
          <h2>Datos del consultorio para el RIPS</h2>
          {!editandoConfig && <button className="act ghost sm" onClick={() => setEditandoConfig(true)}>Editar</button>}
        </div>

        {!editandoConfig ? (
          <div className="grid g3">
            <div className="kv"><span className="k">Documento del prestador</span><span className="v">{config?.num_documento_id_obligado || '— falta —'}</span></div>
            <div className="kv"><span className="k">Código de habilitación</span><span className="v">{config?.codigo_prestador || '— falta —'}</span></div>
            <div className="kv"><span className="k">RETHUS <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(opcional)</span></span><span className="v">{config?.rethus || '—'}</span></div>
          </div>
        ) : (
          <>
            <div className="grid g3 mb">
              <Campo label="Documento del prestador (NIT o CC)">
                <input value={formConfig.num_documento_id_obligado || ''}
                  onChange={e => setFormConfig(f => ({ ...f, num_documento_id_obligado: e.target.value }))} />
              </Campo>
              <Campo label="Código de habilitación (REPS)">
                <input value={formConfig.codigo_prestador || ''}
                  onChange={e => setFormConfig(f => ({ ...f, codigo_prestador: e.target.value }))} />
              </Campo>
              <Campo label="Registro RETHUS de la doctora">
                <input value={formConfig.rethus || ''}
                  onChange={e => setFormConfig(f => ({ ...f, rethus: e.target.value }))} />
              </Campo>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="act" onClick={guardarConfig}>Guardar</button>
              <button className="act ghost" onClick={() => { setFormConfig(config); setEditandoConfig(false) }}>Cancelar</button>
            </div>
          </>
        )}
        <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12 }}>
          Estos datos van en el archivo RIPS oficial (el botón "Descargar JSON"). El CSV no los necesita.
        </p>
      </div>
    </>
  )
}
