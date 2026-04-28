import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

const itemSchema = z.object({
  descripcion: z.string().min(1),
  cantidad: z.number().int().min(1).default(1),
  precio_unitario: z.number().min(0),
});

const invoiceSchema = z.object({
  patient_id: z.number().int(),
  budget_id: z.number().int().optional().nullable(),
  fecha: z.string().optional(),
  impuesto: z.number().min(0).optional().default(0),
  notas: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

const paymentSchema = z.object({
  monto: z.number().positive(),
  fecha: z.string().optional(),
  metodo: z.enum(['efectivo', 'tarjeta', 'transferencia', 'cheque', 'otro']).optional().nullable(),
  referencia: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

invoicesRouter.get('/', (req, res) => {
  const { patient_id, estado, desde, hasta } = req.query;
  let sql = `
    SELECT i.*, p.nombre || ' ' || p.apellido AS paciente_nombre, p.cedula
    FROM invoices i
    JOIN patients p ON p.id = i.patient_id
    WHERE 1=1
  `;
  const params = [];
  if (patient_id) { sql += ' AND i.patient_id = ?'; params.push(patient_id); }
  if (estado) { sql += ' AND i.estado = ?'; params.push(estado); }
  if (desde) { sql += ' AND i.fecha >= ?'; params.push(desde); }
  if (hasta) { sql += ' AND i.fecha <= ?'; params.push(hasta); }
  sql += ' ORDER BY i.fecha DESC, i.id DESC LIMIT 200';
  const rows = db.prepare(sql).all(...params);
  res.json({ invoices: rows });
});

invoicesRouter.get('/:id', (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, p.nombre || ' ' || p.apellido AS paciente_nombre, p.cedula, p.direccion, p.telefono
    FROM invoices i
    JOIN patients p ON p.id = i.patient_id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY orden, id').all(req.params.id);
  invoice.payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY fecha DESC, id DESC').all(req.params.id);
  res.json({ invoice });
});

invoicesRouter.post('/', requireRole('admin', 'medico', 'secretaria'), (req, res) => {
  const parse = invoiceSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;

  const tx = db.transaction(() => {
    const subtotal = d.items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
    const impuesto = d.impuesto || 0;
    const total = subtotal + impuesto;

    const info = db.prepare(`
      INSERT INTO invoices (patient_id, budget_id, fecha, estado, subtotal, impuesto, total, pagado, notas)
      VALUES (@patient_id, @budget_id, COALESCE(@fecha, date('now')), 'pendiente', @subtotal, @impuesto, @total, 0, @notas)
    `).run({
      patient_id: d.patient_id,
      budget_id: d.budget_id ?? null,
      fecha: d.fecha ?? null,
      subtotal,
      impuesto,
      total,
      notas: d.notas ?? null,
    });

    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (invoice_id, descripcion, cantidad, precio_unitario, subtotal, orden)
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

// Registrar pago
invoicesRouter.post('/:id/payments', requireRole('admin', 'medico', 'secretaria'), (req, res) => {
  const parse = paymentSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  if (invoice.estado === 'anulada') return res.status(409).json({ error: 'Factura anulada' });

  const tx = db.transaction(() => {
    const paymentInfo = db.prepare(`
      INSERT INTO payments (invoice_id, patient_id, fecha, monto, metodo, referencia, notas)
      VALUES (?, ?, COALESCE(?, datetime('now')), ?, ?, ?, ?)
    `).run(
      invoice.id, invoice.patient_id,
      d.fecha ?? null, d.monto,
      d.metodo ?? null, d.referencia ?? null, d.notas ?? null
    );

    const totalPagado = db.prepare('SELECT COALESCE(SUM(monto), 0) AS s FROM payments WHERE invoice_id = ?').get(invoice.id).s;
    const nuevoEstado = totalPagado >= invoice.total ? 'pagada' : totalPagado > 0 ? 'parcial' : 'pendiente';

    db.prepare(`UPDATE invoices SET pagado = ?, estado = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(totalPagado, nuevoEstado, invoice.id);

    return paymentInfo.lastInsertRowid;
  });

  const paymentId = tx();
  res.status(201).json({ id: paymentId });
});

// Anular pago
invoicesRouter.delete('/:id/payments/:paymentId', requireRole('admin', 'medico'), (req, res) => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM payments WHERE id = ? AND invoice_id = ?').run(req.params.paymentId, req.params.id);
    const invoice = db.prepare('SELECT total, estado FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return;
    const totalPagado = db.prepare('SELECT COALESCE(SUM(monto), 0) AS s FROM payments WHERE invoice_id = ?').get(req.params.id).s;
    let nuevoEstado = invoice.estado;
    if (invoice.estado !== 'anulada') {
      nuevoEstado = totalPagado >= invoice.total ? 'pagada' : totalPagado > 0 ? 'parcial' : 'pendiente';
    }
    db.prepare(`UPDATE invoices SET pagado = ?, estado = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(totalPagado, nuevoEstado, req.params.id);
  });
  tx();
  res.json({ ok: true });
});

// Anular factura (solo estado; conserva historia)
invoicesRouter.post('/:id/void', requireRole('admin', 'medico'), (req, res) => {
  db.prepare(`UPDATE invoices SET estado = 'anulada', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// Eliminar factura (solo admin, hard delete)
invoicesRouter.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
