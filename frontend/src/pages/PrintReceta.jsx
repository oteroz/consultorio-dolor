import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function PrintReceta() {
  const { consultationId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const c = await api.get(`/consultations/${consultationId}`);
      const [s, pat] = await Promise.all([
        api.get('/admin/settings'),
        api.get(`/patients/${c.consultation.patient_id}`),
      ]);
      setData({ consulta: c.consultation, settings: s.settings, paciente: pat.patient });
      setTimeout(() => window.print(), 400);
    })();
  }, [consultationId]);

  if (!data) return <div className="p-8">Cargando...</div>;
  const { consulta, settings, paciente } = data;

  return (
    <div className="min-h-screen bg-white p-12 text-slate-900 max-w-3xl mx-auto print:p-0">
      <header className="border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold">{settings.medico_nombre || 'Dr./Dra. ___'}</h1>
        <p className="text-sm text-slate-600">{settings.medico_especialidad || 'Anestesiología / Algología'}</p>
        {settings.medico_exequatur && <p className="text-sm text-slate-600">Exequátur: {settings.medico_exequatur}</p>}
        {(settings.direccion || settings.telefono) && (
          <p className="text-sm text-slate-600 mt-2">
            {settings.direccion}{settings.telefono && ` · Tel: ${settings.telefono}`}
          </p>
        )}
      </header>

      <section className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Paciente:</strong> {paciente.nombre} {paciente.apellido}</div>
          <div><strong>Cédula:</strong> {paciente.cedula || '—'}</div>
          <div><strong>Edad:</strong> {paciente.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) + ' años' : '—'}</div>
          <div><strong>Fecha:</strong> {new Date(consulta.date).toLocaleDateString('es-DO')}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-slate-300 pb-2 mb-4">Plan / recomendaciones</h2>
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed min-h-[180px]">
          {consulta.plan || '(Sin indicaciones registradas)'}
        </div>
      </section>

      {consulta.diagnostico && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Diagnóstico</h3>
          <p className="text-sm whitespace-pre-wrap">{consulta.diagnostico}</p>
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

function calcularEdad(fechaNac) {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}
