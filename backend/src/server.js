import express from 'express';
import session from 'express-session';
import SqliteStoreFactory from 'better-sqlite3-session-store';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { db } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { patientsRouter } from './routes/patients.js';
import { consultationsRouter } from './routes/consultations.js';
import { proceduresRouter } from './routes/procedures.js';
import { medicationsRouter } from './routes/medications.js';
import { appointmentsRouter } from './routes/appointments.js';
import { adminRouter } from './routes/admin.js';
import { alertsRouter } from './routes/alerts.js';
import { budgetsRouter } from './routes/budgets.js';
import { invoicesRouter } from './routes/invoices.js';
import { financesRouter } from './routes/finances.js';
import { historiasRouter } from './routes/historias.js';

const SqliteStore = SqliteStoreFactory(session);

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(
  session({
    store: new SqliteStore({
      client: db,
      expired: { clear: true, intervalMs: 15 * 60 * 1000 },
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 12 * 60 * 60 * 1000,
    },
  })
);

app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/procedures', proceduresRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/finances', financesRouter);
app.use('/api/historias', historiasRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// En producción servimos el frontend buildado desde backend/public
if (fs.existsSync(config.publicDir) && fs.existsSync(path.join(config.publicDir, 'index.html'))) {
  app.use(express.static(config.publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(config.publicDir, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`Backend escuchando en http://localhost:${config.port}`);
});
