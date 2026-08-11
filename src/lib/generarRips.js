// Genera el archivo RIPS en formato JSON, con la misma estructura
// que exige el Ministerio (verificada contra un archivo real ya aprobado).

function formatoFechaHora(fecha, hora) {
  // el RIPS pide "AAAA-MM-DD HH:MM", con cero adelante en la hora
  const [h = '00', m = '00'] = (hora || '00:00').split(':')
  const hh = h.padStart(2, '0')
  const mm = m.padStart(2, '0')
  return `${fecha} ${hh}:${mm}`
}

export function generarJsonRips({ config, atencionesPorPaciente, numNota }) {
  const usuarios = atencionesPorPaciente.map((grupo, i) => {
    const p = grupo.paciente
    return {
      tipoDocumentoIdentificacion: p.tipo_documento,
      numDocumentoIdentificacion: p.documento,
      tipoUsuario: p.tipo_usuario_rips || '12',
      fechaNacimiento: p.fecha_nacimiento,
      codSexo: p.sexo,
      codPaisResidencia: p.cod_pais_residencia || '170',
      codMunicipioResidencia: p.cod_municipio_residencia || '11001',
      codZonaTerritorialResidencia: p.cod_zona_territorial || '02',
      incapacidad: 'NO',
      codPaisOrigen: '170',
      consecutivo: i + 1,
      servicios: {
        procedimientos: grupo.atenciones.map((a, j) => ({
          codPrestador: config.codigo_prestador,
          fechaInicioAtencion: formatoFechaHora(a.fecha, a.hora_inicio),
          idMIPRES: null,
          numAutorizacion: a.num_autorizacion || null,
          codProcedimiento: a.cups,
          viaIngresoServicioSalud: a.via_ingreso || '01',
          modalidadGrupoServicioTecSal: a.modalidad || '01',
          grupoServicios: a.grupo_servicios_cod || '01',
          codServicio: Number(a.cod_servicio) || 334,
          finalidadTecnologiaSalud: a.finalidad || '16',
          tipoDocumentoIdentificacion: p.tipo_documento,
          numDocumentoIdentificacion: p.documento,
          codDiagnosticoPrincipal: (a.cie10 || '').trim(),
          codDiagnosticoRelacionado: a.cie10_1 ? a.cie10_1.trim() : null,
          codComplicacion: null,
          vrServicio: Number(a.valor) || 0,
          conceptoRecaudo: '05',
          valorPagoModerador: Number(a.valor_pago_moderador) || 0,
          numFEVPagoModerador: null,
          consecutivo: j + 1,
        })),
      },
    }
  })

  return {
    numDocumentoIdObligado: config.num_documento_id_obligado,
    numFactura: null,
    tipoNota: 'RS',
    numNota: numNota,
    usuarios,
  }
}

// Agrupa una lista plana de atenciones (con su paciente embebido) en la
// estructura "un paciente con varios procedimientos" que pide el RIPS.
export function agruparPorPaciente(atenciones) {
  const mapa = new Map()
  atenciones.forEach(a => {
    const clave = `${a.pacientes.tipo_documento}-${a.pacientes.documento}`
    if (!mapa.has(clave)) mapa.set(clave, { paciente: a.pacientes, atenciones: [] })
    mapa.get(clave).atenciones.push(a)
  })
  return Array.from(mapa.values())
}
