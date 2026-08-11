import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ToastProvider, ConfirmarProvider, Cargando } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Inicio from './pages/Inicio'

/* Estas pantallas se cargan solo cuando se abren, no al arrancar la app.
   Así la primera carga es más liviana, sobre todo en datos móviles.
   Ficha y Rips son las más pesadas (jsPDF y el generador de RIPS). */
const Agenda       = lazy(() => import('./pages/Agenda'))
const Pacientes    = lazy(() => import('./pages/Pacientes'))
const Ficha        = lazy(() => import('./pages/Ficha'))
const Inventario   = lazy(() => import('./pages/Inventario'))
const Bioseguridad = lazy(() => import('./pages/Bioseguridad'))
const Pagos        = lazy(() => import('./pages/Pagos'))
const Rips         = lazy(() => import('./pages/Rips'))

export default function App() {
  const [sesion, setSesion] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (sesion === undefined) return <Cargando texto="Abriendo el consultorio…" />
  if (!sesion) return <Login />

  return (
    <ToastProvider>
      <ConfirmarProvider>
        <Suspense fallback={<Cargando texto="Cargando…" />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/"                 element={<Inicio />} />
              <Route path="/agenda"           element={<Agenda />} />
              <Route path="/pacientes"        element={<Pacientes />} />
              <Route path="/pacientes/:id"    element={<Ficha />} />
              <Route path="/inventario"       element={<Inventario />} />
              <Route path="/bioseguridad"     element={<Bioseguridad />} />
              <Route path="/pagos"            element={<Pagos />} />
              <Route path="/rips"             element={<Rips />} />
              <Route path="*"                 element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ConfirmarProvider>
    </ToastProvider>
  )
}
