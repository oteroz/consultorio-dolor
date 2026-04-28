import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);

const schema = z.object({
  patient_id: z.number().int(),
  tipo: z.enum(['cita', 'walkin', 'followup']).optional(),
  fecha: z.string(),
  hora: z.string().optional().nullable(),
  motivo: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  procedure_id: z.number().int().optional().nullable(),
});

appointmentsRouter.get('/', (req, res) => {
  const desde = req.query.desde || new Date().toISOString().slice(0, 10);
  const hasta = req.query.hasta || desde;
  const estado = req.query.estado;

  let sql = `
    SELECT a.*, p.nombre || ' ' || p.apellido AS paciente_nombre, p.cedula
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.fecha BETWEEN ? AND ?
  `;
  const params = [desde, hasta];
  if (estado) { sql += ' AND a.estado = ?'; params.push(estado); }
  sql += ' ORDER BY a.fecha ASC, a.hora ASC';

  const rows = db.prepare(sql).all(...params);
  res.json({ appointments: rows });
});

appointmentsRouter.get('/followups-pendientes', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, p.nombre || ' ' || p.apellido AS paciente_nombre
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.tipo = 'followup'
      AND a.estado = 'pendiente'
      AND a.fecha <= date('now', '+7 days')
    ORDER BY a.fecha ASC
  `).all();
  res.json({ followups: rows });
});

appointmentsRouter.post('/', (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;
  const info = db.prepare(`
    INSERT INTO appointments (patient_id, tipo, fecha, hora, motivo, notas, procedure_id)
    VALUES (@patient_id, @tipo, @fecha, @hora, @motivo, @notas, @procedure_id)
  `).run({
    patient_id: d.patient_id,
    tipo: d.tipo ?? 'cita',
    fecha: d.fecha,
    hora: d.hora ?? null,
    motivo: d.motivo ?? null,
    notas: d.notas ?? null,
    procedure_id: d.procedure_id ?? null,
  });
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ appointment: row });
});

appointmentsRouter.put('/:id', (req, res) => {
  const { estado, fecha, hora, motivo, notas } = req.body ?? {};
  const updates = [];
  const params = { id: Number(req.params.id) };
  if (estado !== undefined) {
    if (!['pendiente', 'atendida', 'cancelada', 'noshow'].includes(estado)) {
      return res.status(400).json({ error: 'Estado invalido' });
    }
    updates.push('estado = @estado'); params.estado = estado;
  }
  if (fecha !== undefined) { updates.push('fecha = @fecha'); params.fecha = fecha; }
  if (hora !== undefined) { updates.push('hora = @hora'); params.hora = hora; }
  if (motivo !== undefined) { updates.push('motivo = @motivo'); params.motivo = motivo; }
  if (notas !== undefined) { updates.push('notas = @notas'); params.notas = notas; }
  if (updates.length === 0) return res.json({ ok: true });
  db.prepare(`UPDATE appointments SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params);
  res.json({ ok: true });
});

appointmentsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
