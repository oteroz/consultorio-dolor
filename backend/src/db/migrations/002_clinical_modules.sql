-- Consultas / Evolución (SOAP + EVA + mapa corporal)
CREATE TABLE consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES users(id),
  date TEXT NOT NULL DEFAULT (datetime('now')),
  motivo_consulta TEXT,
  antecedentes_relevantes TEXT,
  examen_fisico TEXT,
  diagnostico TEXT,
  plan TEXT,
  eva INTEGER CHECK (eva BETWEEN 0 AND 10),
  body_map_data TEXT,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_consultations_patient ON consultations(patient_id, date DESC);

-- Procedimientos intervencionistas
CREATE TABLE procedures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES users(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('bloqueo', 'infiltracion', 'neuromodulacion')),
  subtipo TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  zona TEXT,
  farmaco TEXT,
  dosis TEXT,
  tecnica TEXT,
  guiado_por TEXT,
  complicaciones TEXT,
  resultado TEXT,
  notas TEXT,
  followup_days INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_procedures_patient ON procedures(patient_id, fecha DESC);

-- Medicación actual del paciente
CREATE TABLE medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  farmaco TEXT NOT NULL,
  es_opioide INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  fecha_inicio TEXT NOT NULL DEFAULT (date('now')),
  fecha_fin TEXT,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_medications_patient ON medications(patient_id, activo);

-- Historial de titulación (cambios de dosis / frecuencia / vía)
CREATE TABLE medication_titrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL DEFAULT (date('now')),
  dosis TEXT NOT NULL,
  frecuencia TEXT,
  via TEXT,
  motivo_cambio TEXT,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_titrations_medication ON medication_titrations(medication_id, fecha DESC);

-- Agenda (citas + walk-ins + follow-ups post-procedimiento)
CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cita', 'walkin', 'followup')),
  fecha TEXT NOT NULL,
  hora TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'atendida', 'cancelada', 'noshow')),
  motivo TEXT,
  procedure_id INTEGER REFERENCES procedures(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_appointments_fecha ON appointments(fecha, hora);
CREATE INDEX idx_appointments_patient ON appointments(patient_id, fecha DESC);
