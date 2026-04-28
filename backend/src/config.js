import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-cambiar-en-prod',
  dbPath: path.resolve(__dirname, '../data/consultorio.db'),
  publicDir: path.resolve(__dirname, '../public'),
  isProd: process.env.NODE_ENV === 'production',
};
