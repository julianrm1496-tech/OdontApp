import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useConfirmar } from './ui'
import BuscadorGlobal from './BuscadorGlobal'
import {
  LayoutDashboard, CalendarDays, Users, Archive, ShieldCheck, Wallet, FileText,
  LogOut, Menu, X, Sun, Moon,
} from 'lucide-react'

const SECCIONES = [
  { to: '/',            Ic: LayoutDashboard, label: 'Inicio',    exact: true },
  { to: '/agenda',      Ic: CalendarDays,    label: 'Agenda' },
  { to: '/pacientes',   Ic: Users,           label: 'Pacientes' },
  { to: '/inventario',  Ic: Archive,         label: 'Inventario' },
  { to: '/bioseguridad',Ic: ShieldCheck,     label: 'Bioseguridad' },
  { to: '/pagos',       Ic: Wallet,          label: 'Pagos' },
  { to: '/rips',        Ic: FileText,        label: 'RIPS' },
]

const ANCHO_ESCRITORIO = 880

// Encuentra la sección actual a partir de la ruta, incluso en rutas
// anidadas como /pacientes/:id (la ficha hereda el título "Pacientes").
function seccionActual(pathname) {
  const exacta = SECCIONES.find(s => pathname === s.to)
  if (exacta) return exacta
  const padre = SECCIONES
    .filter(s => s.to !== '/' && pathname.startsWith(s.to))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return padre || SECCIONES[0]
}

export default function Layout() {
  const confirmar = useConfirmar()
  // En PC el panel arranca visible (fijo); en celular arranca oculto para
  // no robar espacio. Se detecta una sola vez al montar.
  const [abierto, setAbierto] = useState(() => typeof window !== 'undefined' && window.innerWidth >= ANCHO_ESCRITORIO)
  const [tema, setTema] = useState(() => localStorage.getItem('tema') || 'claro')
  const location = useLocation()
  const seccion = seccionActual(location.pathname)

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('tema', tema)
  }, [tema])

  // En celular, elegir una sección cierra el cajón (es un overlay).
  // En PC el panel es fijo y se queda abierto al navegar.
  const cerrarSiEsMovil = () => {
    if (window.innerWidth < ANCHO_ESCRITORIO) setAbierto(false)
  }

  const salir = () => confirmar({
    titulo: 'Cerrar sesión',
    mensaje: '¿Cerrar sesión?',
    detalle: 'Tendrá que ingresar su correo y contraseña para volver a entrar.',
    textoBoton: 'Sí, cerrar sesión',
    peligro: false,
    onConfirmar: async () => { await supabase.auth.signOut() },
  })

  return (
    <div className={'shell' + (abierto ? ' nav-abierto' : '')}>
      <header className="topbar">
        <button className="topbar-menu-btn" onClick={() => setAbierto(v => !v)} title="Mostrar u ocultar el menú">
          <Menu size={19} strokeWidth={2} />
        </button>
        <div className="topbar-seccion">
          <div className="topbar-icon"><seccion.Ic size={15} strokeWidth={2} /></div>
          <span className="topbar-title">{seccion.label}</span>
        </div>
        <div style={{ flex: 1 }} />
        <BuscadorGlobal />
      </header>

      <div className={'sidebar-overlay' + (abierto ? ' abierto' : '')} onClick={() => setAbierto(false)} />
      <aside className={'nav' + (abierto ? ' abierto' : '')}>
        <div className="brand">
          <div className="mark">Odont<span>App</span></div>
          <button className="nav-cerrar" onClick={() => setAbierto(false)} title="Ocultar menú">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        {SECCIONES.map(s => (
          <NavLink key={s.to} to={s.to} end={s.exact} onClick={cerrarSiEsMovil}
            className={({ isActive }) => isActive ? 'on' : ''}>
            <s.Ic size={17} strokeWidth={2} className="ic" />{s.label}
          </NavLink>
        ))}
        <div className="nav-foot">
          <button className="nav-tema" onClick={() => setTema(t => t === 'oscuro' ? 'claro' : 'oscuro')}>
            {tema === 'oscuro' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
            {tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button onClick={salir}><LogOut size={15} strokeWidth={2} />Cerrar sesión</button>
          <div className="nav-version">OdontApp</div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
