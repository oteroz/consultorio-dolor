import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const budgetsRouter = Router();
budgetsRouter.use(requireAuth);

const itemSchema = z.object({
  descripcion: z.string().min(1),
  cantidad: z.number().int().min(1).default(1),
  precio_unitario: z.number().min(0),
});

const budgetSchema = z.object({
  patient_id: z.number().int(),
  fecha: z.string().optional(),
  estado: z.enum(['borrador', 'aprobado', 'facturado', 'cancelado']).optional(),
  impuesto: z.number().min(0).optional().default(0),
  notas: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

budgetsRouter.get('/', (req, res) => {
  const { patient_id } = req.query;
  let sql = `
    SELECT b.*, p.nombre || ' ' || p.apellido AS paciente_nombre, p.cedula
    FROM budgets b
    JOIN patients p ON p.id = b.patient_id
  `;
  const params = [];
  if (patient_id) { sql += ' WHERE b.patient_id = ?'; params.push(patient_id); }
  sql += ' ORDER BY b.fecha DESC, b.id DESC LIMIT 200';
  const rows = db.prepare(sql).all(...params);
  res.json({ budgets: rows });
});

budgetsRouter.get('/:id', (req, res) => {
  const budget = db.prepare(`
    SELECT b.*, p.nombre || ' ' || p.apellido AS paciente_nombre, p.cedula
    FROM budgets b
    JOIN patients p ON p.id = b.patient_id
    WHERE b.id = ?
  `).get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  budget.items = db.prepare('SELECT * FROM budget_items WHERE budget_id = ? ORDER BY orden, id').all(req.params.id);
  res.json({ budget });
});

budgetsRouter.post('/', requireRole('admin', 'medico', 'secretaria'), (req, res) => {
  const parse = budgetSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;

  const tx = db.transaction(() => {
    const subtotal = d.items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
    const impuesto = d.impuesto || 0;
    const total = subtotal + impuesto;

    const info = db.prepare(`
      INSERT INTO budgets (patient_id, fecha, estado, subtotal, impuesto, total, notas)
      VALUES (@patient_id, COALESCE(@fecha, date('now')), COALESCE(@estado, 'borrador'), @subtotal, @impuesto, @total, @notas)
    `).run({
      patient_id: d.patient_id,
      fecha: d.fecha ?? null,
      estado: d.estado ?? null,
      subtotal,
      impuesto,
      total,
      notas: d.notas ?? null,
    });

    const itemStmt = db.prepare(`
      INSERT INTO budget_items (budget_id, descripcion, cantidad, precio_unitario, subtotal, orden)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    d.items.forEach((it, i) => {
      itemStmt.run(info.lastInsertRowid, it.descripcion, it.cantidad, it.precio_unitario, it.cantidad * it.precio_unitario, i);
    });

    return info.lastInsertRowid;
  });

  const id = tx();
  res.status(201).json({ id });
});

budgetsRouter.put('/:id', requireRole('admin', 'medico', 'secretaria'), (req, res) => {
  const parse = budgetSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos' });
  const d = parse.data;
  const existing = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  if (existing.estado === 'facturado') return res.status(409).json({ error: 'Presupuesto ya facturado, no se puede editar' });

  const tx = db.transaction(() => {
    const updates = [];
    const params = { id: Number(req.params.id) };
    if (d.fecha !== undefined) { updates.push('fecha = @fecha'); params.fecha = d.fecha; }
    if (d.estado !== undefined) { updates.push('estado = @estado'); params.estado = d.estado; }
    if (d.notas !== undefined) { updates.push('notas = @notas'); params.notas = d.notas; }

    let impuesto = existing.impuesto;
    if (d.impuesto !== undefined) {
      impuesto = d.impuesto;
      updates.push('impuesto = @impuesto');
      params.impuesto = impuesto;
    }

    if (d.items) {
      db.prepare('DELETE FROM budget_items WHERE budget_id = ?').run(req.params.id);
      const itemStmt = db.prepare(`
        INSERT INTO budget_items (budget_id, descripcion, cantidad, precio_unitario, subtotal, orden)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      let subtotal = 0;
      d.items.forEach((it, i) => {
        const s = it.cantidad * it.precio_unitario;
        subtotal += s;
        itemStmt.run(req.params.id, it.descripcion, it.cantidad, it.precio_unitario, s, i);
      });
      updates.push('subtotal = @subtotal', 'total = @total');
      params.subtotal = subtotal;
      params.total = subtotal + impuesto;
    }

    if (updates.length) {
      db.prepare(`UPDATE budgets SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params);
    }
  });

  tx();
  res.json({ ok: true });
});

budgetsRouter.delete('/:id', requireRole('admin', 'medico'), (req, res) => {
  const existing = db.prepare('SELECT estado FROM budgets WHERE id = ?').get(req.params.id);
  if (existing && existing.estado === 'facturado') {
    return res.status(409).json({ error: 'Presupuesto facturado, no se puede eliminar' });
  }
  db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Convertir presupuesto -> factura
budgetsRouter.post('/:id/to-invoice', requireRole('admin', 'medico', 'secretaria'), (req, res) => {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  if (budget.estado === 'facturado') return res.status(409).json({ error: 'Ya fue facturado' });
  if (budget.estado === 'cancelado') return res.status(409).json({ error: 'Presupuesto cancelado' });

  const items = db.prepare('SELECT * FROM budget_items WHERE budget_id = ? ORDER BY orden, id').all(req.params.id);

  const tx = db.transaction(() => {
    const invoiceInfo = db.prepare(`
      INSERT INTO invoices (patient_id, budget_id, fecha, estado, subtotal, impuesto, total, pagado, notas)
      VALUES (?, ?, date('now'), 'pendiente', ?, ?, ?, 0, ?)
    `).run(
      budget.patient_id, budget.id,
      budget.subtotal, budget.impuesto, budget.total, budget.notas
    );

    const invoiceId = invoiceInfo.lastInsertRowid;
    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (invoice_id, descripcion, cantidad, precio_unitario, subtotal, orden)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const it of items) {
      itemStmt.run(invoiceId, it.descripcion, it.cantidad, it.precio_unitario, it.subtotal, it.orden);
    }

    db.prepare(`UPDATE budgets SET estado = 'facturado', invoice_id = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(invoiceId, budget.id);

    return invoiceId;
  });

  const invoiceId = tx();
  res.status(201).json({ invoice_id: invoiceId });
});
