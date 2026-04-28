import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Datos invalidos' });
  }

  const { username, password } = parse.data;
  const user = db.prepare(`
    SELECT id, username, password_hash, full_name, role, active
    FROM users WHERE username = ?
  `).get(username);

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
  };

  res.json({ user: req.session.user });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  res.json({ user: req.session.user });
});
