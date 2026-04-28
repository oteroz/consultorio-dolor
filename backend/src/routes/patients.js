import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const patientsRouter = Router();
patientsRouter.use(requireAuth);

const patientSchema = z.object({
  cedula: z.string().optional().nullable(),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  apodo: z.string().optional().nullable(),
  fecha_nacimiento: z.string().optional().nullable(),
  genero: z.enum(['M', 'F', 'otro']).optional().nullable(),
  identidad_genero: z.string().optional().nullable(),
  nacionalidad: z.string().optional().nullable(),
  estado_civil: z.string().optional().nullable(),
  numero_hijos: z.number().int().optional().nullable(),
  telefono: z.string().optional().nullable(),
  telefono_2: z.string().optional().nullable(),
  telefono_otro: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  lugar_origen: z.string().optional().nullable(),
  tipo_sangre: z.string().optional().nullable(),
  escolaridad: z.string().optional().nullable(),
  ocupacion: z.string().optional().nullable(),
  profesiones_anteriores: z.string().optional().nullable(),
  referente_nombre: z.string().optional().nullable(),
  referente_telefono: z.string().optional().nullable(),
  referente_direccion: z.string().optional().nullable(),
  contacto_emergencia_nombre: z.string().optional().nullable(),
  contacto_emergencia_telefono: z.string().optional().nullable(),
  antecedentes_personales: z.string().optional().nullable(),
  antecedentes_familiares: z.string().optional().nullable(),
  antecedentes_alergicos: z.string().optional().nullable(),
  antecedentes_quirurgicos: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

patientsRouter.get('/', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(`
      SELECT id, cedula, nombre, apellido, direccion, referente_nombre, updated_at
      FROM patients
      WHERE nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ? OR direccion LIKE ? OR referente_nombre LIKE ?
      ORDER BY apellido, nombre
      LIMIT 100
    `).all(like, like, like, like, like);
  } else {
    rows = db.prepare(`
      SELECT id, cedula, nombre, apellido, direccion, referente_nombre, updated_at
      FROM patients
      ORDER BY updated_at DESC
      LIMIT 50
    `).all();
  }
  res.json({ patients: rows });
});

patientsRouter.get('/:id', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
  res.json({ patient });
});

function normalizeForInsert(d) {
  const out = {};
  for (const k of Object.keys(d)) out[k] = d[k] === undefined ? null : d[k];
  return out;
}

patientsRouter.post('/', (req, res) => {
  const parse = patientSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = normalizeForInsert(parse.data);
  const cols = Object.keys(d);
  const info = db.prepare(`
    INSERT INTO patients (${cols.join(', ')})
    VALUES (${cols.map(c => '@' + c).join(', ')})
  `).run(d);
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ patient });
});

patientsRouter.put('/:id', (req, res) => {
  const parse = patientSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const existing = db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Paciente no encontrado' });
  const d = normalizeForInsert(parse.data);
  const keys = Object.keys(d);
  if (keys.length === 0) return res.json({ patient: existing });
  const sets = keys.map(c => `${c} = @${c}`).join(', ');
  db.prepare(`UPDATE patients SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...d, id: Number(req.params.id) });
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  res.json({ patient });
});

patientsRouter.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
