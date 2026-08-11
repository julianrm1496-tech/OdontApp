-- ============================================================
--  DATOS SINTÉTICOS DE PRUEBA — para ver la app con harta información
--  Ejecutar en Supabase → SQL Editor (igual que schema.sql)
--
--  - NO toca ni borra nada de lo que ya existe. Solo agrega filas nuevas.
--  - Los documentos sintéticos empiezan en 900000001 hacia arriba, un
--    rango que no debería chocar con las cédulas reales de la doctora.
--  - Usa fechas relativas a HOY (current_date), así que las citas,
--    pagos y vencimientos siempre se ven "actuales" sin importar
--    cuándo lo corras.
--  - Para borrar todo esto después, al final del archivo dejo el
--    DELETE listo (comentado) que quita solo lo sintético.
-- ============================================================

do $$
declare
  -- ---------- listas para armar nombres y datos variados ----------
  nombres text[] := array[
    'Juan','Carlos','Andrés','Miguel','Luis','Jorge','Camilo','Santiago','Felipe','Daniel',
    'Ricardo','Fernando','Alejandro','David','Diego','Sebastián','Julián','Óscar','Iván','Mauricio',
    'María','Laura','Ana','Camila','Valentina','Paula','Diana','Sandra','Patricia','Adriana',
    'Carolina','Natalia','Alejandra','Gloria','Martha','Claudia','Beatriz','Rosa','Luz','Sofía'
  ];
  segundos_nombres text[] := array[
    'Alberto','Enrique','Eduardo','Antonio','Rafael','Ignacio','Ernesto','Guillermo','Roberto','Manuel',
    'Cristina','Beatriz','Elena','Isabel','Milena','Esperanza','Marcela','Jimena','Lucía','Teresa',
    '','','','','','','','','',''   -- muchos pacientes solo tienen un nombre
  ];
  apellidos text[] := array[
    'García','Rodríguez','Martínez','López','González','Hernández','Pérez','Sánchez','Ramírez','Torres',
    'Flórez','Rivera','Gómez','Díaz','Reyes','Morales','Ortiz','Gutiérrez','Chaves','Vargas',
    'Castro','Rojas','Jiménez','Moreno','Romero','Suárez','Álvarez','Mendoza','Guzmán','Cárdenas',
    'Peña','Acuña','Ibáñez','Cordoba','Pardo','Beltrán','Cifuentes','Quintero','Salazar','Bohórquez',
    'Méndez','Ordoñez','Pineda','Cuellar','Rincón','Bautista','Cañón','Escobar','Franco','Toro'
  ];
  localidades text[] := array[
    'Suba','Engativá','Kennedy','Chapinero','Usaquén','Fontibón','Bosa','Puente Aranda',
    'Teusaquillo','Barrios Unidos','Santa Fe','San Cristóbal'
  ];
  alergias text[] := array[
    'Ninguna','Ninguna','Ninguna','Ninguna','Ninguna','Ninguna','Ninguna',
    'Penicilina','Látex','Lidocaína','Ibuprofeno','Sulfas'
  ];
  procedimientos text[] := array[
    'Limpieza dental','Control de rutina','Valoración inicial','Resina · pieza 14','Resina · pieza 25',
    'Resina · pieza 36','Corona temporal / núcleo','Corona definitiva','Tratamiento de conductos uniradicular',
    'Desobturación parcial o total de conductos','Extracción simple','Extracción quirúrgica',
    'Blanqueamiento dental','Profilaxis','Sellante','Control de ortodoncia','Ajuste de placa',
    'Retiro de puntos','Curetaje','Radiografía periapical'
  ];
  metodos_pago text[] := array['efectivo','transferencia','tarjeta'];
  motivos_cita text[] := array[
    'Control','Limpieza','Valoración','Resina','Endodoncia','Corona','Extracción',
    'Ortodoncia','Urgencia','Blanqueamiento','Retiro de puntos'
  ];
  cups_validos text[] := array['890203','890303','997101','997301','233102','232103','232401'];
  cie10_validos text[] := array['Z012','Z09','K021','K029','K040','K045','K050'];
  insumos_nombre text[] := array[
    'Resina compuesta nano híbrida','Ácido grabador','Adhesivo dental','Anestesia lidocaína 2%',
    'Hidróxido de calcio catalizador','Ionómero modificado con resina','Guantes de nitrilo',
    'Tapabocas quirúrgico','Hipoclorito de sodio','Limas endodónticas','Cemento temporal',
    'Algodón odontológico','Eugenol','Barniz de flúor','Cepillo profiláctico','Pasta profiláctica',
    'Cera para placas','Alginato para impresiones','Yeso piedra','Selladores de fosas y fisuras'
  ];
  insumos_forma text[] := array[
    'Jeringa','Jeringa','Frasco','Cartucho','Jeringa','Cápsula','Caja','Caja','Frasco','Set',
    'Frasco','Bolsa','Frasco','Frasco','Caja','Frasco','Lámina','Bolsa','Bolsa','Jeringa'
  ];
  insumos_conc text[] := array[
    '4G','35%','5ml','1.8ml','12G','1 dosis','Talla M','x50','5.25%','15-40',
    '30g','500g','15ml','5%','x100','90g','x1','453g','1kg','1.2ml'
  ];
  insumos_marca text[] := array[
    '3M Filtek Z350','Kerr Gel Etchant','3M Single Bond','Roxicaína','Kerr Regular Set Life',
    '3M Vitrebond','Medipiel','3M','Vitalquim','Dentsply','Cavitec','Johnson','Vitalquim',
    '3M Vanish','KG Sorensen','Herjos','Dentaurum','Zhermack','Colteno','3M Clinpro'
  ];

  v_paciente_id  uuid;
  v_doc          bigint := 900000001;
  n_pacientes    int := 90;
  i              int;
  j              int;
  n_atenciones   int;
  n_pagos        int;
  fecha_at       date;
  valor_at       numeric;
  nombre1 text; nombre2 text; ap1 text; ap2 text;
  tel text;
  n_insumo int;
  hoy date := current_date;
