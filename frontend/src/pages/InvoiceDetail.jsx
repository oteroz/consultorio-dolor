import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { ArrowLeft, Printer, Plus, Trash2, XCircle, Loader2 } from 'lucide-react';

const fmt = n => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ monto: '', metodo: 'efectivo', referencia: '', notas: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const canWrite = user.role !== 'secretaria' || true; // secretaria puede registrar pagos
  const canDelete = user.role === 'admin' || user.role === 'medico';

  async function load() {
    const d = await api.get(`/invoices/${id}`);
    setInvoice(d.invoice);
  }
  useEffect(() => { load(); }, [id]);

  async function submitPay(e) {
    e.preventDefault();
    setPaying(true);
    setPayError('');
    try {
      const monto = Number(payForm.monto);
      if (!monto || monto <= 0) throw new Error('Monto inválido');
      await api.post(`/invoices/${id}/payments`, {
        monto,
        metodo: payForm.metodo || null,
        referencia: payForm.referencia || null,
        notas: payForm.notas || null,
      });
      setShowPayForm(false);
      setPayForm({ monto: '', metodo: 'efectivo', referencia: '', notas: '' });
      await load();
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPaying(false);
    }
  }

  async function deletePago(paymentId) {
    if (!confirm('¿Anular este pago? El balance de la factura se recalculará.')) return;
    await api.delete(`/invoices/${id}/payments/${paymentId}`);
    load();
  }

  async function voidInvoice() {
    if (!confirm('¿Anular esta factura? No se elimina pero queda marcada como anulada.')) return;
    await api.post(`/invoices/${id}/void`, {});
    load();
  }

  async function deleteInvoice() {
    if (!confirm('¿Eliminar esta factura permanentemente? Esta acción no se puede deshacer.')) return;
    await api.delete(`/invoices/${id}`);
    navigate('/finanzas');
  }

  if (!invoice) return <div className="p-8 text-slate-500">Cargando...</div>;

  const numero = `FAC-${invoice.fecha.slice(0,4)}-${String(invoice.id).padStart(5, '0')}`;
  const balance = invoice.total - invoice.pagado;
  const isAnulada = invoice.estado === 'anulada';

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link to="/finanzas" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
          <ArrowLeft size={14} /> Volver a Finanzas
        </Link>
        <div className="flex justify-between items-start gap-4 flex-wrap mt-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 font-mono">{numero}</h1>
            <p className="text-sm text-slate-500 mt-1">
              <Link to={`/pacientes/${invoice.patient_id}`} className="text-brand-600 hover:text-brand-700">{invoice.paciente_nombre}</Link>
              {invoice.cedula && <> · {invoice.cedula}</>} · {invoice.fecha}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isAnulada && balance > 0 && (
              <button onClick={() => setShowPayForm(!showPayForm)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm">
                <Plus size={14} /> Registrar pago
              </button>
            )}
            <Link to={`/print/factura/${id}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
              <Printer size={14} /> Imprimir factura
            </Link>
            {canDelete && !isAnulada && (
              <button onClick={voidInvoice} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
                <XCircle size={14} /> Anular
              </button>
            )}
            {user.role === 'admin' && (
              <button onClick={deleteInvoice} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium">
                <Trash2 size={14} /> Eliminar
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <EstadoBadge estado={invoice.estado} />
          {invoice.budget_id && (
            <Link to={`/finanzas/presupuesto/${invoice.budget_id}`} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full hover:bg-slate-200">
              desde presupuesto #{invoice.budget_id}
            </Link>
          )}
        </div>
      </div>

      {showPayForm && !isAnulada && balance > 0 && (
        <form onSubmit={submitPay} className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-card animate-fade-in">
          <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-3">Registrar pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Monto *">
              <input
                type="number" required min="0.01" step="0.01" autoFocus
                value={payForm.monto}
                onChange={e => setPayForm({ ...payForm, monto: e.target.value })}
                className={inputCls}
                placeholder={`Máx sugerido: ${balance.toFixed(2)}`}
              />
            </Field>
            <Field label="Método">
              <select value={payForm.metodo} onChange={e => setPayForm({ ...payForm, metodo: e.target.value })} className={inputCls}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="cheque">Cheque</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Referencia (opcional)">
              <input value={payForm.referencia} onChange={e => setPayForm({ ...payForm, referencia: e.target.value })} className={inputCls} placeholder="ej: # autorización, # transferencia" />
            </Field>
            <Field label="Notas (opcional)">
              <input value={payForm.notas} onChange={e => setPayForm({ ...payForm, notas: e.target.value })} className={inputCls} />
            </Field>
          </div>
          {payError && <div className="text-sm text-red-700 mt-3">{payError}</div>}
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={paying} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
              {paying && <Loader2 size={14} className="animate-spin" />}
              Guardar pago
            </button>
            <button type="button" onClick={() => setShowPayForm(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card mb-6">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600 tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Descripción</th>
              <th className="text-right px-4 py-3 font-semibold w-20">Cant.</th>
              <th className="text-right px-4 py-3 font-semibold w-32">P. Unit.</th>
              <th className="text-right px-4 py-3 font-semibold w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map(it => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-sm text-slate-900">{it.descripcion}</td>
                <td className="px-4 py-3 text-sm text-right tabular-nums">{it.cantidad}</td>
                <td className="px-4 py-3 text-sm text-right tabular-nums">{fmt(it.precio_unitario)}</td>
                <td className="px-4 py-3 text-sm text-right tabular-nums font-medium">{fmt(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 text-sm">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Subtotal</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmt(invoice.subtotal)}</td>
            </tr>
            {invoice.impuesto > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Impuesto</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(invoice.impuesto)}</td>
              </tr>
            )}
            <tr className="border-t border-slate-200">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900">TOTAL</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-brand-700 text-lg">{fmt(invoice.total)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Pagado</td>
              <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{fmt(invoice.pagado)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right font-semibold text-slate-900">Balance</td>
              <td className={`px-4 py-2 text-right tabular-nums font-semibold ${balance > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                {isAnulada ? '—' : fmt(balance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoice.notas && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notas</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoice.notas}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Pagos recibidos</h2>
        {invoice.payments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-card">
            <p className="text-sm text-slate-500">Aún no se han registrado pagos.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {invoice.payments.map(pay => (
              <li key={pay.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-card flex justify-between items-center flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">REC-{pay.fecha.slice(0,4)}-{String(pay.id).padStart(5, '0')}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{pay.metodo || 'pago'}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">{new Date(pay.fecha).toLocaleString('es-DO')}</div>
                  {pay.referencia && <div className="text-xs text-slate-500 mt-0.5">Ref: {pay.referencia}</div>}
                  {pay.notas && <div className="text-xs text-slate-500 mt-0.5">{pay.notas}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-emerald-700 text-lg">{fmt(pay.monto)}</span>
                  <Link to={`/print/recibo/${pay.id}`} target="_blank" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                    Recibo
                  </Link>
                  {canDelete && (
                    <button onClick={() => deletePago(pay.id)} className="p-1.5 text-slate-400 hover:text-rose-600" title="Anular pago">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    pendiente: 'bg-amber-100 text-amber-800',
    parcial: 'bg-sky-100 text-sky-800',
    pagada: 'bg-emerald-100 text-emerald-800',
    anulada: 'bg-slate-200 text-slate-600',
  };
  return <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${styles[estado] || styles.pendiente}`}>{estado}</span>;
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm';

function Field({ label, children }) {
  return <label className="block"><span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>{children}</label>;
}
