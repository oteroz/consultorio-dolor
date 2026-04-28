import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function PrintInforme() {
  const { patientId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, c, proc, meds, s] = await Promise.all([
        api.get(`/patients/${patientId}`),
        api.get(`/consultations/patient/${patientId}`),
        api.get(`/procedures/patient/${patientId}`),
        api.get(`/medications/patient/${patientId}`),
        api.get('/admin/settings'),
      ]);
      setData({
        paciente: p.patient,
        consultas: c.consultations,
        procedimientos: proc.procedures,
        medicamentos: meds.medications,
        settings: s.settings,
      });
      setTimeout(() => window.print(), 500);
    })();
  }, [patientId]);

  if (!data) return <div className="p-8">Cargando...</div>;
  const { paciente, consultas, procedimientos, medicamentos, settings } = data;
  const medsActivas = medicamentos.filter(m => m.activo);

  return (
    <div className="min-h-screen bg-white p-12 text-slate-900 max-w-3xl mx-auto print:p-0">
      <header className="border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold">{settings.medico_nombre || 'Dr./Dra. ___'}</h1>
        <p className="text-sm text-slate-600">{settings.medico_especialidad || 'Anestesiología / Algología'}</p>
        {settings.medico_exequatur && <p className="text-sm text-slate-600">Exequátur: {settings.medico_exequatur}</p>}
        {(settings.direccion || settings.telefono) && (
          <p className="text-sm text-slate-600 mt-1">
            {settings.direccion}{settings.telefono && ` · Tel: ${settings.telefono}`}
          </p>
        )}
      </header>

      <h2 className="text-xl font-bold mb-4">Informe clínico</h2>
      <div className="grid grid-cols-2 gap-2 text-sm mb-6">
        <div><strong>Paciente:</strong> {paciente.nombre} {paciente.apellido}</div>
        <div><strong>Cédula:</strong> {paciente.cedula || '—'}</div>
        <div><strong>Fecha nac.:</strong> {paciente.fecha_nacimiento || '—'}</div>
        <div><strong>Fecha informe:</strong> {new Date().toLocaleDateString('es-DO')}</div>
      </div>

      {paciente.antecedentes_personales && (
        <Block title="Antecedentes personales">{paciente.antecedentes_personales}</Block>
      )}
      {paciente.antecedentes_alergicos && (
        <Block title="Alergias">{paciente.antecedentes_alergicos}</Block>
      )}

      {consultas.length > 0 && (
        <section className="mb-6">
          <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">Consultas</h3>
          <ul className="text-sm space-y-2">
            {consultas.map(c => (
              <li key={c.id}>
                <strong>{new Date(c.date).toLocaleDateString('es-DO')}</strong>
                {c.eva !== null && c.eva !== undefined && <span className="ml-2 text-slate-600">(EVA {c.eva})</span>}
                <br />
                {c.motivo_consulta && <span>{c.motivo_consulta}. </span>}
                {c.diagnostico && <span><em>Dx:</em> {c.diagnostico}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {procedimientos.length > 0 && (
        <section className="mb-6">
          <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">Procedimientos</h3>
          <ul className="text-sm space-y-2">
            {procedimientos.map(p => (
              <li key={p.id}>
                <strong>{new Date(p.fecha).toLocaleDateString('es-DO')}</strong> — <span className="capitalize">{p.tipo}</span>
                {p.subtipo && `: ${p.subtipo}`}
                {p.zona && ` (${p.zona})`}
                {p.resultado && <span className="block text-slate-600 text-xs">Resultado: {p.resultado}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {medsActivas.length > 0 && (
        <section className="mb-6">
          <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">Prescripcion actual</h3>
          <ul className="text-sm space-y-1">
            {medsActivas.map(m => (
              <li key={m.id}>
                <strong>{m.farmaco}</strong>
                {m.ultima_titulacion && ` — ${m.ultima_titulacion.dosis}${m.ultima_titulacion.frecuencia ? ', ' + m.ultima_titulacion.frecuencia : ''}${m.ultima_titulacion.via ? ', ' + m.ultima_titulacion.via : ''}`}
                {m.es_opioide && <span className="ml-2 text-xs text-slate-500">(opioide)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-20 pt-8">
        <div className="border-t-2 border-slate-900 pt-2 w-64 ml-auto text-center">
          <p className="text-sm">Firma y sello</p>
          <p className="text-xs text-slate-600 mt-1">{settings.medico_nombre || ''}</p>
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

function Block({ title, children }) {
  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
    </section>
  );
}
