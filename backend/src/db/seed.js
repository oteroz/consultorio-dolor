import bcrypt from 'bcryptjs';
import { db } from './index.js';

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (existing) {
  console.log('El usuario admin ya existe. Nada que hacer.');
  process.exit(0);
}

const password = 'admin1234';
const hash = bcrypt.hashSync(password, 10);

db.prepare(`
  INSERT INTO users (username, password_hash, full_name, role)
  VALUES (?, ?, ?, ?)
`).run('admin', hash, 'Administrador', 'admin');

console.log('Usuario admin creado.');
console.log('  username: admin');
console.log('  password: admin1234');
console.log('Cambiar la contrasena desde el panel admin tras el primer login.');
