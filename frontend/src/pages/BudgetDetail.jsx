import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { ArrowLeft, Printer, Check, XCircle, FileText, Trash2 } from 'lucide-react';

const fmt = n => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [budget, setBudget] = useState(null);

  async function load() {
    const d = await api.get(`/budgets/${id}`);
    setBudget(d.budget);
  }
  useEffect(() => { load(); }, [id]);

  async function changeEstado(estado) {
    await api.put(`/budgets/${id}`, { estado });
    load();
  }

  async function convertir() {
    if (!confirm('¿Convertir este presupuesto en factura? El presupuesto quedará marcado como facturado.')) return;
    const d = await api.post(`/budgets/${id}/to-invoice`, {});
    navigate(`/finanzas/factura/${d.invoice_id}`);
  }

  async function eliminar() {
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return;
    await api.delete(`/budgets/${id}`);
    navigate('/finanzas');
  }

  if (!budget) return <div className="p-8 text-slate-500">Cargando...</div>;

  const numero = `PRES-${budget.fecha.slice(0,4)}-${String(budget.id).padStart(5, '0')}`;
  const canWrite = user.role !== 'secretaria' || user.role === 'secretaria'; // all can see; changes below
  const isEditable = budget.estado !== 'facturado' && budget.estado !== 'cancelado';

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
              <Link to={`/pacientes/${budget.patient_id}`} className="text-brand-600 hover:text-brand-700">{budget.paciente_nombre}</Link>
              {budget.cedula && <> · {budget.cedula}</>} · {budget.fecha}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {budget.estado === 'borrador' && (
              <button onClick={() => changeEstado('aprobado')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium">
                <Check size={14} /> Aprobar
              </button>
            )}
            {isEditable && (
              <button onClick={convertir} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm">
                <FileText size={14} /> Convertir a factura
              </button>
            )}
            <Link to={`/print/presupuesto/${id}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
              <Printer size={14} /> Imprimir
            </Link>
            {isEditable && (
              <button onClick={() => changeEstado('cancelado')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
                <XCircle size={14} /> Cancelar
              </button>
            )}
            {budget.estado !== 'facturado' && (user.role === 'admin' || user.role === 'medico') && (
              <button onClick={eliminar} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium">
                <Trash2 size={14} /> Eliminar
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3 items-center">
          <EstadoBadge estado={budget.estado} />
          {budget.invoice_id && (
            <Link to={`/finanzas/factura/${budget.invoice_id}`} className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full hover:bg-emerald-200">
              facturado como #{budget.invoice_id}
            </Link>
          )}
        </div>
      </div>

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
            {budget.items.map(it => (
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
              <td className="px-4 py-2 text-right tabular-nums">{fmt(budget.subtotal)}</td>
            </tr>
            {budget.impuesto > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Impuesto</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(budget.impuesto)}</td>
              </tr>
            )}
            <tr className="border-t border-slate-200">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900">TOTAL ESTIMADO</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-brand-700 text-lg">{fmt(budget.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {budget.notas && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notas</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{budget.notas}</p>
        </div>
      )}
    </div>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    borrador: 'bg-slate-100 text-slate-600',
    aprobado: 'bg-brand-100 text-brand-800',
    facturado: 'bg-emerald-100 text-emerald-800',
    cancelado: 'bg-slate-200 text-slate-600',
  };
  return <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${styles[estado] || styles.borrador}`}>{estado}</span>;
}
