import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const historiasRouter = Router();
historiasRouter.use(requireAuth);

// Todos los campos de historia (menos id/patient_id/doctor_id/timestamps)
const CAMPOS = [
  'fecha',
  'motivo_consulta', 'inicio_desarrollo', 'distribucion_espacial',
  'aspectos_cualitativos_cuantitativos', 'evolucion_temporal',
  'factores_provocativos', 'factores_paliativos', 'tratamiento_actual',
  'efectos_socio_familiares',
  'diagnosticos_anteriores', 'factores_geneticos_congenitos',
  'factores_nutricionales', 'exposicion_toxicos', 'traumatismos',
  'cirugias', 'transfusiones', 'alergicos', 'anestesicos',
  'ets_its', 'inmunizaciones', 'psiquiatricos', 'habitos_toxicos',
  'estado_salud_previo', 'descripcion_entorno',
  'familiares_problematica', 'incidencia_familiares',
  'otros_antecedentes_familiares',
  'tension_arterial', 'frecuencia_cardiaca', 'saturacion_o2',
  'auscultacion_pulmones', 'auscultacion_corazon', 'juicio_percepcion',
  'inspeccion_dedos_unas', 'examen_articulaciones', 'marcha_movimientos',
  'columna_cervical', 'columna_toracolumbar', 'columna_rotacion',
  'hombros', 'codos', 'munecas_movimiento', 'munecas_palmas_dorsos',
  'prueba_phalen', 'pronacion_supinacion', 'dedos_abrir_cerrar',
  'dedos_tocar_primer', 'miembros_inferiores',
  'deficit_trastorno', 'sensacion_propioceptiva',
  'sensibilidad_presion', 'sensibilidad_combinada',
  'tono_muscular', 'reflejos',
  'nc1_olfatorio', 'nc2_optico', 'nc3_5_oculomotor', 'nc5_trigemino',
  'nc7_facial', 'nc8_auditivo', 'nc9_glosofaringeo', 'nc10_vago',
  'nc11_accesorio', 'nc12_hipogloso',
  'notas_evaluacion',
];

const schemaShape = { patient_id: z.number().int() };
for (const c of CAMPOS) schemaShape[c] = z.string().optional().nullable();
const historiaSchema = z.object(schemaShape);

// GET por paciente (devuelve null si no existe)
historiasRouter.get('/patient/:patientId', (req, res) => {
  const row = db.prepare('SELECT * FROM historias_clinicas WHERE patient_id = ?').get(req.params.patientId);
  res.json({ historia: row || null });
});

historiasRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM historias_clinicas WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Historia no encontrada' });
  res.json({ historia: row });
});

// Crear (1 por paciente — si existe, error)
historiasRouter.post('/', requireRole('admin', 'medico'), (req, res) => {
  const parse = historiaSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const d = parse.data;

  const existing = db.prepare('SELECT id FROM historias_clinicas WHERE patient_id = ?').get(d.patient_id);
  if (existing) return res.status(409).json({ error: 'Este paciente ya tiene historia clínica', id: existing.id });

  const cols = ['patient_id', 'doctor_id', ...CAMPOS];
  // fecha tiene NOT NULL con DEFAULT; usamos COALESCE por si frontend envía null
  const placeholders = cols
    .map(c => c === 'fecha' ? `COALESCE(@${c}, date('now'))` : `@${c}`)
    .join(', ');
  const params = { patient_id: d.patient_id, doctor_id: req.session.user.id };
  for (const c of CAMPOS) params[c] = d[c] ?? null;

  const info = db.prepare(
    `INSERT INTO historias_clinicas (${cols.join(', ')}) VALUES (${placeholders})`
  ).run(params);

  res.status(201).json({ id: info.lastInsertRowid });
});

// Actualizar
historiasRouter.put('/:id', requireRole('admin', 'medico'), (req, res) => {
  const parse = historiaSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos' });
  const d = parse.data;

  const existing = db.prepare('SELECT id FROM historias_clinicas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'No encontrada' });

  const updates = [];
  const params = { id: Number(req.params.id) };
  for (const c of CAMPOS) {
    if (d[c] !== undefined) { updates.push(`${c} = @${c}`); params[c] = d[c] ?? null; }
  }
  if (!updates.length) return res.json({ ok: true });
  updates.push(`updated_at = datetime('now')`);
  db.prepare(`UPDATE historias_clinicas SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json({ ok: true });
});

historiasRouter.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM historias_clinicas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
