const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const MESES_LARGO = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

// Agrupa una lista por mes/año (más reciente primero), a partir de una fecha ISO.
export function agruparPorMes(items, obtenerFecha) {
  const grupos = {}
  items.forEach(item => {
    const iso = obtenerFecha(item)
    if (!iso) return
    const [a, m] = iso.slice(0, 10).split('-')
    const clave = `${a}-${m}`
    if (!grupos[clave]) grupos[clave] = { clave, etiqueta: `${MESES_LARGO[Number(m) - 1]} ${a}`, items: [] }
    grupos[clave].items.push(item)
  })
  return Object.values(grupos).sort((a, b) => b.clave.localeCompare(a.clave))
}

export function fecha(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`
}

export function fechaCorta(iso) {
  if (!iso) return '—'
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)} ${MESES[Number(m) - 1]}`
}

export function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export function pesos(v) {
  return '$' + Number(v || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

export function edad(nacimiento) {
  if (!nacimiento) return null
  const n = new Date(nacimiento)
  const h = new Date()
  let e = h.getFullYear() - n.getFullYear()
  const m = h.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--
  return e
}

export function nombreCompleto(p) {
  if (!p) return ''
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function iniciales(nombre) {
  return (nombre || '?').split(' ').filter(Boolean).slice(0, 2)
    .map(p => p[0]).join('').toUpperCase()
}

export function semaforo(fechaVenc) {
  if (!fechaVenc) return { nivel: 'ok', texto: 'Sin vencimiento' }
  const dias = Math.ceil((new Date(fechaVenc) - new Date()) / 86400000)
  if (dias < 0)    return { nivel: 'warn', texto: 'Vencido', dias }
  if (dias <= 90)  return { nivel: 'warn', texto: `${dias} días`, dias }
  if (dias <= 180) return { nivel: 'soon', texto: `${Math.round(dias / 30)} meses`, dias }
  return { nivel: 'ok', texto: `${Math.round(dias / 30)} meses`, dias }
}
