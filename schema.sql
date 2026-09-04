-- ============================================================
--  Consultorio odontológico — esquema de base de datos
--  Campos tomados de los formatos reales de la doctora.
--  Ejecutar en Supabase → SQL Editor
-- ============================================================

-- ---------- CONFIGURACIÓN DEL PRESTADOR (para el RIPS) ----------
-- Una sola fila con los datos fijos que exige el archivo RIPS.
create table if not exists configuracion (
  id                      int primary key default 1,
  num_documento_id_obligado text,   -- NIT o documento de la doctora como prestadora
  codigo_prestador         text,    -- código de habilitación REPS (12 dígitos)
  rethus                   text,    -- registro profesional de la doctora
  check (id = 1)
);
insert into configuracion (id) values (1) on conflict (id) do nothing;
alter table configuracion enable row level security;
do $$ begin
  create policy "acceso_autenticado" on configuracion for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ---------- PACIENTES ----------
-- Nombres separados en cuatro campos porque el RIPS los exige así.
create table if not exists pacientes (
  id                uuid primary key default gen_random_uuid(),
  historia          text,                       -- N.º de historia clínica
  primer_nombre     text not null,
  segundo_nombre    text,
  primer_apellido   text not null,
  segundo_apellido  text,
  tipo_documento    text not null default 'CC',
  documento         text not null,
  fecha_nacimiento  date,
  sexo              text,                       -- F | M
  estado_civil      text,
  grupo_sanguineo   text,
  ocupacion         text,
  telefono          text,
  correo            text,
  direccion         text,
  localidad         text,
  zona_residencia   text default 'U',           -- U urbana | R rural
  cod_pais_residencia text default '170',        -- 170 = Colombia
  cod_municipio_residencia text default '11001', -- código DANE del municipio, 11001 = Bogotá
  cod_zona_territorial text default '02',        -- 01 cabecera | 02 resto/urbano | 03 rural disperso
  tipo_usuario_rips text default '12',           -- régimen RIPS: 12 = particular, ver catálogo Ministerio
  tipo_usuario      text not null default 'particular',  -- particular | eps
  eps               text,
  responsable       text,
  responsable_tel   text,
  acompanante       text,
  parentesco_acompanante text,        -- ej: madre, esposo, hijo...
  acompanante_tel   text,
  -- tabla de alteraciones del formato en papel
  patologia         text,
  farmacoterapia    text,
  alergia           text,
  cirugias          text,
  trauma            text,
  antecedentes      text,
  ocupacion_familia text,
  otro              text,
  creado_en         timestamptz not null default now(),
  unique (tipo_documento, documento)
);

create index if not exists idx_pacientes_doc on pacientes (documento);
create index if not exists idx_pacientes_ap  on pacientes (lower(primer_apellido));

-- ---------- ATENCIONES (cada visita) ----------
create table if not exists atenciones (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references pacientes(id) on delete cascade,
  fecha          date not null default current_date,
  hora_inicio    text,
  hora_fin       text,
  grupo_servicio text,
  motivo         text,          -- motivo de consulta
  evolucion      text,
  cie10          text,          -- diagnóstico principal
  cie10_1        text,          -- diagnóstico secundario
  tipo_dx        text,          -- 1 impresión diagnóstica | 2 confirmado nuevo | 3 confirmado repetido
  cups           text,          -- procedimiento
  procedimiento  text,          -- nombre del procedimiento
  via_ingreso    text default '01',   -- vía de ingreso al servicio
  modalidad      text default '01',   -- modalidad de atención
  grupo_servicios_cod text default '01',  -- código de grupo de servicios del RIPS
  cod_servicio   text default '334',  -- código interno del servicio (334 = odontología general)
  finalidad      text default '16',   -- finalidad de la tecnología en salud
  num_autorizacion text,        -- solo aplica a pacientes EPS
  valor_pago_moderador numeric(12,2) default 0,
  piezas         text,
  valor          numeric(12,2) default 0,
  abono          numeric(12,2) default 0,
  plan_tratamiento_id uuid references plan_tratamiento(id) on delete set null,  -- si esta atención viene de un plan pendiente
  creado_en      timestamptz not null default now()
);

create index if not exists idx_atenciones_paciente on atenciones (paciente_id, fecha desc);
create index if not exists idx_atenciones_fecha    on atenciones (fecha desc);

