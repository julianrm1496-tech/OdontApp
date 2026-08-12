import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fecha, hoy, pesos, edad, nombreCompleto } from './format'

const NOMBRE_CARA = { v: 'Vestibular', d: 'Distal', l: 'Lingual', m: 'Mesial', o: 'Oclusal' }
const NOMBRE_ESTADO_CARA = { caries: 'Caries', obturacion: 'Obturación', sellante: 'Sellante' }
const NOMBRE_ESTADO_PIEZA = {
  corona: 'Corona', provisional: 'Provisional', protesis_removible: 'Prótesis removible',
  perno: 'Perno', endodoncia: 'Endodoncia', extraccion_indicada: 'Extracción indicada',
  extraido: 'Extraído', sin_erupcionar: 'Sin erupcionar', en_erupcion: 'En erupción',
}

function resumenOdontograma(dientes) {
  const lineas = []
  Object.entries(dientes || {}).forEach(([pieza, caras]) => {
    Object.entries(caras || {}).forEach(([cara, m]) => {
      if (!m) return
      const cond = m.condicion === 'bueno' ? 'buen estado' : 'mal estado / por hacer'
      const nombre = cara === 'diente' ? NOMBRE_ESTADO_PIEZA[m.estado] : NOMBRE_ESTADO_CARA[m.estado]
      const parte = cara === 'diente' ? '' : ` (${NOMBRE_CARA[cara]})`
      if (nombre) lineas.push(`Pieza ${pieza}${parte} — ${nombre}, ${cond}`)
    })
  })
  return lineas
}

export function generarPdfHistoria({ paciente, atenciones, plan, pagos, dientes }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margen = 40
  let y = 50

  const linea = () => { doc.setDrawColor(200); doc.line(margen, y, 555, y); y += 14 }
  const titulo = (t) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text(t, margen, y); y += 16
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  }
  const campo = (label, valor) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, margen, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(valor ?? '—'), margen + 120, y)
    y += 15
  }
  const saltoPagina = () => { if (y > 740) { doc.addPage(); y = 50 } }

  // ---------- encabezado ----------
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('HISTORIA CLÍNICA ODONTOLÓGICA', margen, y); y += 18
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(`Generado el ${fecha(hoy())}`, margen, y); y += 20

  // ---------- datos personales ----------
  titulo('DATOS PERSONALES')
  const nombre = nombreCompleto(paciente)
  const años = edad(paciente.fecha_nacimiento)
  campo('Nombre', nombre)
  campo('Documento', `${paciente.tipo_documento} ${paciente.documento}`)
  campo('Fecha de nacimiento', paciente.fecha_nacimiento ? fecha(paciente.fecha_nacimiento) : '—')
  campo('Edad', años != null ? `${años} años` : '—')
  campo('Sexo', paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : '—')
  campo('Grupo sanguíneo', paciente.grupo_sanguineo)
  campo('Estado civil', paciente.estado_civil)
  campo('Ocupación', paciente.ocupacion)
  campo('Teléfono', paciente.telefono)
  campo('Dirección', paciente.direccion)
  campo('Localidad', paciente.localidad)
  campo('EPS / Tipo', paciente.tipo_usuario === 'eps' ? (paciente.eps || 'EPS') : 'Particular')
  campo('Responsable', paciente.responsable ? `${paciente.responsable} · ${paciente.responsable_tel || ''}` : '—')
  campo('Acompañante', paciente.acompanante ? `${paciente.acompanante} · ${paciente.acompanante_tel || ''}` : '—')
  y += 6
  linea()

  // ---------- alteraciones ----------
  saltoPagina()
  titulo('ALTERACIONES Y ANTECEDENTES')
  const alteraciones = [
    ['Patología', paciente.patologia], ['Farmacoterapia', paciente.farmacoterapia],
    ['Alergia', paciente.alergia], ['Cirugías', paciente.cirugias],
    ['Trauma', paciente.trauma], ['Antecedentes', paciente.antecedentes],
    ['Ocupación familiar', paciente.ocupacion_familia], ['Otro', paciente.otro],
  ].filter(([, v]) => v)

  if (alteraciones.length === 0) {
    doc.text('Sin alteraciones registradas.', margen, y); y += 15
  } else {
    autoTable(doc, {
      startY: y, margin: { left: margen, right: 40 },
      head: [['Alteración', 'Observación']],
      body: alteraciones,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15, 23, 42] },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 18
  }

  // ---------- odontograma (resumen textual) ----------
  saltoPagina()
  titulo('ODONTOGRAMA')
  const resumen = resumenOdontograma(dientes)
  if (resumen.length === 0) {
    doc.text('Sin marcas registradas en el odontograma.', margen, y); y += 15
  } else {
    doc.setFontSize(9)
    resumen.forEach(l => {
      saltoPagina()
      doc.text('•  ' + l, margen, y); y += 13
    })
    doc.setFontSize(10)
  }
  y += 6

  // ---------- plan de tratamiento ----------
  saltoPagina()
  titulo('PLAN DE TRATAMIENTO')
  if (!plan || plan.length === 0) {
    doc.text('Sin plan de tratamiento registrado.', margen, y); y += 15
  } else {
    autoTable(doc, {
      startY: y, margin: { left: margen, right: 40 },
      head: [['Tratamiento', 'Pieza', 'Valor', 'Estado']],
      body: plan.map(p => [p.descripcion, p.pieza || '—', pesos(p.valor), p.estado === 'hecho' ? 'Hecho' : 'Pendiente']),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15, 23, 42] },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 10
    const totalPlan = plan.reduce((s, p) => s + Number(p.valor || 0), 0)
    const totalAbonos = (pagos || []).reduce((s, p) => s + Number(p.valor || 0), 0)
    doc.setFontSize(9)
    doc.text(`Valor del tratamiento: ${pesos(totalPlan)}   ·   Total abonado: ${pesos(totalAbonos)}   ·   Saldo: ${pesos(totalPlan - totalAbonos)}`, margen, y)
    y += 20
    doc.setFontSize(10)
  }

  // ---------- evolución ----------
  saltoPagina()
  titulo('EVOLUCIÓN')
  if (!atenciones || atenciones.length === 0) {
    doc.text('Sin atenciones registradas.', margen, y); y += 15
  } else {
    autoTable(doc, {
      startY: y, margin: { left: margen, right: 40 },
      head: [['Fecha', 'Evolución', 'Procedimiento', 'Valor']],
      body: atenciones.map(a => [
        fecha(a.fecha), a.evolucion || '—', a.procedimiento || '—', pesos(a.valor),
      ]),
      styles: { fontSize: 8.5, cellPadding: 5, overflow: 'linebreak' },
      columnStyles: { 1: { cellWidth: 220 } },
      headStyles: { fillColor: [15, 23, 42] },
      theme: 'grid',
    })
  }

  const nombreArchivo = `Historia_${paciente.primer_apellido || ''}_${paciente.primer_nombre || ''}`
    .replace(/\s+/g, '_')
  doc.save(`${nombreArchivo}.pdf`)
}
