import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function PrintPrescripcion() {
  const { medicationId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [m, s] = await Promise.all([
        api.get(`/medications/by-ids/${medicationId}`),
        api.get('/admin/settings'),
      ]);
      setData({ prescripciones: m.medications, settings: s.settings });
      setTimeout(() => window.print(), 400);
    })();
  }, [medicationId]);

  if (!data) return <div className="p-8">Cargando...</div>;

  const { prescripciones, settings } = data;
  const paciente = prescripciones[0];

  return (
    <div className="min-h-screen bg-white p-12 text-slate-900 max-w-3xl mx-auto print:p-0">
      <header className="border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold">{settings.medico_nombre || 'Dr./Dra. ___'}</h1>
        <p className="text-sm text-slate-600">{settings.medico_especialidad || 'Anestesiologia / Algologia'}</p>
        {settings.medico_exequatur && <p className="text-sm text-slate-600">Exequatur: {settings.medico_exequatur}</p>}
        {(settings.direccion || settings.telefono) && (
          <p className="text-sm text-slate-600 mt-2">
            {settings.direccion}{settings.telefono && ` · Tel: ${settings.telefono}`}
          </p>
        )}
      </header>

      {paciente && (
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Paciente:</strong> {paciente.nombre} {paciente.apellido}</div>
            <div><strong>Cedula:</strong> {paciente.cedula || '-'}</div>
            <div><strong>Edad:</strong> {paciente.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) + ' anos' : '-'}</div>
            <div><strong>Fecha:</strong> {new Date().toLocaleDateString('es-DO')}</div>
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="border-b-2 border-slate-900 pb-2 mb-5">
          <h2 className="text-xl font-bold tracking-wide">Rp.</h2>
        </div>
        {prescripciones.length === 0 ? (
          <p className="text-slate-600">(Sin prescripciones seleccionadas)</p>
        ) : (
          <ol className="space-y-4 list-decimal pl-7">
            {prescripciones.map((p, index) => {
              const t = p.ultima_titulacion;
              return (
                <li key={p.id} className="break-inside-avoid pl-1 text-[16px] leading-snug">
                  <div className="font-semibold text-slate-950">
                    {p.farmaco}
                    {t?.dosis && <span className="font-normal"> - {t.dosis}</span>}
                    {t?.via && <span className="font-normal">, via {t.via}</span>}
                    {t?.frecuencia && <span className="font-normal">, {t.frecuencia}</span>}
                    {p.es_opioide && <span className="font-normal text-[12px] uppercase tracking-wide"> (opioide)</span>}
                  </div>
                  <div className="text-[14px] text-slate-800 mt-1 min-h-[18px]">
                    {p.notas ? p.notas : 'Indicaciones segun criterio medico.'}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

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
