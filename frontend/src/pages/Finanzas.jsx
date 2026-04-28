import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Wallet, TrendingUp, Users, Plus, CircleDollarSign } from 'lucide-react';

const fmt = n => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Finanzas() {
  const [summary, setSummary] = useState(null);
  const [deudores, setDeudores] = useState([]);
  const [porMes, setPorMes] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    api.get('/finances/summary').then(setSummary).catch(() => {});
    api.get('/finances/deudores').then(d => setDeudores(d.deudores)).catch(() => {});
    api.get('/finances/por-mes').then(d => setPorMes(d.meses)).catch(() => {});
    api.get('/invoices').then(d => setInvoices(d.invoices)).catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Finanzas</h1>
          <p className="text-sm text-slate-500 mt-1">Presupuestos, facturas, pagos y cobros</p>
        </div>
        <div className="flex gap-2">
          <Link to="/finanzas/presupuesto/nuevo" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">
            <Plus size={16} /> Presupuesto
          </Link>
          <Link to="/finanzas/factura/nueva" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm">
            <Plus size={16} /> Factura
          </Link>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Wallet} tone="rose" label="Por cobrar" value={fmt(summary.total_pendiente)} hint={`${summary.pacientes_con_deuda} paciente${summary.pacientes_con_deuda !== 1 ? 's' : ''} con deuda`} />
          <StatCard icon={TrendingUp} tone="brand" label="Facturado este mes" value={fmt(summary.facturado_mes)} hint={`${summary.facturas_mes} factura${summary.facturas_mes !== 1 ? 's' : ''}`} />
          <StatCard icon={CircleDollarSign} tone="emerald" label="Cobrado este mes" value={fmt(summary.cobrado_mes)} hint={`${summary.pagos_mes} pago${summary.pagos_mes !== 1 ? 's' : ''}`} />
          <StatCard icon={Users} tone="slate" label="Cobrado histórico" value={fmt(summary.cobrado_global)} hint="total acumulado" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Deudores</h3>
          {deudores.length === 0 ? (
            <p className="text-sm text-slate-500">Sin deudas pendientes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {deudores.slice(0, 15).map(d => (
                <li key={d.id}>
                  <Link to={`/pacientes/${d.id}`} className="py-3 flex justify-between items-center hover:bg-slate-50 rounded-lg px-2 -mx-2 transition">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{d.apellido}, {d.nombre}</div>
                      <div className="text-xs text-slate-500">{d.facturas_pendientes} factura{d.facturas_pendientes !== 1 ? 's' : ''} pendiente{d.facturas_pendientes !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="font-semibold text-rose-700 tabular-nums shrink-0 ml-2">{fmt(d.deuda)}</div>
                  </Link>
                </li>
              ))}
              {deudores.length > 15 && <li className="pt-2 text-center text-xs text-slate-500">+{deudores.length - 15} más</li>}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Últimos 12 meses</h3>
          <MonthlyChart months={porMes} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Facturas recientes</h3>
          <span className="text-xs text-slate-500">{invoices.length} mostradas</span>
        </div>
        {invoices.length === 0 ? (
          <p className="p-6 text-slate-500 text-sm text-center">Aún no hay facturas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Número</th>
                  <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold">Paciente</th>
                  <th className="text-right px-4 py-3 font-semibold">Total</th>
                  <th className="text-right px-4 py-3 font-semibold">Pagado</th>
                  <th className="text-right px-4 py-3 font-semibold">Balance</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      <Link to={`/finanzas/factura/${i.id}`} className="font-mono text-brand-600 hover:text-brand-700">
                        FAC-{i.fecha.slice(0,4)}-{String(i.id).padStart(5, '0')}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{i.fecha}</td>
                    <td className="px-4 py-3 text-sm">
                      <Link to={`/pacientes/${i.patient_id}`} className="text-slate-900 hover:text-brand-700">{i.paciente_nombre}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700 whitespace-nowrap">{fmt(i.total)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums text-emerald-700 whitespace-nowrap">{fmt(i.pagado)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums font-medium whitespace-nowrap">
                      {i.estado === 'anulada' ? '—' : fmt(i.total - i.pagado)}
                    </td>
                    <td className="px-4 py-3"><EstadoBadge estado={i.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    rose: 'bg-rose-50 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-semibold text-slate-900 mt-2 tabular-nums truncate">{value}</p>
          <p className="text-xs text-slate-500 mt-1 truncate">{hint}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]} shrink-0`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function MonthlyChart({ months }) {
  if (!months.length) return <p className="text-sm text-slate-500">Sin datos.</p>;
  const maxVal = Math.max(...months.flatMap(m => [m.facturado, m.cobrado]), 1);
  const nombresMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return (
    <div>
      <div className="space-y-2.5">
        {months.map(m => {
          const [y, mo] = m.mes.split('-');
          const label = `${nombresMes[Number(mo) - 1]} ${y.slice(2)}`;
          return (
            <div key={m.mes} className="flex items-center gap-3">
              <div className="w-14 text-xs text-slate-500 shrink-0">{label}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-brand-500 rounded-full min-w-[2px]" style={{ width: `${(m.facturado / maxVal) * 100}%` }} />
                  <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{fmt(m.facturado)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-emerald-500 rounded-full min-w-[2px]" style={{ width: `${(m.cobrado / maxVal) * 100}%` }} />
                  <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{fmt(m.cobrado)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 pt-3 mt-3 border-t border-slate-100 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500"></span> Facturado</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Cobrado</span>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    pendiente: 'bg-amber-100 text-amber-800',
    parcial: 'bg-sky-100 text-sky-800',
    pagada: 'bg-emerald-100 text-emerald-800',
    anulada: 'bg-slate-100 text-slate-500',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${styles[estado] || styles.pendiente}`}>{estado}</span>;
}
