import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const consultationsRouter = Router();
consultationsRouter.use(requireAuth);

const schema = z.object({
  patient_id: z.number().int(),
  date: z.string().optional(),
  motivo_consulta: z.string().optional().nullable(),
  antecedentes_relevantes: z.string().optional().nullable(),
  examen_fisico: z.string().optional().nullable(),
  diagnostico: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
  eva: z.number().int().min(0).max(10).optional().nullable(),
  body_map_data: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

consultationsRouter.get('/patient/:patientId', (req, res) => {
  const rows = db.prepare(`
    SELECT id, date, motivo_consulta, diagnostico, eva
    FROM consultations
    WHERE patient_id = ?
    ORDER BY date DESC
  `).all(req.params.patientId);
  res.json({ consultations: rows });
});

consultationsRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM consultations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Consulta no encontrada' });
  res.json({ consultation: row });
});

consultationsRouter.post('/', requireRole('admin', 'medico'), (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;
  const doctor_id = req.session.user.id;
  const info = db.prepare(`
    INSERT INTO consultations
      (patient_id, doctor_id, date, motivo_consulta, antecedentes_relevantes,
       examen_fisico, diagnostico, plan, eva, body_map_data, notas)
    VALUES
      (@patient_id, @doctor_id, COALESCE(@date, datetime('now')), @motivo_consulta, @antecedentes_relevantes,
       @examen_fisico, @diagnostico, @plan, @eva, @body_map_data, @notas)
  `).run({
    patient_id: d.patient_id,
    doctor_id,
    date: d.date ?? null,
    motivo_consulta: d.motivo_consulta ?? null,
    antecedentes_relevantes: d.antecedentes_relevantes ?? null,
    examen_fisico: d.examen_fisico ?? null,
    diagnostico: d.diagnostico ?? null,
    plan: d.plan ?? null,
    eva: d.eva ?? null,
    body_map_data: d.body_map_data ?? null,
    notas: d.notas ?? null,
  });
  const row = db.prepare('SELECT * FROM consultations WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ consultation: row });
});

consultationsRouter.put('/:id', requireRole('admin', 'medico'), (req, res) => {
  const parse = schema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos' });
  const existing = db.prepare('SELECT id FROM consultations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'No encontrada' });
  const d = parse.data;
  const keys = Object.keys(d);
  if (keys.length === 0) return res.json({ ok: true });
  const sets = keys.map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE consultations SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...d, id: Number(req.params.id) });
  const row = db.prepare('SELECT * FROM consultations WHERE id = ?').get(req.params.id);
  res.json({ consultation: row });
});

consultationsRouter.delete('/:id', requireRole('admin', 'medico'), (req, res) => {
  db.prepare('DELETE FROM consultations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
