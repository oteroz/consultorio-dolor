import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const medicationsRouter = Router();
medicationsRouter.use(requireAuth);

const medSchema = z.object({
  patient_id: z.number().int(),
  farmaco: z.string().min(1),
  es_opioide: z.boolean().optional().default(false),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  // Titulación inicial opcional
  dosis_inicial: z.string().optional().nullable(),
  frecuencia_inicial: z.string().optional().nullable(),
  via_inicial: z.string().optional().nullable(),
});

const titrSchema = z.object({
  fecha: z.string().optional(),
  dosis: z.string().min(1),
  frecuencia: z.string().optional().nullable(),
  via: z.string().optional().nullable(),
  motivo_cambio: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

medicationsRouter.get('/patient/:patientId', (req, res) => {
  const meds = db.prepare(`
    SELECT m.*, (
      SELECT json_object(
        'dosis', t.dosis,
        'frecuencia', t.frecuencia,
        'via', t.via,
        'fecha', t.fecha
      )
      FROM medication_titrations t
      WHERE t.medication_id = m.id
      ORDER BY t.fecha DESC, t.id DESC
      LIMIT 1
    ) AS ultima_titulacion_json
    FROM medications m
    WHERE m.patient_id = ?
    ORDER BY m.activo DESC, m.updated_at DESC
  `).all(req.params.patientId);

  for (const m of meds) {
    m.ultima_titulacion = m.ultima_titulacion_json ? JSON.parse(m.ultima_titulacion_json) : null;
    delete m.ultima_titulacion_json;
    m.es_opioide = !!m.es_opioide;
    m.activo = !!m.activo;
  }

  res.json({ medications: meds });
});

// Todas las titulaciones del paciente (para timeline)
medicationsRouter.get('/patient/:patientId/titrations', (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, m.farmaco, m.es_opioide
    FROM medication_titrations t
    JOIN medications m ON m.id = t.medication_id
    WHERE m.patient_id = ?
    ORDER BY t.fecha DESC, t.id DESC
  `).all(req.params.patientId);
  for (const r of rows) r.es_opioide = !!r.es_opioide;
  res.json({ titrations: rows });
});

medicationsRouter.get('/by-ids/:ids', (req, res) => {
  const ids = String(req.params.ids || '')
    .split(',')
    .map(v => Number(v))
    .filter(Number.isInteger);

  if (ids.length === 0) return res.json({ medications: [] });

  const placeholders = ids.map(() => '?').join(', ');
  const meds = db.prepare(`
    SELECT m.*, p.nombre, p.apellido, p.cedula, p.fecha_nacimiento, p.telefono, p.direccion
    FROM medications m
    JOIN patients p ON p.id = m.patient_id
    WHERE m.id IN (${placeholders})
    ORDER BY m.activo DESC, m.updated_at DESC
  `).all(...ids);

  const titrStmt = db.prepare(`
    SELECT * FROM medication_titrations
    WHERE medication_id = ?
    ORDER BY fecha DESC, id DESC
  `);

  for (const m of meds) {
    const titrations = titrStmt.all(m.id);
    m.es_opioide = !!m.es_opioide;
    m.activo = !!m.activo;
    m.ultima_titulacion = titrations[0] || null;
    m.titrations = titrations;
  }

  res.json({ medications: meds });
});

medicationsRouter.get('/:id/titrations', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM medication_titrations
    WHERE medication_id = ?
    ORDER BY fecha DESC, id DESC
  `).all(req.params.id);
  res.json({ titrations: rows });
});

medicationsRouter.get('/:id', (req, res) => {
  const med = db.prepare(`
    SELECT m.*, p.nombre, p.apellido, p.cedula, p.fecha_nacimiento, p.telefono, p.direccion
    FROM medications m
    JOIN patients p ON p.id = m.patient_id
    WHERE m.id = ?
  `).get(req.params.id);

  if (!med) return res.status(404).json({ error: 'Prescripcion no encontrada' });

  const titrations = db.prepare(`
    SELECT * FROM medication_titrations
    WHERE medication_id = ?
    ORDER BY fecha DESC, id DESC
  `).all(req.params.id);

  med.es_opioide = !!med.es_opioide;
  med.activo = !!med.activo;
  med.ultima_titulacion = titrations[0] || null;
  med.titrations = titrations;

  res.json({ medication: med });
});

medicationsRouter.post('/', requireRole('admin', 'medico'), (req, res) => {
  const parse = medSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;

  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO medications (patient_id, farmaco, es_opioide, fecha_inicio, fecha_fin, notas)
      VALUES (@patient_id, @farmaco, @es_opioide, COALESCE(@fecha_inicio, date('now')), @fecha_fin, @notas)
    `).run({
      patient_id: d.patient_id,
      farmaco: d.farmaco,
      es_opioide: d.es_opioide ? 1 : 0,
      fecha_inicio: d.fecha_inicio ?? null,
      fecha_fin: d.fecha_fin ?? null,
      notas: d.notas ?? null,
    });

    if (d.dosis_inicial) {
      db.prepare(`
        INSERT INTO medication_titrations (medication_id, fecha, dosis, frecuencia, via, motivo_cambio)
        VALUES (?, date('now'), ?, ?, ?, 'Inicio')
      `).run(info.lastInsertRowid, d.dosis_inicial, d.frecuencia_inicial ?? null, d.via_inicial ?? null);
    }
    return info.lastInsertRowid;
  });

  const id = tx();
  res.status(201).json({ id });
});

medicationsRouter.post('/:id/titrations', requireRole('admin', 'medico'), (req, res) => {
  const parse = titrSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;
  const med = db.prepare('SELECT id FROM medications WHERE id = ?').get(req.params.id);
  if (!med) return res.status(404).json({ error: 'Prescripcion no encontrada' });

  const info = db.prepare(`
    INSERT INTO medication_titrations (medication_id, fecha, dosis, frecuencia, via, motivo_cambio, notas)
    VALUES (?, COALESCE(?, date('now')), ?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    d.fecha ?? null,
    d.dosis,
    d.frecuencia ?? null,
    d.via ?? null,
    d.motivo_cambio ?? null,
    d.notas ?? null
  );
  db.prepare(`UPDATE medications SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(201).json({ id: info.lastInsertRowid });
});

medicationsRouter.put('/:id', requireRole('admin', 'medico'), (req, res) => {
  const { activo, fecha_fin, notas } = req.body ?? {};
  const updates = [];
  const params = { id: Number(req.params.id) };
  if (activo !== undefined) { updates.push('activo = @activo'); params.activo = activo ? 1 : 0; }
  if (fecha_fin !== undefined) { updates.push('fecha_fin = @fecha_fin'); params.fecha_fin = fecha_fin; }
  if (notas !== undefined) { updates.push('notas = @notas'); params.notas = notas; }
  if (updates.length === 0) return res.json({ ok: true });
  db.prepare(`UPDATE medications SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params);
  res.json({ ok: true });
});

medicationsRouter.delete('/:id', requireRole('admin', 'medico'), (req, res) => {
  db.prepare('DELETE FROM medications WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
