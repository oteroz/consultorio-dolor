import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const fmt = n => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PrintPresupuesto() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/budgets/${id}`),
      api.get('/admin/settings'),
    ]).then(([b, s]) => {
      setData({ budget: b.budget, settings: s.settings });
      setTimeout(() => window.print(), 400);
    });
  }, [id]);

  if (!data) return <div className="p-8">Cargando...</div>;
  const { budget, settings } = data;
  const numero = `PRES-${budget.fecha.slice(0,4)}-${String(budget.id).padStart(5, '0')}`;

  return (
    <div className="min-h-screen bg-white p-12 text-slate-900 max-w-3xl mx-auto print:p-0">
      <header className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold">{settings?.medico_nombre || 'Dr./Dra. ___'}</h1>
          <p className="text-xs text-slate-600">{settings?.medico_especialidad || 'Anestesiología / Algología'}</p>
          {settings?.medico_exequatur && <p className="text-xs text-slate-600">Exequátur: {settings.medico_exequatur}</p>}
          {(settings?.direccion || settings?.telefono) && (
            <p className="text-xs text-slate-600 mt-1">
              {settings.direccion}{settings.telefono && ` · Tel: ${settings.telefono}`}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-wide">PRESUPUESTO</div>
          <div className="font-mono text-sm mt-1">{numero}</div>
          <div className="text-xs text-slate-600 mt-1">{budget.fecha}</div>
        </div>
      </header>

      <section className="mb-6 bg-slate-50 p-4 rounded-lg">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Paciente</div>
        <div className="font-semibold">{budget.paciente_nombre}</div>
        {budget.cedula && <div className="text-sm text-slate-600">Cédula: {budget.cedula}</div>}
      </section>

      <table className="w-full mb-4 text-sm">
        <thead>
          <tr className="border-b-2 border-slate-900">
            <th className="text-left py-2">Descripción</th>
            <th className="text-right py-2 w-20">Cant.</th>
            <th className="text-right py-2 w-32">P. Unit.</th>
            <th className="text-right py-2 w-32">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {budget.items.map(it => (
            <tr key={it.id} className="border-b border-slate-200">
              <td className="py-2">{it.descripcion}</td>
              <td className="py-2 text-right tabular-nums">{it.cantidad}</td>
              <td className="py-2 text-right tabular-nums">{fmt(it.precio_unitario)}</td>
              <td className="py-2 text-right tabular-nums">{fmt(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 text-right text-slate-600">Subtotal</td>
            <td className="py-2 text-right tabular-nums">{fmt(budget.subtotal)}</td>
          </tr>
          {budget.impuesto > 0 && (
            <tr>
              <td colSpan={3} className="py-2 text-right text-slate-600">Impuesto</td>
              <td className="py-2 text-right tabular-nums">{fmt(budget.impuesto)}</td>
            </tr>
          )}
          <tr className="border-t-2 border-slate-900 font-bold text-base">
            <td colSpan={3} className="py-3 text-right">TOTAL ESTIMADO</td>
            <td className="py-3 text-right tabular-nums">{fmt(budget.total)}</td>
          </tr>
        </tfoot>
      </table>

      {budget.notas && (
        <section className="mt-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas</div>
          <p className="text-sm whitespace-pre-wrap">{budget.notas}</p>
        </section>
      )}

      <section className="mt-6 text-xs text-slate-600 italic">
        Este presupuesto es una cotización y no constituye factura. Vigencia: 30 días desde la fecha de emisión.
      </section>

      <footer className="mt-16 pt-8">
        <div className="border-t-2 border-slate-900 pt-2 w-64 ml-auto text-center">
          <p className="text-sm">Firma y sello</p>
          <p className="text-xs text-slate-600 mt-1">{settings?.medico_nombre || ''}</p>
        </div>
      </footer>

      <div className="mt-8 text-center no-print">
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">
          Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  );
}
