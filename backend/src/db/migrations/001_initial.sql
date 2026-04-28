-- Usuarios y roles
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'medico', 'secretaria')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_username ON users(username);

-- Configuración del consultorio (una sola fila, id=1)
CREATE TABLE clinic_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  medico_nombre TEXT,
  medico_exequatur TEXT,
  medico_especialidad TEXT DEFAULT 'Anestesiología / Algología',
  consultorio_nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO clinic_settings (id) VALUES (1);

-- Pacientes
CREATE TABLE patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cedula TEXT UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  fecha_nacimiento TEXT,
  genero TEXT CHECK (genero IN ('M', 'F', 'otro')),
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  ocupacion TEXT,
  contacto_emergencia_nombre TEXT,
  contacto_emergencia_telefono TEXT,
  antecedentes_personales TEXT,
  antecedentes_familiares TEXT,
  antecedentes_alergicos TEXT,
  antecedentes_quirurgicos TEXT,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_patients_nombre ON patients(nombre, apellido);
CREATE INDEX idx_patients_cedula ON patients(cedula);
