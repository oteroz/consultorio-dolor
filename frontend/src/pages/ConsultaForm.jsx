import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import BodyMap from '../components/BodyMap.jsx';
import { ArrowLeft, FileText, Activity, Loader2 } from 'lucide-react';

export default function ConsultaForm() {
  const { patientId, consultationId } = useParams();
  const isEdit = Boolean(consultationId);
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState({
    motivo_consulta: '',
    antecedentes_relevantes: '',
    examen_fisico: '',
    diagnostico: '',
    plan: '',
    eva: 5,
    notas: '',
  });
  const [bodyMapData, setBodyMapData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!isEdit);

  useEffect(() => {
    api.get(`/patients/${patientId}`).then(d => setPatient(d.patient));
  }, [patientId]);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/consultations/${consultationId}`).then(d => {
      const c = d.consultation;
      setForm({
        motivo_consulta: c.motivo_consulta ?? '',
        antecedentes_relevantes: c.antecedentes_relevantes ?? '',
        examen_fisico: c.examen_fisico ?? '',
        diagnostico: c.diagnostico ?? '',
        plan: c.plan ?? '',
        eva: c.eva ?? 5,
        notas: c.notas ?? '',
      });
      if (c.body_map_data) {
        try { setBodyMapData(JSON.parse(c.body_map_data)); } catch {}
      }
      setLoaded(true);
    });
  }, [isEdit, consultationId]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        body_map_data: bodyMapData ? JSON.stringify(bodyMapData) : null,
      };
      if (isEdit) {
        await api.put(`/consultations/${consultationId}`, payload);
        navigate(`/pacientes/${patientId}/consulta/${consultationId}`);
      } else {
        payload.patient_id = Number(patientId);
        const d = await api.post('/consultations', payload);
        navigate(`/pacientes/${patientId}/consulta/${d.consultation.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!patient || !loaded) return <div className="p-8 text-slate-500">Cargando...</div>;

  const evaColor = form.eva <= 3 ? 'text-emerald-600' : form.eva <= 6 ? 'text-amber-600' : 'text-rose-600';
  const evaLabel = form.eva === 0 ? 'Sin dolor' :
                   form.eva <= 3 ? 'Leve' :
                   form.eva <= 6 ? 'Moderado' :
                   form.eva <= 8 ? 'Severo' : 'Máximo';

  const backTo = isEdit ? `/pacientes/${patientId}/consulta/${consultationId}` : `/pacientes/${patientId}`;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
          <ArrowLeft size={14} /> {isEdit ? 'Volver a la consulta' : 'Volver al paciente'}
        </Link>
        <h1 className="text-2xl font-semibold mt-2 text-slate-900">
          {isEdit ? 'Editar consulta' : 'Nueva consulta'} — <span className="text-slate-600">{patient.nombre} {patient.apellido}</span>
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card icon={FileText} title="Evolución">
          <Field label="Motivo de consulta">
            <textarea rows={2} className={inputCls} value={form.motivo_consulta} onChange={e=>setForm({...form, motivo_consulta:e.target.value})} />
          </Field>
          <Field label="Antecedentes relevantes">
            <textarea rows={2} className={inputCls} value={form.antecedentes_relevantes} onChange={e=>setForm({...form, antecedentes_relevantes:e.target.value})} />
          </Field>
          <Field label="Examen físico">
            <textarea rows={3} className={inputCls} value={form.examen_fisico} onChange={e=>setForm({...form, examen_fisico:e.target.value})} />
          </Field>
          <Field label="Diagnóstico">
            <textarea rows={2} className={inputCls} value={form.diagnostico} onChange={e=>setForm({...form, diagnostico:e.target.value})} />
          </Field>
          <Field label="Plan / recomendaciones">
            <textarea rows={4} className={inputCls} value={form.plan} onChange={e=>setForm({...form, plan:e.target.value})} placeholder="Procedimientos a realizar, recomendaciones, seguimiento..." />
          </Field>
        </Card>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EVA — Dolor actual</h3>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-semibold tabular-nums ${evaColor}`}>
                {form.eva}<span className="text-lg text-slate-400">/10</span>
              </div>
              <div className={`text-xs font-medium uppercase tracking-wider ${evaColor}`}>{evaLabel}</div>
            </div>
          </div>
          <input
            type="range" min="0" max="10" step="1"
            value={form.eva}
            onChange={e => setForm({...form, eva: Number(e.target.value)})}
            className="eva-slider w-full"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
            <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span>
            <span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
          </div>
        </div>

        <Card icon={Activity} title="Mapa corporal — zonas de dolor">
          <BodyMap value={bodyMapData} onChange={setBodyMapData} />
        </Card>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <Field label="Notas adicionales">
            <textarea rows={2} className={inputCls} value={form.notas} onChange={e=>setForm({...form, notas:e.target.value})} />
          </Field>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 sticky bottom-4">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Guardar consulta')}
          </button>
          <Link to={backTo} className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium">
            Cancelar
          </Link>
        </div>
      </form>
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

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm';

function Field({ label, children }) {
  return (
    <label className="block mb-3 last:mb-0">
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
