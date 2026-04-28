import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const proceduresRouter = Router();
proceduresRouter.use(requireAuth);

const schema = z.object({
  patient_id: z.number().int(),
  tipo: z.enum(['bloqueo', 'infiltracion', 'neuromodulacion']),
  subtipo: z.string().optional().nullable(),
  fecha: z.string().optional(),
  zona: z.string().optional().nullable(),
  farmaco: z.string().optional().nullable(),
  dosis: z.string().optional().nullable(),
  tecnica: z.string().optional().nullable(),
  guiado_por: z.string().optional().nullable(),
  complicaciones: z.string().optional().nullable(),
  resultado: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  followup_days: z.number().int().optional().nullable(),
  eva_pre: z.number().int().min(0).max(10).optional().nullable(),
  pre_tension_arterial: z.string().optional().nullable(),
  pre_frecuencia_cardiaca: z.string().optional().nullable(),
  pre_frecuencia_respiratoria: z.string().optional().nullable(),
  pre_saturacion_o2: z.string().optional().nullable(),
  pre_temperatura: z.string().optional().nullable(),
  pre_glucemia: z.string().optional().nullable(),
});

const patchSchema = z.object({
  eva_pre: z.number().int().min(0).max(10).nullable().optional(),
  eva_post: z.number().int().min(0).max(10).nullable().optional(),
  pre_tension_arterial: z.string().nullable().optional(),
  pre_frecuencia_cardiaca: z.string().nullable().optional(),
  pre_frecuencia_respiratoria: z.string().nullable().optional(),
  pre_saturacion_o2: z.string().nullable().optional(),
  pre_temperatura: z.string().nullable().optional(),
  pre_glucemia: z.string().nullable().optional(),
  resultado: z.string().nullable().optional(),
  complicaciones: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
});

// Listado global con filtros (desde, hasta, tipo)
proceduresRouter.get('/', (req, res) => {
  const { desde, hasta, tipo } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (desde) { where += ' AND p.fecha >= ?'; params.push(desde); }
  if (hasta) { where += " AND p.fecha < datetime(?, '+1 day')"; params.push(hasta); }
  if (tipo) { where += ' AND p.tipo = ?'; params.push(tipo); }

  const rows = db.prepare(`
    SELECT p.*, pat.nombre || ' ' || pat.apellido AS paciente_nombre, pat.cedula
    FROM procedures p
    JOIN patients pat ON pat.id = p.patient_id
    ${where}
    ORDER BY p.fecha DESC
    LIMIT 200
  `).all(...params);

  res.json({ procedures: rows });
});

proceduresRouter.get('/patient/:patientId', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM procedures
    WHERE patient_id = ?
    ORDER BY fecha DESC
  `).all(req.params.patientId);
  res.json({ procedures: rows });
});

proceduresRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM procedures WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Procedimiento no encontrado' });
  res.json({ procedure: row });
});

proceduresRouter.post('/', requireRole('admin', 'medico'), (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;
  const doctor_id = req.session.user.id;

  const info = db.prepare(`
    INSERT INTO procedures
      (patient_id, doctor_id, tipo, subtipo, fecha, zona, farmaco, dosis, tecnica,
       guiado_por, complicaciones, resultado, notas, followup_days, eva_pre,
       pre_tension_arterial, pre_frecuencia_cardiaca, pre_frecuencia_respiratoria,
       pre_saturacion_o2, pre_temperatura, pre_glucemia)
    VALUES
      (@patient_id, @doctor_id, @tipo, @subtipo, COALESCE(@fecha, datetime('now')),
       @zona, @farmaco, @dosis, @tecnica, @guiado_por, @complicaciones, @resultado, @notas, @followup_days, @eva_pre,
       @pre_tension_arterial, @pre_frecuencia_cardiaca, @pre_frecuencia_respiratoria,
       @pre_saturacion_o2, @pre_temperatura, @pre_glucemia)
  `).run({
    patient_id: d.patient_id,
    doctor_id,
    tipo: d.tipo,
    subtipo: d.subtipo ?? null,
    fecha: d.fecha ?? null,
    zona: d.zona ?? null,
    farmaco: d.farmaco ?? null,
    dosis: d.dosis ?? null,
    tecnica: d.tecnica ?? null,
    guiado_por: d.guiado_por ?? null,
    complicaciones: d.complicaciones ?? null,
    resultado: d.resultado ?? null,
    notas: d.notas ?? null,
    followup_days: d.followup_days ?? null,
    eva_pre: d.eva_pre ?? null,
    pre_tension_arterial: d.pre_tension_arterial ?? null,
    pre_frecuencia_cardiaca: d.pre_frecuencia_cardiaca ?? null,
    pre_frecuencia_respiratoria: d.pre_frecuencia_respiratoria ?? null,
    pre_saturacion_o2: d.pre_saturacion_o2 ?? null,
    pre_temperatura: d.pre_temperatura ?? null,
    pre_glucemia: d.pre_glucemia ?? null,
  });

  // Crear follow-up automático si se indica followup_days
  if (d.followup_days && d.followup_days > 0) {
    db.prepare(`
      INSERT INTO appointments (patient_id, tipo, fecha, procedure_id, motivo)
      VALUES (?, 'followup', date('now', ?), ?, ?)
    `).run(
      d.patient_id,
      `+${d.followup_days} days`,
      info.lastInsertRowid,
      `Seguimiento post-${d.tipo}${d.subtipo ? ': ' + d.subtipo : ''}`
    );
  }

  const row = db.prepare('SELECT * FROM procedures WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ procedure: row });
});

proceduresRouter.patch('/:id', requireRole('admin', 'medico'), (req, res) => {
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;
  const keys = Object.keys(d);
  if (keys.length === 0) return res.json({ ok: true });
  const sets = keys.map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE procedures SET ${sets} WHERE id = @id`).run({ ...d, id: Number(req.params.id) });
  const row = db.prepare('SELECT * FROM procedures WHERE id = ?').get(req.params.id);
  res.json({ procedure: row });
});

proceduresRouter.delete('/:id', requireRole('admin', 'medico'), (req, res) => {
  db.prepare('DELETE FROM procedures WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