-- ---------- PLAN DE TRATAMIENTO ----------
create table if not exists plan_tratamiento (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null references pacientes(id) on delete cascade,
  descripcion  text not null,      -- "Resina 22", "Endodoncia 11"
  pieza        text,
  valor        numeric(12,2) not null default 0,
  estado       text not null default 'pendiente',  -- pendiente | hecho
  fecha_realizado date,            -- cuándo se hizo, si ya está en estado 'hecho'
  orden        int default 0,
  creado_en    timestamptz not null default now()
);

create index if not exists idx_plan_paciente on plan_tratamiento (paciente_id, orden);

-- ---------- ODONTOGRAMA ----------
-- Convención roja y azul: el estado dice QUÉ es, la condición dice
-- si está por hacer / en mal estado (rojo) o hecho / en buen estado (azul).
create table if not exists odontograma (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null references pacientes(id) on delete cascade,
  pieza         text not null,     -- FDI: permanentes 11-48, temporales 51-85
  cara          text not null,     -- diente | v | l | m | d | o
  estado        text not null,
  condicion     text not null default 'malo',   -- malo (rojo) | bueno (azul) | negro | verde
  actualizado   timestamptz not null default now(),
  unique (paciente_id, pieza, cara, estado)   -- una pieza/cara puede tener varios estados a la vez
);

create index if not exists idx_odonto_paciente on odontograma (paciente_id);

-- Caras:  v vestibular, l lingual/palatina, m mesial, d distal, o oclusal/incisal
-- Estados por cara:    caries (punto rojo) | obturacion (superficie pintada) | sellante (letra S)
-- Estados de la pieza: corona | endodoncia | protesis_removible | perno |
--                      extraido | extraccion_indicada | sin_erupcionar |
--                      en_erupcion | provisional
-- condicion: 'malo' = rojo (por hacer / mal estado) | 'bueno' = azul (hecho / buen estado)
-- 'en_erupcion' siempre se pinta verde, sin importar condicion.

-- ---------- IMÁGENES Y RADIOGRAFÍAS ----------
create table if not exists formulas_medicas (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null references pacientes(id) on delete cascade,
  fecha         date not null,
  medicamentos  jsonb not null default '[]',   -- [{nombre, dosificacion}]
  recomendacion text,
  creado_en     timestamptz not null default now()
);

create table if not exists imagenes (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null references pacientes(id) on delete cascade,
  atencion_id  uuid references atenciones(id) on delete set null,
  ruta         text not null,
  descripcion  text,
  fecha        date not null default current_date,
  creado_en    timestamptz not null default now()
);

create index if not exists idx_imagenes_paciente on imagenes (paciente_id, fecha desc);

-- ---------- INVENTARIO ----------
-- Campos del formato de medicamentos y dispositivos médicos.
create table if not exists inventario (
  id                 uuid primary key default gen_random_uuid(),
  principio_activo   text not null,     -- nombre del insumo
  forma              text,              -- jeringa, frasco, cartucho…
  concentracion      text,              -- 4G, 2%…
  lote               text,
  fecha_vencimiento  date,
  presentacion       text,              -- referencia comercial: FORMA A2B, 3M Filtek…
  unidad             text,              -- unidad de medida
  registro_sanitario text,
  fecha_apertura     date,
  fecha_desecho      date,
  creado_en          timestamptz not null default now()
);

create index if not exists idx_inventario_venc on inventario (fecha_vencimiento);

-- ---------- BIOSEGURIDAD ----------
-- Un solo registro por tipo; lo específico va en "datos".
create table if not exists bioseguridad (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null,   -- esterilizacion | residuos | ambiente
  fecha       date not null default current_date,
  datos       jsonb not null default '{}'::jsonb,
  creado_en   timestamptz not null default now()
);

create index if not exists idx_bio_tipo_fecha on bioseguridad (tipo, fecha desc);

-- Contenido de "datos" según el tipo:
--   esterilizacion → {"lote":"1","hora":"14:30","paquetes":6,"descripcion":"Instrumental de examen",
--                     "tiempo":45,"temperatura":134,"cinta":"conforme","indicador":"conforme",
--                     "trazabilidad":"conforme"}
--   residuos       → {"aprovechables":0.073,"no_aprovechables":0.13,"biosanitarios":0.28,
--                     "cortopunzantes":0,"mercuriales":0,"farmaceuticos":0,"otros":0}
--   ambiente       → {"manana":{"temperatura":22,"humedad":50,"hora":"08:00"},
--                     "tarde":{"temperatura":24,"humedad":54,"hora":"15:00"}}

