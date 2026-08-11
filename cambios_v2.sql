-- ============================================================
--  Mejoras v2 — resumen por paciente y archivado
--  Ejecutar en Supabase → SQL Editor
-- ============================================================

-- ---------- 1. Archivar en vez de borrar ----------
-- La historia clínica no se borra: se archiva y desaparece de la lista.
alter table pacientes add column if not exists archivado boolean not null default false;

create index if not exists idx_pacientes_archivado on pacientes (archivado);

-- ---------- 2. Vista con los totales ya calculados ----------
-- Evita traer todas las atenciones y pagos al navegador solo para sumar.
-- security_invoker hace que respete el RLS de las tablas de origen.
drop view if exists pacientes_resumen;

create view pacientes_resumen
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
  p.archivado,
  p.creado_en,
  coalesce(a.visitas, 0)        as visitas,
  a.ultima_visita,
  -- Lo que se le debe cobrar: el plan de tratamiento si existe,
  -- si no, la suma de lo registrado en cada atención.
  case when coalesce(pl.total_plan, 0) > 0
       then pl.total_plan
       else coalesce(a.total_atenciones, 0)
  end                            as facturado,
  coalesce(pg.total_abonado, 0)  as abonado,
  (case when coalesce(pl.total_plan, 0) > 0
        then pl.total_plan
        else coalesce(a.total_atenciones, 0)
   end - coalesce(pg.total_abonado, 0)) as saldo
from pacientes p
left join (
  select paciente_id,
         count(*)          as visitas,
         max(fecha)        as ultima_visita,
         sum(valor)        as total_atenciones
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

-- ---------- 3. Ingresos por mes (para los gráficos) ----------
drop view if exists ingresos_mensuales;

create view ingresos_mensuales
with (security_invoker = true) as
select
  to_char(date_trunc('month', fecha), 'YYYY-MM') as mes,
  sum(valor)   as total,
  count(*)     as cantidad
from pagos
group by 1
order by 1;
