import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export const financesRouter = Router();
financesRouter.use(requireAuth);

// Resumen global
financesRouter.get('/summary', (req, res) => {
  const now = new Date();
  const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const totalPendiente = db.prepare(`
    SELECT COALESCE(SUM(total - pagado), 0) AS s
    FROM invoices
    WHERE estado IN ('pendiente', 'parcial')
  `).get().s;

  const facturadoMes = db.prepare(`
    SELECT COALESCE(SUM(total), 0) AS s, COUNT(*) AS c
    FROM invoices
    WHERE estado != 'anulada' AND fecha >= ?
  `).get(inicioMes);

  const cobradoMes = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) AS s, COUNT(*) AS c
    FROM payments
    WHERE fecha >= ?
  `).get(inicioMes);

  const cobradoGlobal = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) AS s FROM payments
  `).get().s;

  const pacientesConDeuda = db.prepare(`
    SELECT COUNT(DISTINCT patient_id) AS c
    FROM invoices
    WHERE estado IN ('pendiente', 'parcial')
  `).get().c;

  res.json({
    total_pendiente: totalPendiente,
    cobrado_global: cobradoGlobal,
    facturado_mes: facturadoMes.s,
    facturas_mes: facturadoMes.c,
    cobrado_mes: cobradoMes.s,
    pagos_mes: cobradoMes.c,
    pacientes_con_deuda: pacientesConDeuda,
  });
});

// Deudores: pacientes con deuda pendiente, ordenados por deuda desc
financesRouter.get('/deudores', (req, res) => {
  const rows = db.prepare(`
    SELECT
      p.id,
      p.nombre,
      p.apellido,
      p.cedula,
      p.telefono,
      COUNT(i.id) AS facturas_pendientes,
      COALESCE(SUM(i.total - i.pagado), 0) AS deuda
    FROM patients p
    JOIN invoices i ON i.patient_id = p.id
    WHERE i.estado IN ('pendiente', 'parcial')
    GROUP BY p.id
    ORDER BY deuda DESC
  `).all();
  res.json({ deudores: rows });
});

// Resumen por mes (últimos 12 meses)
financesRouter.get('/por-mes', (req, res) => {
  const rows = db.prepare(`
    WITH meses AS (
      SELECT strftime('%Y-%m', datetime('now', '-' || n || ' months')) AS mes
      FROM (
        SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
        UNION SELECT 10 UNION SELECT 11
      )
    )
    SELECT
      m.mes,
      COALESCE((SELECT SUM(total) FROM invoices WHERE strftime('%Y-%m', fecha) = m.mes AND estado != 'anulada'), 0) AS facturado,
      COALESCE((SELECT SUM(monto) FROM payments WHERE strftime('%Y-%m', fecha) = m.mes), 0) AS cobrado
    FROM meses m
    ORDER BY m.mes ASC
  `).all();
  res.json({ meses: rows });
});

// Finanzas completas de un paciente
financesRouter.get('/patient/:id', (req, res) => {
  const invoices = db.prepare(`
    SELECT * FROM invoices WHERE patient_id = ? ORDER BY fecha DESC, id DESC
  `).all(req.params.id);

  const payments = db.prepare(`
    SELECT pay.*, i.id AS inv_id, i.fecha AS inv_fecha
    FROM payments pay
    JOIN invoices i ON i.id = pay.invoice_id
    WHERE pay.patient_id = ?
    ORDER BY pay.fecha DESC, pay.id DESC
  `).all(req.params.id);

  const budgets = db.prepare(`
    SELECT * FROM budgets WHERE patient_id = ? ORDER BY fecha DESC, id DESC
  `).all(req.params.id);

  const totalFacturado = invoices
    .filter(i => i.estado !== 'anulada')
    .reduce((s, i) => s + i.total, 0);
  const totalPagado = payments.reduce((s, p) => s + p.monto, 0);
  const deuda = invoices
    .filter(i => i.estado === 'pendiente' || i.estado === 'parcial')
    .reduce((s, i) => s + (i.total - i.pagado), 0);

  res.json({
    invoices,
    payments,
    budgets,
    summary: { total_facturado: totalFacturado, total_pagado: totalPagado, deuda },
  });
});

// Listado global de pagos con filtros
financesRouter.get('/payments', (req, res) => {
  const { desde, hasta, patient_id } = req.query;
  let sql = `
    SELECT pay.*, p.nombre || ' ' || p.apellido AS paciente_nombre, p.cedula, i.fecha AS invoice_fecha
    FROM payments pay
    JOIN patients p ON p.id = pay.patient_id
    JOIN invoices i ON i.id = pay.invoice_id
    WHERE 1=1
  `;
  const params = [];
  if (patient_id) { sql += ' AND pay.patient_id = ?'; params.push(patient_id); }
  if (desde) { sql += ' AND pay.fecha >= ?'; params.push(desde); }
  if (hasta) { sql += " AND pay.fecha <= datetime(?, '+1 day')"; params.push(hasta); }
  sql += ' ORDER BY pay.fecha DESC, pay.id DESC LIMIT 200';
  const rows = db.prepare(sql).all(...params);
  res.json({ payments: rows });
});
