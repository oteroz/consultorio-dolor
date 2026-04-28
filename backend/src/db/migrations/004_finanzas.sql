-- Módulo de facturación, presupuestos y pagos

-- Facturas (se crean antes que budgets para evitar forward-reference)
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  budget_id INTEGER,
  fecha TEXT NOT NULL DEFAULT (date('now')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagada', 'anulada')),
  subtotal REAL NOT NULL DEFAULT 0,
  impuesto REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  pagado REAL NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id, fecha DESC);
CREATE INDEX idx_invoices_estado ON invoices(estado);
CREATE INDEX idx_invoices_fecha ON invoices(fecha DESC);

CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Presupuestos
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL DEFAULT (date('now')),
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'aprobado', 'facturado', 'cancelado')),
  subtotal REAL NOT NULL DEFAULT 0,
  impuesto REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_budgets_patient ON budgets(patient_id, fecha DESC);
CREATE INDEX idx_budgets_estado ON budgets(estado);

CREATE TABLE budget_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_budget_items_budget ON budget_items(budget_id);

-- Pagos (cada pago aplica a una factura; puede ser parcial)
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  monto REAL NOT NULL,
  metodo TEXT,
  referencia TEXT,
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_patient ON payments(patient_id, fecha DESC);
CREATE INDEX idx_payments_fecha ON payments(fecha DESC);