begin
  -- ---------- PACIENTES + su historia (atenciones, plan, pagos) ----------
  for i in 1..n_pacientes loop
    nombre1 := nombres[1 + floor(random()*array_length(nombres,1))::int];
    nombre2 := segundos_nombres[1 + floor(random()*array_length(segundos_nombres,1))::int];
    ap1 := apellidos[1 + floor(random()*array_length(apellidos,1))::int];
    ap2 := apellidos[1 + floor(random()*array_length(apellidos,1))::int];
    tel := '3' || (10 + floor(random()*89))::text || floor(random()*9000000+1000000)::text;
    v_doc := v_doc + 1;

    insert into pacientes (
      primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      tipo_documento, documento, fecha_nacimiento, sexo, telefono,
      direccion, localidad, zona_residencia, tipo_usuario, eps, alergia
    ) values (
      nombre1, nullif(nombre2,''), ap1, ap2,
      'CC', v_doc::text,
      (date '1955-01-01' + (floor(random()*23000))::int),
      case when random() < 0.55 then 'F' else 'M' end,
      tel,
      'Calle ' || (10+floor(random()*100))::text || ' # ' || (1+floor(random()*90))::text || '-' || (1+floor(random()*99))::text,
      localidades[1 + floor(random()*array_length(localidades,1))::int],
      'U',
      case when random() < 0.35 then 'eps' else 'particular' end,
      case when random() < 0.35 then (array['Sura','Nueva EPS','Sanitas','Compensar','Famisanar'])[1+floor(random()*5)::int] else null end,
      alergias[1 + floor(random()*array_length(alergias,1))::int]
    )
    returning id into v_paciente_id;

    -- 1 a 6 atenciones repartidas en los últimos 8 meses
    n_atenciones := 1 + floor(random()*6)::int;
    for j in 1..n_atenciones loop
      fecha_at := hoy - (floor(random()*240))::int;
      valor_at := (array[60000,80000,100000,150000,180000,250000,300000,450000,600000,800000,1150000,1500000])[1+floor(random()*12)::int];
      insert into atenciones (paciente_id, fecha, motivo, procedimiento, cups, cie10, piezas, valor)
      values (
        v_paciente_id, fecha_at,
        procedimientos[1 + floor(random()*array_length(procedimientos,1))::int],
        procedimientos[1 + floor(random()*array_length(procedimientos,1))::int],
        case when random() < 0.75 then cups_validos[1+floor(random()*array_length(cups_validos,1))::int] else null end,
        case when random() < 0.7  then cie10_validos[1+floor(random()*array_length(cie10_validos,1))::int] else null end,
        case when random() < 0.5 then (11 + floor(random()*37))::text else null end,
        valor_at
      );
    end loop;

    -- ~30% con plan de tratamiento pendiente (1 a 3 ítems)
    if random() < 0.3 then
      for j in 1..(1+floor(random()*3)::int) loop
        insert into plan_tratamiento (paciente_id, descripcion, pieza, valor, estado)
        values (
          v_paciente_id,
          procedimientos[1 + floor(random()*array_length(procedimientos,1))::int],
          (11 + floor(random()*37))::text,
          (array[150000,250000,300000,450000,800000,1150000,1500000])[1+floor(random()*7)::int],
          'pendiente'
        );
      end loop;
    end if;

    -- ~65% con 1 a 3 pagos/abonos
    if random() < 0.65 then
      n_pagos := 1 + floor(random()*3)::int;
      for j in 1..n_pagos loop
        insert into pagos (paciente_id, fecha, concepto, valor, metodo)
        values (
          v_paciente_id,
          hoy - (floor(random()*200))::int,
          'Abono tratamiento',
          (array[40000,60000,80000,100000,150000,200000,300000,400000])[1+floor(random()*8)::int],
          metodos_pago[1 + floor(random()*3)::int]
        );
      end loop;
    end if;
  end loop;

  -- ---------- CITAS — bien concentradas en la semana actual y las próximas,
  --            para que la Agenda se vea llena hoy y en los próximos días ----------
  for i in -5..21 loop  -- de 5 días atrás a 3 semanas adelante
    -- nos saltamos casi todos los domingos, como una agenda real
    if extract(dow from hoy + i) <> 0 or random() < 0.15 then
      for j in 1..(2 + floor(random()*6)::int) loop  -- 2 a 7 citas por día
        select p.id into v_paciente_id from pacientes p order by random() limit 1;
        insert into citas (paciente_id, fecha, hora, duracion, motivo, estado)
        values (
          v_paciente_id,
          hoy + i,
          (array['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
                 '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'])[1+floor(random()*19)::int],
          (array[30,30,30,45,60])[1+floor(random()*5)::int],
          motivos_cita[1 + floor(random()*array_length(motivos_cita,1))::int],
          case
            when i < 0 then (array['atendida','atendida','atendida','cancelada'])[1+floor(random()*4)::int]
            when i = 0 then (array['pendiente','confirmada','confirmada','atendida'])[1+floor(random()*4)::int]
            else (array['pendiente','pendiente','confirmada'])[1+floor(random()*3)::int]
          end
        );
      end loop;
    end if;
  end loop;

  -- unas pocas citas de "alguien nuevo" (sin paciente_id), como pasa en la vida real
  insert into citas (paciente_nombre, fecha, hora, duracion, motivo, estado) values
    ('Camilo Restrepo Vélez', hoy, '13:00', 30, 'Valoración', 'pendiente'),
    ('Juliana Bermúdez', hoy+1, '10:00', 30, 'Valoración', 'confirmada'),
    ('Andrés Salcedo', hoy+3, '16:00', 45, 'Urgencia', 'pendiente');

  -- ---------- INVENTARIO — variado: vencidos, por vencer y al día ----------
  for i in 1..45 loop
    n_insumo := 1 + floor(random()*array_length(insumos_nombre,1))::int;
    insert into inventario (principio_activo, forma, concentracion, presentacion, lote, fecha_vencimiento, unidad)
    values (
      insumos_nombre[n_insumo], insumos_forma[n_insumo], insumos_conc[n_insumo], insumos_marca[n_insumo],
      upper(substr(md5(random()::text),1,6)),
      hoy + (floor(random()*600) - 60)::int,  -- desde 60 días vencido hasta 540 días por vencer
      insumos_conc[n_insumo]
    );
  end loop;

  -- ---------- BIOSEGURIDAD — varias semanas, para probar el agrupado por mes ----------
  for i in 0..70 loop
    if random() < 0.4 then
      insert into bioseguridad (tipo, fecha, datos) values (
        'esterilizacion', hoy - i,
        jsonb_build_object(
          'lote', (1+floor(random()*9))::text, 'hora','14:30',
          'paquetes', 1+floor(random()*10)::int,
          'descripcion', (array['Instrumental de examen','Instrumental de cirugía','Cassette de endodoncia','Instrumental de profilaxis'])[1+floor(random()*4)::int],
          'tiempo', 45, 'temperatura', 134,
          'cinta', case when random()<0.9 then 'conforme' else 'no conforme' end,
          'indicador', case when random()<0.9 then 'conforme' else 'no conforme' end,
          'trazabilidad', 'conforme'
        )
      );
    end if;
    if random() < 0.35 then
      insert into bioseguridad (tipo, fecha, datos) values (
        'residuos', hoy - i,
        jsonb_build_object(
          'biosanitarios', round((random()*0.4)::numeric,3),
          'cortopunzantes', round((random()*0.15)::numeric,3),
          'anatomopatologicos', 0,
          'mercuriales', 0,
          'farmaceuticos', round((random()*0.05)::numeric,3),
          'no_aprovechables', round((random()*0.3)::numeric,3),
          'aprovechables', round((random()*0.2)::numeric,3),
          'otros', 0
        )
      );
    end if;
    if random() < 0.3 then
      insert into bioseguridad (tipo, fecha, datos) values (
        'ambiente', hoy - i,
        jsonb_build_object(
          'manana', jsonb_build_object('temperatura', 20+floor(random()*5), 'humedad', 45+floor(random()*15), 'hora','08:00'),
          'tarde',  jsonb_build_object('temperatura', 22+floor(random()*5), 'humedad', 48+floor(random()*15), 'hora','15:00')
        )
      );
    end if;
  end loop;

end $$;

-- ============================================================
--  LIMPIEZA — para borrar TODO lo sintético cuando terminen las
--  pruebas. Está comentado a propósito, para no borrar nada por
--  accidente. Selecciónalo y córrelo aparte cuando quieras quitarlo.
--
--  Los pacientes sintéticos se identifican por su documento
--  (900000001 en adelante) — eso también borra en cascada sus
--  atenciones, plan de tratamiento y pagos. Las citas, el inventario
--  y bioseguridad no tienen una marca propia, así que se identifican
--  por fecha de creación: ajusta el "interval" de abajo a cuánto
--  tiempo ha pasado desde que corriste este script.
-- ============================================================

-- delete from citas where paciente_nombre in
--   ('Camilo Restrepo Vélez','Juliana Bermúdez','Andrés Salcedo');
-- delete from citas where paciente_id in (select id from pacientes where documento::bigint >= 900000001);
-- delete from pacientes where documento::bigint >= 900000001;  -- arrastra atenciones, plan y pagos
-- delete from inventario   where creado_en > now() - interval '2 hours';
-- delete from bioseguridad where creado_en > now() - interval '2 hours';

