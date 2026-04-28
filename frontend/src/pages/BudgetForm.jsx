import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';

const fmt = n => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BudgetForm() {
  const [searchParams] = useSearchParams();
  const prefilledPatient = searchParams.get('patient');
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({
    patient_id: prefilledPatient || '',
    fecha: new Date().toISOString().slice(0, 10),
    impuesto: '0',
    notas: '',
    items: [{ descripcion: '', cantidad: 1, precio_unitario: '' }],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/patients').then(d => setPatients(d.patients));
  }, []);

  const subtotal = form.items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);
  const impuesto = Number(form.impuesto) || 0;
  const total = subtotal + impuesto;

  function updateItem(i, patch) {
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));
  }
  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { descripcion: '', cantidad: 1, precio_unitario: '' }] }));
  }
  function removeItem(i) {
    setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, idx) => idx !== i) : f.items }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const items = form.items
        .map(it => ({
          descripcion: (it.descripcion || '').trim(),
          cantidad: Number(it.cantidad) || 0,
          precio_unitario: Number(it.precio_unitario) || 0,
        }))
        .filter(it => it.descripcion && it.cantidad > 0 && it.precio_unitario >= 0);

      if (!items.length) throw new Error('Agrega al menos un item con descripción');

      const payload = {
        patient_id: Number(form.patient_id),
        fecha: form.fecha,
        impuesto,
        notas: form.notas || null,
        items,
      };
      const d = await api.post('/budgets', payload);
      navigate(`/finanzas/presupuesto/${d.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link to="/finanzas" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
          <ArrowLeft size={14} /> Volver a Finanzas
        </Link>
        <h1 className="text-2xl font-semibold mt-2 text-slate-900">Nuevo presupuesto</h1>
        <p className="text-sm text-slate-500 mt-1">Cotización para un tratamiento. Podrás convertirlo en factura después.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Paciente *">
              <select required value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className={inputCls}>
                <option value="">-- elegir --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.apellido}, {p.nombre} {p.cedula ? `(${p.cedula})` : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha">
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Items del tratamiento</h3>
            <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium">
              <Plus size={14} /> Agregar línea
            </button>
          </div>
          <div className="space-y-2">
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 md:col-span-6">
                  <input placeholder="Descripción (ej: 4 bloqueos epidurales)" value={it.descripcion} onChange={e => updateItem(i, { descripcion: e.target.value })} className={inputCls} />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <input type="number" min="1" step="1" placeholder="Cant." value={it.cantidad} onChange={e => updateItem(i, { cantidad: e.target.value })} className={inputCls} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <input type="number" min="0" step="0.01" placeholder="Precio unitario" value={it.precio_unitario} onChange={e => updateItem(i, { precio_unitario: e.target.value })} className={inputCls} />
                </div>
                <div className="col-span-3 md:col-span-1 flex justify-end">
                  <button type="button" onClick={() => removeItem(i)} disabled={form.items.length <= 1} className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="col-span-12 text-right text-sm text-slate-500 -mt-1">
                  Subtotal línea: <span className="tabular-nums font-medium text-slate-700">{fmt((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <div className="flex justify-between items-center py-1 text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="tabular-nums font-medium text-slate-900">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-sm">
            <label className="text-slate-600 flex items-center gap-2">
              Impuesto / ITBIS
              <input type="number" min="0" step="0.01" value={form.impuesto} onChange={e => setForm({ ...form, impuesto: e.target.value })} className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right tabular-nums text-sm" />
            </label>
            <span className="tabular-nums font-medium text-slate-900">{fmt(impuesto)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-t border-slate-200 text-lg">
            <span className="font-semibold text-slate-900">Total estimado</span>
            <span className="tabular-nums font-semibold text-brand-700">{fmt(total)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <Field label="Notas (opcional)">
            <textarea rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} className={inputCls} placeholder="ej: Plan de 4 meses con 3 sesiones mensuales" />
          </Field>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Crear presupuesto'}
          </button>
          <Link to="/finanzas" className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm';

function Field({ label, children }) {
  return <label className="block"><span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>{children}</label>;
}
