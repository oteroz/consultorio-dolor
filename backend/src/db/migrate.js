import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, 'migrations');

db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const applied = new Set(
  db.prepare('SELECT name FROM _migrations').all().map(r => r.name)
);

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

const record = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  (skip) ${file}`);
    continue;
  }
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const tx = db.transaction(() => {
    db.exec(sql);
    record.run(file);
  });
  tx();
  console.log(`  + ${file}`);
  ran++;
}

console.log(ran === 0 ? 'Migraciones al dia.' : `Aplicadas ${ran} migracion(es).`);
