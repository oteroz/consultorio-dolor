import { Router } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import { z } from 'zod';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

// Settings — cualquier usuario autenticado los lee (necesario para PDFs); solo admin los modifica
adminRouter.get('/settings', requireAuth, (req, res) => {
  const s = db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get();
  res.json({ settings: s });
});

const settingsSchema = z.object({
  medico_nombre: z.string().optional().nullable(),
  medico_exequatur: z.string().optional().nullable(),
  medico_especialidad: z.string().optional().nullable(),
  consultorio_nombre: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
});

adminRouter.put('/settings', requireRole('admin'), (req, res) => {
  const parse = settingsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos' });
  const d = parse.data;
  const keys = Object.keys(d);
  const sets = keys.map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE clinic_settings SET ${sets}, updated_at = datetime('now') WHERE id = 1`).run(d);
  const s = db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get();
  res.json({ settings: s });
});

// Usuarios (admin only)
adminRouter.get('/users', requireRole('admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT id, username, full_name, role, active, created_at
    FROM users ORDER BY created_at
  `).all();
  res.json({ users: rows });
});

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  full_name: z.string().min(1),
  role: z.enum(['admin', 'medico', 'secretaria']),
});

adminRouter.post('/users', requireRole('admin'), (req, res) => {
  const parse = createUserSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos invalidos', issues: parse.error.issues });
  const { username, password, full_name, role } = parse.data;
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare(
      `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`
    ).run(username, hash, full_name, role);
    const u = db.prepare(
      'SELECT id, username, full_name, role, active FROM users WHERE id = ?'
    ).get(info.lastInsertRowid);
    res.status(201).json({ user: u });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ese username ya existe' });
    }
    throw e;
  }
});

adminRouter.put('/users/:id', requireRole('admin'), (req, res) => {
  const { full_name, role, active, password } = req.body ?? {};
  const updates = [];
  const params = { id: Number(req.params.id) };
  if (full_name !== undefined) { updates.push('full_name = @full_name'); params.full_name = full_name; }
  if (role !== undefined) {
    if (!['admin', 'medico', 'secretaria'].includes(role)) {
      return res.status(400).json({ error: 'Rol invalido' });
    }
    updates.push('role = @role'); params.role = role;
  }
  if (active !== undefined) { updates.push('active = @active'); params.active = active ? 1 : 0; }
  if (password) { updates.push('password_hash = @password_hash'); params.password_hash = bcrypt.hashSync(password, 10); }
  if (updates.length === 0) return res.json({ ok: true });
  db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params);
  res.json({ ok: true });
});

// Cambio de contraseña propia (cualquier usuario)
adminRouter.post('/change-password', requireAuth, (req, res) => {
  const { old_password, new_password } = req.body ?? {};
  if (!old_password || !new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'Datos invalidos' });
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.user.id);
  if (!bcrypt.compareSync(old_password, user.password_hash)) {
    return res.status(401).json({ error: 'Contrasena actual incorrecta' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, req.session.user.id);
  res.json({ ok: true });
});

// Backup — descarga el archivo .db (tras checkpoint WAL)
adminRouter.get('/backup', requireRole('admin'), (req, res) => {
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}
  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `consultorio-backup-${date}.db`;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(config.dbPath).pipe(res);
});
