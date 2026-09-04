import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fecha, edad, nombreCompleto } from './format'

// Nombre y registro de la doctora que firma — cámbialo aquí si algún día cambia
// o cuando tengas el número de RETHUS a la mano.
export const NOMBRE_DOCTORA = 'María Paula Martínez'
export const RETHUS_DOCTORA = ''   // ej: '12345678901' — se deja en blanco hasta que la tengas

export function generarPdfFormula({ paciente, formula }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margen = 40
  let y = 50

  const campo = (label, valor) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, margen, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(valor ?? '—'), margen + 100, y)
    y += 15
  }
  const titulo = (t) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text(t, margen, y); y += 16
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  }

  // ---------- encabezado ----------
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('FÓRMULA MÉDICA', margen, y); y += 18
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(`OdontApp · Consultorio odontológico`, margen, y); y += 20

  // ---------- datos del paciente ----------
  titulo('DATOS DEL PACIENTE')
  campo('Nombre', nombreCompleto(paciente))
  campo('Documento', `${paciente.tipo_documento || 'CC'} ${paciente.documento || '—'}`)
  campo('Edad', paciente.fecha_nacimiento ? `${edad(paciente.fecha_nacimiento)} años` : '—')
  campo('Fecha', fecha(formula.fecha))
  y += 8

  // ---------- medicamentos ----------
  titulo('MEDICAMENTOS FORMULADOS')
  autoTable(doc, {
    startY: y, margin: { left: margen, right: 40 },
    head: [['Medicamento', 'Dosificación']],
    body: (formula.medicamentos || []).map(m => [m.nombre || '—', m.dosificacion || '—']),
    styles: { fontSize: 9.5, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 0: { cellWidth: 200 } },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 22

  // ---------- recomendación ----------
  if (formula.recomendacion) {
    titulo('RECOMENDACIÓN')
    const lineas = doc.splitTextToSize(formula.recomendacion, 515)
    doc.text(lineas, margen, y)
    y += lineas.length * 13 + 20
  }

  // ---------- firma ----------
  const ySigna = Math.max(y + 40, 660)
  doc.setDrawColor(120)
  doc.line(margen, ySigna, margen + 220, ySigna)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text(NOMBRE_DOCTORA, margen, ySigna + 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(`RETHUS: ${RETHUS_DOCTORA || '_______________'}`, margen, ySigna + 28)

  doc.save(`formula_${(paciente.documento || 'paciente')}_${formula.fecha}.pdf`)
}
