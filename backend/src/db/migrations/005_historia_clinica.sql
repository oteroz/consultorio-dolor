-- Historia Clínica Unidad del Dolor (según documento oficial del consultorio)

-- 1) Expandir patients con datos personales del documento
ALTER TABLE patients ADD COLUMN apodo TEXT;
ALTER TABLE patients ADD COLUMN nacionalidad TEXT;
ALTER TABLE patients ADD COLUMN identidad_genero TEXT;
ALTER TABLE patients ADD COLUMN estado_civil TEXT;
ALTER TABLE patients ADD COLUMN numero_hijos INTEGER;
ALTER TABLE patients ADD COLUMN telefono_2 TEXT;
ALTER TABLE patients ADD COLUMN telefono_otro TEXT;
ALTER TABLE patients ADD COLUMN referente_nombre TEXT;
ALTER TABLE patients ADD COLUMN referente_telefono TEXT;
ALTER TABLE patients ADD COLUMN referente_direccion TEXT;
ALTER TABLE patients ADD COLUMN lugar_origen TEXT;
ALTER TABLE patients ADD COLUMN tipo_sangre TEXT;
ALTER TABLE patients ADD COLUMN escolaridad TEXT;
ALTER TABLE patients ADD COLUMN profesiones_anteriores TEXT;

-- 2) Historia clínica formal (una por paciente)
CREATE TABLE historias_clinicas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL DEFAULT (date('now')),

  -- Consulta / Anamnesis del dolor
  motivo_consulta TEXT,
  inicio_desarrollo TEXT,
  distribucion_espacial TEXT,
  aspectos_cualitativos_cuantitativos TEXT,
  evolucion_temporal TEXT,
  factores_provocativos TEXT,
  factores_paliativos TEXT,
  tratamiento_actual TEXT,
  efectos_socio_familiares TEXT,

  -- Antecedentes Personales Patológicos
  diagnosticos_anteriores TEXT,
  factores_geneticos_congenitos TEXT,
  factores_nutricionales TEXT,
  exposicion_toxicos TEXT,
  traumatismos TEXT,
  cirugias TEXT,
  transfusiones TEXT,
  alergicos TEXT,
  anestesicos TEXT,
  ets_its TEXT,
  inmunizaciones TEXT,
  psiquiatricos TEXT,
  habitos_toxicos TEXT,

  -- Antecedentes Personales No Patológicos
  estado_salud_previo TEXT,

  -- Antecedentes Sociales
  descripcion_entorno TEXT,

  -- Antecedentes Familiares
  familiares_problematica TEXT,
  incidencia_familiares TEXT,
  otros_antecedentes_familiares TEXT,

  -- Revisión por Sistemas
  tension_arterial TEXT,
  frecuencia_cardiaca TEXT,
  saturacion_o2 TEXT,
  auscultacion_pulmones TEXT,
  auscultacion_corazon TEXT,
  juicio_percepcion TEXT,

  -- Músculo Esquelético
  inspeccion_dedos_unas TEXT,
  examen_articulaciones TEXT,
  marcha_movimientos TEXT,

  -- Arco de movimiento
  columna_cervical TEXT,
  columna_toracolumbar TEXT,
  columna_rotacion TEXT,
  hombros TEXT,
  codos TEXT,
  munecas_movimiento TEXT,
  munecas_palmas_dorsos TEXT,
  prueba_phalen TEXT,
  pronacion_supinacion TEXT,
  dedos_abrir_cerrar TEXT,
  dedos_tocar_primer TEXT,
  miembros_inferiores TEXT,

  -- Sensibilidad
  deficit_trastorno TEXT,
  sensacion_propioceptiva TEXT,
  sensibilidad_presion TEXT,
  sensibilidad_combinada TEXT,

  -- Tono Muscular y Reflejos (JSON estructurado)
  tono_muscular TEXT,   -- JSON: { brazo:{d:N,i:N}, antebrazo:..., mano, pierna, muslo, pie }
  reflejos TEXT,         -- JSON: { biceps_c5:{d:N,i:N}, ... }

  -- Nervios Craneales
  nc1_olfatorio TEXT,
  nc2_optico TEXT,
  nc3_5_oculomotor TEXT,
  nc5_trigemino TEXT,
  nc7_facial TEXT,
  nc8_auditivo TEXT,
  nc9_glosofaringeo TEXT,
  nc10_vago TEXT,
  nc11_accesorio TEXT,
  nc12_hipogloso TEXT,

  -- Notas de evaluación
  notas_evaluacion TEXT,

  doctor_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_historias_clinicas_patient ON historias_clinicas(patient_id);
