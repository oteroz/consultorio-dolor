import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const fmt = n => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis',
  'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function numeroALetras(n) {
  n = Math.floor(n);
  if (n === 0) return 'cero';
  if (n < 30) return UNIDADES[n];
  if (n < 100) {
    const d = Math.floor(n / 10), u = n % 10;
    return DECENAS[d] + (u ? ' y ' + UNIDADES[u] : '');
  }
  if (n === 100) return 'cien';
  if (n < 1000) {
    const c = Math.floor(n / 100), r = n % 100;
    return CENTENAS[c] + (r ? ' ' + numeroALetras(r) : '');
  }
  if (n < 1000000) {
    const m = Math.floor(n / 1000), r = n % 1000;
    const miles = m === 1 ? 'mil' : numeroALetras(m) + ' mil';
    return miles + (r ? ' ' + numeroALetras(r) : '');
  }
  return n.toString();
}

function montoEnLetras(n) {
  const entero = Math.floor(n);
  const cent = Math.round((n - entero) * 100);
  const letras = numeroALetras(entero);
  return `${letras} pesos con ${String(cent).padStart(2, '0')}/100`.toUpperCase();
}

export default function PrintRecibo() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      // Necesitamos: pago, factura, paciente, settings
      const payments = await api.get(`/finances/payments?`);
      const payment = payments.payments.find(p => p.id === Number(id));
      let resolvedPayment = payment;
      let invoice = null;
      if (!resolvedPayment) {
        // fallback: buscar vía invoices (costoso pero safe)
        const invs = await api.get('/invoices');
        for (const inv of invs.invoices) {
          const det = await api.get(`/invoices/${inv.id}`);
          const p = det.invoice.payments.find(p => p.id === Number(id));
          if (p) { resolvedPayment = p; invoice = det.invoice; break; }
        }
      } else {
        const det = await api.get(`/invoices/${resolvedPayment.invoice_id}`);
        invoice = det.invoice;
      }
      const settings = (await api.get('/admin/settings')).settings;
      setData({ payment: resolvedPayment, invoice, settings });
      setTimeout(() => window.print(), 400);
    })();
  }, [id]);

  if (!data || !data.payment) return <div className="p-8">Cargando...</div>;
  const { payment, invoice, settings } = data;
  const numero = `REC-${payment.fecha.slice(0,4)}-${String(payment.id).padStart(5, '0')}`;
  const invoiceNumero = invoice ? `FAC-${invoice.fecha.slice(0,4)}-${String(invoice.id).padStart(5, '0')}` : '';

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
          <div className="text-2xl font-bold tracking-wide">RECIBO</div>
          <div className="font-mono text-sm mt-1">{numero}</div>
          <div className="text-xs text-slate-600 mt-1">{payment.fecha.slice(0, 10)}</div>
        </div>
      </header>

      <section className="mb-8">
        <p className="text-sm leading-relaxed">
          Recibí de <strong className="border-b border-slate-400 px-2">{invoice?.paciente_nombre || '—'}</strong>
          {invoice?.cedula && <>, cédula <strong>{invoice.cedula}</strong></>},
          la cantidad de <strong className="text-xl">{fmt(payment.monto)}</strong>
          <span className="italic text-slate-700"> ({montoEnLetras(payment.monto)})</span>,
          {' '}por concepto de abono a <strong>{invoiceNumero}</strong>.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-6 text-sm mb-8">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Método de pago</div>
          <div className="capitalize mt-1">{payment.metodo || 'Efectivo'}</div>
        </div>
        {payment.referencia && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Referencia</div>
            <div className="mt-1">{payment.referencia}</div>
          </div>
        )}
        {invoice && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Factura</div>
            <div className="mt-1">{invoiceNumero}</div>
          </div>
        )}
        {invoice && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance actual</div>
            <div className="mt-1 tabular-nums">
              Total {fmt(invoice.total)} · Pagado {fmt(invoice.pagado)} · Pendiente <strong>{fmt(invoice.total - invoice.pagado)}</strong>
            </div>
          </div>
        )}
      </div>

      {payment.notas && (
        <section className="mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas</div>
          <p className="text-sm">{payment.notas}</p>
        </section>
      )}

      <footer className="mt-16 pt-8">
        <div className="border-t-2 border-slate-900 pt-2 w-64 ml-auto text-center">
          <p className="text-sm">Recibí conforme</p>
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