-- ---------- CITAS (agenda interna) ----------
create table if not exists citas (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid references pacientes(id) on delete set null,
  paciente_nombre text,          -- para citas de alguien que aún no está registrado
  fecha         date not null,
  hora          text not null,   -- "09:00"
  duracion      int not null default 30,   -- minutos
  motivo        text,
  estado        text not null default 'pendiente',  -- pendiente | confirmada | atendida | cancelada
  creado_en     timestamptz not null default now()
);

create index if not exists idx_citas_fecha on citas (fecha);

alter table citas enable row level security;

do $$
begin
  begin
    create policy "acceso_autenticado" on citas for all to authenticated using (true) with check (true);
  exception when duplicate_object then null;
  end;
end $$;

-- ---------- PAGOS Y ABONOS ----------
create table if not exists pagos (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  atencion_id uuid references atenciones(id) on delete set null,
  fecha       date not null default current_date,
  concepto    text,
  valor       numeric(12,2) not null default 0,
  metodo      text,            -- efectivo | transferencia | tarjeta
  creado_en   timestamptz not null default now()
);

create index if not exists idx_pagos_fecha on pagos (fecha desc);
create index if not exists idx_pagos_paciente on pagos (paciente_id, fecha desc);

-- ============================================================
--  SEGURIDAD
--  Lo usa una sola persona: cualquier sesión autenticada tiene
--  acceso completo. Sin sesión no se ve nada.
-- ============================================================

alter table pacientes        enable row level security;
alter table atenciones       enable row level security;
alter table plan_tratamiento enable row level security;
alter table odontograma      enable row level security;
alter table imagenes         enable row level security;
alter table inventario       enable row level security;
alter table bioseguridad     enable row level security;
alter table pagos            enable row level security;

do $$
declare t text;
begin
  foreach t in array array['pacientes','atenciones','plan_tratamiento','odontograma',
                           'imagenes','inventario','bioseguridad','pagos']
  loop
    begin
      execute format(
        'create policy "acceso_autenticado" on %I for all to authenticated using (true) with check (true)', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================
--  STORAGE — bucket privado para radiografías
-- ============================================================

insert into storage.buckets (id, name, public)
values ('radiografias', 'radiografias', false)
on conflict (id) do nothing;

do $$ begin
  create policy "lectura_autenticada" on storage.objects for select
    to authenticated using (bucket_id = 'radiografias');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "escritura_autenticada" on storage.objects for insert
    to authenticated with check (bucket_id = 'radiografias');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "borrado_autenticado" on storage.objects for delete
    to authenticated using (bucket_id = 'radiografias');
exception when duplicate_object then null; end $$;

-- ============================================================
--  VISTA — resumen por paciente (visitas, facturado, abonado, saldo)
--  La usan las pantallas de Pacientes e Inicio. Facturado suma el
--  plan de tratamiento completo (pendiente + ya hecho) más las
--  atenciones — no se "elige" entre uno u otro, se suman.
-- ============================================================

create or replace view pacientes_resumen
with (security_invoker = true) as
select
  p.id,
  p.primer_nombre,
  p.segundo_nombre,
  p.primer_apellido,
  p.segundo_apellido,
  p.tipo_documento,
  p.documento,
  p.telefono,
  p.fecha_nacimiento,
  p.alergia,
  p.creado_en,
  coalesce(a.visitas, 0)        as visitas,
  a.ultima_visita,
  (coalesce(pl.total_plan, 0) + coalesce(a.total_atenciones, 0)) as facturado,
  coalesce(pg.total_abonado, 0) as abonado,
  (coalesce(pl.total_plan, 0) + coalesce(a.total_atenciones, 0)
   - coalesce(pg.total_abonado, 0)) as saldo
from pacientes p
left join (
  select paciente_id, count(*) as visitas, max(fecha) as ultima_visita, sum(valor) as total_atenciones
  from atenciones group by paciente_id
) a on a.paciente_id = p.id
left join (
  select paciente_id, sum(valor) as total_plan
  from plan_tratamiento group by paciente_id
) pl on pl.paciente_id = p.id
left join (
  select paciente_id, sum(valor) as total_abonado
  from pagos group by paciente_id
) pg on pg.paciente_id = p.id;
