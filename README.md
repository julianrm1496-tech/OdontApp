# Consultorio — gestión odontológica

App web para gestión de consultorio odontológico. React + Vite, Supabase, deploy en Vercel.

## Puesta en marcha

### 1. Supabase

1. Crear proyecto nuevo en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `schema.sql`
3. Ir a **Storage** → crear bucket `radiografias`, marcarlo **privado**, y ejecutar las políticas comentadas al final de `schema.sql`
4. Ir a **Authentication → Users** → crear el usuario de la odontóloga manualmente (correo + contraseña). No hay registro público a propósito: la app la usa una sola persona.
5. Copiar de **Project Settings → API**: la URL del proyecto y la `anon key`

### 2. Local

```bash
cp .env.example .env      # pegar URL y anon key
npm install
npm run dev
```

### 3. Deploy en Vercel

- Importar el repo
- Agregar las dos variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Framework preset: Vite

## Estructura

```
schema.sql              Tablas, índices y políticas de seguridad
src/
  lib/
    supabase.js         Cliente de Supabase
    format.js           Fechas, pesos, semáforo de vencimientos
  components/
    Layout.jsx          Navegación lateral y móvil
    ui.jsx              Modal, avisos, estados vacíos
  pages/
    Login.jsx           Entrada con correo y contraseña
    Inicio.jsx          Resumen del día y alertas
    Pacientes.jsx       Lista, buscador y registro
    Ficha.jsx           Historia clínica, odontograma y evolución
    Inventario.jsx      Insumos con semáforo de vencimiento
    Bioseguridad.jsx    Esterilización, residuos y ambiente
    Pagos.jsx           Cobros y saldos pendientes
```

## Basado en sus formatos reales

El esquema y los formularios salen del archivo de trabajo de la doctora, no de supuestos:

- `PACIENTES 2025` de su Excel es literalmente el RIPS → define los campos de `pacientes` y `atenciones`
- `CODIGOS` trae los CUPS y CIE-10 que ella usa → cargados en `src/lib/catalogos.js`
- `ESTERILIZACION`, `RH1` y `TEMPERATURA Y HUMEDAD` → definen los tres formularios de bioseguridad
- `FORMATO MEDICAMENTOS Y DISPOSIT` → define los campos de inventario
- Su historia clínica en Word → define los campos de paciente y la tabla de alteraciones

## Decisiones tomadas

**Un paciente, una historia.** Cada paciente tiene un expediente único que acumula sus visitas
(relación 1 a muchos con `atenciones`). No hay historias sueltas por cita.

**Odontograma con convención roja y azul.** El color no es decorativo: rojo significa por hacer
o en mal estado, azul significa hecho o en buen estado. Por eso cada marca guarda dos cosas —
`estado` (qué es) y `condicion` (rojo o azul). Verde se reserva para diente en erupción.

**Cinco caras por diente.** Vestibular, lingual/palatina, mesial, distal y oclusal, cada una con
su propio estado. Los estados de pieza completa (corona, endodoncia, extraído, prótesis, perno,
provisional, sin erupcionar, en erupción, extracción indicada) van en la cara `diente`.

**Las cuatro arcadas siempre visibles.** Permanentes 11-48 y temporales 51-85, igual que en su
formato de papel. Sin selector de dentición: en dentición mixta necesita ver ambas de una.

**Se marca eligiendo herramienta.** Se selecciona qué se va a marcar y si es rojo o azul, luego
se toca la cara o el número del diente. Tocar de nuevo borra.

**Odontograma con estado actual.** Se guarda el estado presente de cada cara, no el histórico de
cambios. Suficiente para el MVP; el histórico se puede agregar después sin romper nada.

**Bioseguridad en una sola tabla.** Los tres controles (esterilización, residuos, ambiente) comparten
tabla y se diferencian por el campo `tipo`, con lo específico de cada uno en un campo `datos` flexible.
Agregar un cuarto control no requiere migración.

**Semáforo de vencimientos.** Verde sobre 6 meses, amarillo entre 3 y 6, rojo bajo 3 meses —
la misma lógica que ella ya usa mentalmente.

**Un solo usuario.** Cualquier sesión autenticada tiene acceso completo. Si más adelante entra
una auxiliar, hay que agregar roles y ajustar las políticas.

## Pendiente para fase 2

- Carga de radiografías al bucket de Storage (la tabla `imagenes` ya está lista)
- Sincronización con Google Calendar
- Códigos CUPS y CIE10 en las atenciones (los campos ya existen en `atenciones`)
- Generación de RIPS en JSON
- Facturación electrónica vía proveedor externo
