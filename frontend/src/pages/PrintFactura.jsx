import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const fmt = n => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PrintFactura() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/invoices/${id}`),
      api.get('/admin/settings'),
    ]).then(([i, s]) => {
      setData({ invoice: i.invoice, settings: s.settings });
      setTimeout(() => window.print(), 400);
    });
  }, [id]);

  if (!data) return <div className="p-8">Cargando...</div>;
  const { invoice, settings } = data;
  const numero = `FAC-${invoice.fecha.slice(0,4)}-${String(invoice.id).padStart(5, '0')}`;
  const balance = invoice.total - invoice.pagado;

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
          <div className="text-2xl font-bold tracking-wide">FACTURA</div>
          <div className="font-mono text-sm mt-1">{numero}</div>
          <div className="text-xs text-slate-600 mt-1">{invoice.fecha}</div>
          {invoice.estado === 'anulada' && <div className="text-xs font-bold text-rose-700 mt-1">ANULADA</div>}
        </div>
      </header>

      <section className="mb-6 bg-slate-50 p-4 rounded-lg">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cliente</div>
        <div className="font-semibold">{invoice.paciente_nombre}</div>
        <div className="text-sm text-slate-600">
          {invoice.cedula && <>Cédula: {invoice.cedula}</>}
          {invoice.telefono && <> · Tel: {invoice.telefono}</>}
        </div>
        {invoice.direccion && <div className="text-sm text-slate-600">{invoice.direccion}</div>}
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
          {invoice.items.map(it => (
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
            <td className="py-2 text-right tabular-nums">{fmt(invoice.subtotal)}</td>
          </tr>
          {invoice.impuesto > 0 && (
            <tr>
              <td colSpan={3} className="py-2 text-right text-slate-600">Impuesto</td>
              <td className="py-2 text-right tabular-nums">{fmt(invoice.impuesto)}</td>
            </tr>
          )}
          <tr className="border-t-2 border-slate-900 font-bold text-base">
            <td colSpan={3} className="py-3 text-right">TOTAL</td>
            <td className="py-3 text-right tabular-nums">{fmt(invoice.total)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="py-2 text-right text-slate-600">Pagado</td>
            <td className="py-2 text-right tabular-nums text-emerald-700">{fmt(invoice.pagado)}</td>
          </tr>
          <tr className="border-t border-slate-300">
            <td colSpan={3} className="py-2 text-right font-semibold">Balance pendiente</td>
            <td className={`py-2 text-right tabular-nums font-semibold ${balance > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              {invoice.estado === 'anulada' ? '—' : fmt(balance)}
            </td>
          </tr>
        </tfoot>
      </table>

      {invoice.payments && invoice.payments.length > 0 && (
        <section className="mt-6 mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pagos aplicados</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="text-left py-1">Fecha</th>
                <th className="text-left py-1">Método</th>
                <th className="text-left py-1">Referencia</th>
                <th className="text-right py-1">Monto</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map(p => (
                <tr key={p.id}>
                  <td className="py-1">{p.fecha.slice(0, 10)}</td>
                  <td className="py-1 capitalize">{p.metodo || '-'}</td>
                  <td className="py-1">{p.referencia || '-'}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {invoice.notas && (
        <section className="mt-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas</div>
          <p className="text-sm whitespace-pre-wrap">{invoice.notas}</p>
        </section>
      )}

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
