import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

alertsRouter.get('/', (req, res) => {
  // 1) Opioides activos sin re-evaluación en >90 días
  // Toma la última consulta del paciente; si no tiene consultas, usa el inicio de la medicación.
  const opioidesSinRevision = db.prepare(`
    SELECT
      p.id,
      p.nombre,
      p.apellido,
      GROUP_CONCAT(DISTINCT m.farmaco) AS opioides,
      (SELECT date FROM consultations c WHERE c.patient_id = p.id ORDER BY c.date DESC LIMIT 1) AS ultima_consulta,
      CAST(julianday('now') - julianday(
        COALESCE(
          (SELECT date FROM consultations c WHERE c.patient_id = p.id ORDER BY c.date DESC LIMIT 1),
          MIN(m.fecha_inicio)
        )
      ) AS INTEGER) AS dias_sin_revision
    FROM patients p
    JOIN medications m ON m.patient_id = p.id
    WHERE m.activo = 1 AND m.es_opioide = 1
    GROUP BY p.id
    HAVING dias_sin_revision >= 90
    ORDER BY dias_sin_revision DESC
  `).all();

  // 2) Seguimientos (follow-ups) vencidos — fecha ya pasó, aún pendientes
  const seguimientosVencidos = db.prepare(`
    SELECT
      a.id,
      a.fecha,
      a.motivo,
      p.id AS patient_id,
      p.nombre || ' ' || p.apellido AS paciente_nombre,
      CAST(julianday('now') - julianday(a.fecha) AS INTEGER) AS dias_atraso
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.tipo = 'followup'
      AND a.estado = 'pendiente'
      AND a.fecha < date('now')
    ORDER BY a.fecha ASC
  `).all();

  // 3) Pacientes con EVA ≥7 en la última consulta y no han vuelto (>14 días sin cita futura agendada)
  const evaAltoSinRetorno = db.prepare(`
    SELECT
      p.id,
      p.nombre,
      p.apellido,
      c.date AS ultima_consulta,
      c.eva,
      CAST(julianday('now') - julianday(c.date) AS INTEGER) AS dias_sin_volver
    FROM patients p
    JOIN consultations c ON c.id = (
      SELECT id FROM consultations WHERE patient_id = p.id ORDER BY date DESC LIMIT 1
    )
    WHERE c.eva >= 7
      AND julianday('now') - julianday(c.date) > 14
      AND NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.patient_id = p.id
          AND a.estado = 'pendiente'
          AND a.fecha >= date('now')
      )
    ORDER BY c.eva DESC, c.date ASC
  `).all();

  res.json({
    opioides_sin_revision: opioidesSinRevision,
    seguimientos_vencidos: seguimientosVencidos,
    eva_alto_sin_retorno: evaAltoSinRetorno,
    total: opioidesSinRevision.length + seguimientosVencidos.length + evaAltoSinRetorno.length,
  });
});
