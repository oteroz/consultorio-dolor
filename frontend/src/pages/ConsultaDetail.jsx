import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import BodyMap from '../components/BodyMap.jsx';
import { ArrowLeft, Printer, Pencil, Trash2, FileText, Activity } from 'lucide-react';

export default function ConsultaDetail() {
  const { patientId, consultationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consulta, setConsulta] = useState(null);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/consultations/${consultationId}`),
      api.get(`/patients/${patientId}`),
    ]).then(([c, p]) => {
      setConsulta(c.consultation);
      setPatient(p.patient);
    });
  }, [patientId, consultationId]);

  async function eliminar() {
    if (!confirm('¿Eliminar esta consulta? Esta acción no se puede deshacer.')) return;
    await api.delete(`/consultations/${consultationId}`);
    navigate(`/pacientes/${patientId}`);
  }

  if (!consulta || !patient) return <div className="p-8 text-slate-500">Cargando...</div>;

  const canWrite = user.role !== 'secretaria';

  let bodyMapData = null;
  try { bodyMapData = consulta.body_map_data ? JSON.parse(consulta.body_map_data) : null; } catch {}

  const hasEva = consulta.eva !== null && consulta.eva !== undefined;
  const evaColor = !hasEva ? '' :
                   consulta.eva <= 3 ? 'text-emerald-600' :
                   consulta.eva <= 6 ? 'text-amber-600' : 'text-rose-600';
  const evaLabel = !hasEva ? '' :
                   consulta.eva === 0 ? 'Sin dolor' :
                   consulta.eva <= 3 ? 'Leve' :
                   consulta.eva <= 6 ? 'Moderado' :
                   consulta.eva <= 8 ? 'Severo' : 'Máximo';

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link to={`/pacientes/${patientId}`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
          <ArrowLeft size={14} /> Volver al paciente
        </Link>
        <div className="flex justify-between items-start gap-4 flex-wrap mt-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Consulta — <span className="text-slate-600">{patient.nombre} {patient.apellido}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">{new Date(consulta.date).toLocaleString('es-DO')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canWrite && (
              <>
                <Link to={`/pacientes/${patientId}/consulta/${consultationId}/editar`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700">
                  <Pencil size={14} /> Editar
                </Link>
                <button onClick={eliminar} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium">
                  <Trash2 size={14} /> Eliminar
                </button>
              </>
            )}
            <Link to={`/print/receta/${consultationId}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
              <Printer size={14} /> Indicaciones PDF
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card icon={FileText} title="Evolución">
          <Section label="Motivo de consulta" value={consulta.motivo_consulta} />
          <Section label="Antecedentes relevantes" value={consulta.antecedentes_relevantes} />
          <Section label="Examen físico" value={consulta.examen_fisico} />
          <Section label="Diagnóstico" value={consulta.diagnostico} />
          <Section label="Plan / recomendaciones" value={consulta.plan} />
          {!consulta.motivo_consulta && !consulta.antecedentes_relevantes && !consulta.examen_fisico && !consulta.diagnostico && !consulta.plan && (
            <p className="text-sm text-slate-500 italic">Sin contenido en esta consulta.</p>
          )}
        </Card>

        {hasEva && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EVA</h3>
                <p className="text-sm text-slate-600 mt-1">Escala analógica visual del dolor</p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-semibold tabular-nums ${evaColor}`}>
                  {consulta.eva}<span className="text-xl text-slate-400">/10</span>
                </div>
                <div className={`text-xs font-medium uppercase tracking-wider ${evaColor}`}>{evaLabel}</div>
              </div>
            </div>
            <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500">
              <div
                className="absolute -top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-900 shadow"
                style={{ left: `calc(${(consulta.eva / 10) * 100}% - 10px)` }}
                aria-hidden="true"
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0</span><span>5</span><span>10</span>
            </div>
          </div>
        )}

        {bodyMapData && (
          <Card icon={Activity} title="Mapa corporal — zonas de dolor">
            <BodyMap value={bodyMapData} readOnly />
          </Card>
        )}

        {consulta.notas && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notas adicionales</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{consulta.notas}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-brand-600" />
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Section({ label, value }) {
  if (!value) return null;
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-slate-800 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
