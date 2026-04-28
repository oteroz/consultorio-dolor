import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Activity, AlertCircle } from 'lucide-react';

export default function Procedimientos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const ago30 = new Date();
  ago30.setDate(ago30.getDate() - 30);
  const [desde, setDesde] = useState(ago30.toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(today);
  const [tipo, setTipo] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (desde) qs.set('desde', desde);
    if (hasta) qs.set('hasta', hasta);
    if (tipo) qs.set('tipo', tipo);
    api.get('/procedures?' + qs.toString())
      .then(d => setItems(d.procedures))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [desde, hasta, tipo]);

  const tipoStyles = {
    bloqueo: 'bg-brand-100 text-brand-800',
    infiltracion: 'bg-violet-100 text-violet-800',
    neuromodulacion: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Procedimientos</h1>
        <p className="text-sm text-slate-500 mt-1">Listado global — bloqueos, infiltraciones y neuromodulación</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 mb-4 flex items-end gap-3 flex-wrap">
        <label className="block">
          <span className="text-xs font-medium text-slate-600 mb-1 block">Desde</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600 mb-1 block">Hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600 mb-1 block">Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            <option value="bloqueo">Bloqueo</option>
            <option value="infiltracion">Infiltración</option>
            <option value="neuromodulacion">Neuromodulación</option>
          </select>
        </label>
        <div className="ml-auto text-sm text-slate-500">
          {items.length} procedimiento{items.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Activity size={20} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Sin procedimientos en este rango.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                <th className="text-left px-5 py-3 font-semibold">Paciente</th>
                <th className="text-left px-5 py-3 font-semibold">Tipo</th>
                <th className="text-left px-5 py-3 font-semibold">Descripción</th>
                <th className="text-left px-5 py-3 font-semibold">Zona</th>
                <th className="text-left px-5 py-3 font-semibold">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {new Date(p.fecha).toLocaleDateString('es-DO')}
                  </td>
                  <td className="px-5 py-3">
                    <Link to={`/pacientes/${p.patient_id}`} className="text-sm font-medium text-slate-900 hover:text-brand-700">
                      {p.paciente_nombre}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${tipoStyles[p.tipo] || 'bg-slate-100 text-slate-700'}`}>
                      {p.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-700">{p.subtipo || '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{p.zona || '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 max-w-xs">
                    <div className="flex items-start gap-1">
                      {p.complicaciones && <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />}
                      <span className="truncate">{p.resultado || p.complicaciones || '—'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inputCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
