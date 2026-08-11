import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fecha, hoy } from '../lib/format'
import { useToast, useConfirmar, IconoEliminar, Cargando } from './ui'

const BUCKET = 'radiografias'
const TIPOS_VALIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAM_MAXIMO = 8 * 1024 * 1024   // 8MB, suficiente para una radiografía normal

export default function Radiografias({ pacienteId }) {
  const [lista, setLista] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [ampliada, setAmpliada] = useState(null)
  const inputArchivo = useRef(null)
  const toast = useToast()
  const confirmar = useConfirmar()

  const cargar = async () => {
    const { data, error } = await supabase.from('imagenes')
      .select('*').eq('paciente_id', pacienteId).order('fecha', { ascending: false })
    if (error) { toast('No se pudieron cargar las radiografías'); setLista([]); return }

    // genera un enlace temporal para cada foto (el bucket es privado)
    const conUrl = await Promise.all((data || []).map(async (img) => {
      const { data: firmada } = await supabase.storage.from(BUCKET)
        .createSignedUrl(img.ruta, 3600)
      return { ...img, url: firmada?.signedUrl }
    }))
    setLista(conUrl)
  }

  useEffect(() => { cargar() }, [pacienteId])

  const subirArchivo = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''   // permite volver a elegir el mismo archivo después
    if (!archivo) return

    if (!TIPOS_VALIDOS.includes(archivo.type)) {
      toast('Solo se aceptan fotos JPG, PNG o WEBP'); return
    }
    if (archivo.size > TAM_MAXIMO) {
      toast('La foto pesa demasiado (máximo 8MB)'); return
    }

    setSubiendo(true)
    const nombre = `${pacienteId}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: errSubida } = await supabase.storage.from(BUCKET).upload(nombre, archivo)
    if (errSubida) {
      setSubiendo(false)
      toast('No se pudo subir la foto')
      return
    }
    const { error: errFila } = await supabase.from('imagenes').insert({
      paciente_id: pacienteId, ruta: nombre, fecha: hoy(),
    })
    setSubiendo(false)
    if (errFila) { toast('La foto se subió pero no se pudo registrar'); return }
    toast('Radiografía guardada')
    cargar()
  }

  const eliminar = (img) => confirmar({
    titulo: 'Eliminar radiografía',
    mensaje: `¿Eliminar esta foto del ${fecha(img.fecha)}?`,
    detalle: 'No se puede deshacer.',
    textoBoton: 'Sí, eliminar',
    onConfirmar: async () => {
      await supabase.storage.from(BUCKET).remove([img.ruta])
      const { error } = await supabase.from('imagenes').delete().eq('id', img.id)
      if (error) { toast('No se pudo eliminar'); return }
      toast('Radiografía eliminada')
      cargar()
    },
  })

  return (
    <div className="card mb">
      <div className="card-head">
        <h2>Radiografías</h2>
        <button className="act sm" disabled={subiendo} onClick={() => inputArchivo.current?.click()}>
          {subiendo ? 'Subiendo…' : '+ Subir foto'}
        </button>
        <input ref={inputArchivo} type="file" accept="image/jpeg,image/png,image/webp"
          onChange={subirArchivo} style={{ display: 'none' }} />
      </div>

      {lista === null ? <Cargando /> :
       lista.length === 0 ? (
        <p className="nota">Sin radiografías guardadas. Suba una foto desde el celular o el computador.</p>
       ) : (
        <div className="grid-fotos">
          {lista.map(img => (
            <div className="foto-item" key={img.id}>
              {img.url ? (
                <img src={img.url} alt="Radiografía" onClick={() => setAmpliada(img)} loading="lazy" />
              ) : (
                <div className="foto-rota">No se pudo cargar</div>
              )}
              <div className="foto-pie">
                <span className="sub">{fecha(img.fecha)}</span>
                <button className="icono danger" title="Eliminar" onClick={() => eliminar(img)}>
                  <IconoEliminar />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ampliada && (
        <div className="overlay" onClick={() => setAmpliada(null)}>
          <img className="foto-ampliada" src={ampliada.url} alt="Radiografía ampliada" />
        </div>
      )}
    </div>
  )
}
