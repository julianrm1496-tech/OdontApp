/* Catálogo tomado del archivo de trabajo de la doctora.
   Si más adelante usa un procedimiento nuevo, se agrega aquí. */

export const CUPS = [
  { codigo: '890203', nombre: 'Valoración odontológica' },
  { codigo: '890303', nombre: 'Consulta de control o seguimiento' },
  { codigo: '890703', nombre: 'Atención no programada en odontología' },
  { codigo: '997203', nombre: 'Educación individual en salud por odontología' },
  { codigo: '997101', nombre: 'Profilaxis dental' },
  { codigo: '997107', nombre: 'Sellantes' },
  { codigo: '997105', nombre: 'Resina preventiva, presella' },
  { codigo: '997301', nombre: 'Detartraje supragingival' },
  { codigo: '997302', nombre: 'Detartraje subgingival por cuadrante' },
  { codigo: '233102', nombre: 'Obturación dental en resina de fotocurado' },
  { codigo: '232103', nombre: 'Obturación dental en ionómero de vidrio' },
  { codigo: '232200', nombre: 'Obturación temporal por diente' },
  { codigo: '232401', nombre: 'Reconstrucción del ángulo incisal, con resina' },
  { codigo: '232402', nombre: 'Reconstrucción del tercio incisal, con resina' },
  { codigo: '234201', nombre: 'Corona' },
  { codigo: '234203', nombre: 'Corona temporal / núcleo' },
  { codigo: '234102', nombre: 'Placa neuromiorrelajante' },
  { codigo: '230101', nombre: 'Exodoncia diente permanente uniradicular' },
  { codigo: '230102', nombre: 'Exodoncia diente permanente multiradicular' },
  { codigo: '230201', nombre: 'Exodoncia diente temporal uniradicular' },
  { codigo: '230202', nombre: 'Exodoncia diente temporal multiradicular' },
  { codigo: '243400', nombre: 'Gingivectomía' },
  { codigo: '243502', nombre: 'Operculectomía' },
  { codigo: '234301', nombre: 'Prótesis parcial removible mucosoportada' },
  { codigo: '234401', nombre: 'Prótesis total mucosoportada' },
  { codigo: '234402', nombre: 'Prótesis total mucosoportada, caso completo' },
  { codigo: '237102', nombre: 'Pulpotomía' },
  { codigo: '237103', nombre: 'Pulpectomía' },
  { codigo: '237301', nombre: 'Tratamiento de conductos uniradicular' },
  { codigo: '237302', nombre: 'Tratamiento de conductos biradicular' },
  { codigo: '237303', nombre: 'Tratamiento de conductos multiradicular' },
  { codigo: '237307', nombre: 'Desobturación parcial o total de conductos' },
  { codigo: '247401', nombre: 'Ferulización rígida' },
  { codigo: '247402', nombre: 'Ferulización semirrígida' },
  { codigo: '248200', nombre: 'Ajustamiento oclusal' },
]

export const CIE10 = [
  { codigo: 'Z012', nombre: 'Examen odontológico' },
  { codigo: 'Z09',  nombre: 'Examen de seguimiento posterior a tratamiento' },
  { codigo: 'Z762', nombre: 'Supervisión de salud de otro niño o lactante sano' },
  { codigo: 'Z768', nombre: 'Personas en contacto con servicios de salud, otras' },
  { codigo: 'K020', nombre: 'Caries limitada al esmalte' },
  { codigo: 'K021', nombre: 'Caries de la dentina' },
  { codigo: 'K029', nombre: 'Caries dental, no especificada' },
  { codigo: 'K031', nombre: 'Abrasión dental' },
  { codigo: 'K038', nombre: 'Otras enfermedades especificadas de los tejidos duros' },
  { codigo: 'K040', nombre: 'Pulpitis' },
  { codigo: 'K041', nombre: 'Necrosis de la pulpa' },
  { codigo: 'K045', nombre: 'Periodontitis apical crónica' },
  { codigo: 'K046', nombre: 'Absceso periapical con fístula' },
  { codigo: 'K050', nombre: 'Gingivitis aguda' },
  { codigo: 'K051', nombre: 'Gingivitis crónica' },
  { codigo: 'K052', nombre: 'Periodontitis aguda' },
  { codigo: 'K053', nombre: 'Periodontitis crónica' },
  { codigo: 'K011', nombre: 'Dientes incluidos' },
  { codigo: 'K061', nombre: 'Agrandamiento gingival' },
  { codigo: 'K074', nombre: 'Maloclusión de tipo no especificado' },
  { codigo: 'K081', nombre: 'Pérdida de dientes por accidente, extracción o periodontitis' },
  { codigo: 'K083', nombre: 'Raíz dental retenida' },
  { codigo: 'K088', nombre: 'Otros trastornos especificados de los dientes' },
  { codigo: 'K089', nombre: 'Trastorno de los dientes y sus estructuras de sostén, no especificado' },
  { codigo: 'S025', nombre: 'Fractura de los dientes' },
]

export const LOCALIDADES = [
  '1 · Usaquén', '2 · Chapinero', '3 · Santa Fe', '4 · San Cristóbal',
  '5 · Usme', '6 · Tunjuelito', '7 · Bosa', '8 · Kennedy',
  '9 · Fontibón', '10 · Engativá', '11 · Suba', '12 · Barrios Unidos',
  '13 · Teusaquillo', '14 · Los Mártires', '15 · Antonio Nariño',
  '16 · Puente Aranda', '17 · La Candelaria', '18 · Rafael Uribe Uribe',
  '19 · Ciudad Bolívar', '20 · Sumapaz',
]

export const TIPOS_DOCUMENTO = ['CC', 'TI', 'CE', 'RC', 'PA', 'MS', 'AS']

export const GRUPOS_SERVICIO = [
  'Consulta', 'Procedimiento', 'Promoción y prevención',
  'Urgencias', 'Infiltraciones', 'Otro',
]

/* Catálogos del RIPS (Resolución 2275 de 2023).
   Valores tomados de un archivo real ya aprobado por el Ministerio. */
export const FINALIDADES_RIPS = [
  { codigo: '15', nombre: 'Primera vez' },
  { codigo: '16', nombre: 'Control o seguimiento' },
]

export const VIAS_INGRESO = [
  { codigo: '01', nombre: 'Consulta ambulatoria' },
]

export const MODALIDADES = [
  { codigo: '01', nombre: 'Intramural' },
]

export const REGIMENES_RIPS = [
  { codigo: '12', nombre: 'Particular' },
  { codigo: '01', nombre: 'Contributivo · cotizante' },
  { codigo: '02', nombre: 'Contributivo · beneficiario' },
  { codigo: '03', nombre: 'Subsidiado' },
]
