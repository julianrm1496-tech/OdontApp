import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Campo } from '../components/ui'
import { Loader2 } from 'lucide-react'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const entrar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
    if (error) setError('Correo o contraseña incorrectos. Intente de nuevo.')
    setCargando(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="mark">Odont<span>App</span></div>

        {error && <div className="err">{error}</div>}

        <form onSubmit={entrar} style={{ display: 'grid', gap: 14 }}>
          <Campo label="Correo">
            <input type="email" value={correo} onChange={e => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com" required autoComplete="email" autoFocus />
          </Campo>
          <Campo label="Contraseña">
            <input type="password" value={clave} onChange={e => setClave(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password" />
          </Campo>
          <button className="act" type="submit" disabled={cargando} style={{ marginTop: 4 }}>
            {cargando ? <><Loader2 size={15} className="girando" /> Entrando…</> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
