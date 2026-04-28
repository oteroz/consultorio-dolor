import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Brain,
  ClipboardList,
  FileText,
  Footprints,
  Hand,
  History,
  Loader2,
  Printer,
  Stethoscope,
  Users,
  Zap,
} from 'lucide-react';
import {
  ANAMNESIS,
  APP,
  ARCOS,
  ESCALA_REFLEJOS,
  ESCALA_TONO,
  MUSCULO_INSP,
  MUSCULOS_TONO,
  NERVIOS,
  REFLEJOS_LISTA,
  REVISION,
  SENSIBILIDAD,
  SOCIAL_FAMILIAR,
} from './historia-clinica-form/clinicalHistoryFields.js';
import { Card, EscalaLegenda, Field, GridDI, inp, LongField } from './historia-clinica-form/components/FormSection.jsx';
import { createHistoria, getPatient, getPatientHistoria, updateHistoria } from './historia-clinica-form/services/clinicalHistoryFormService.js';
import {
  buildEmptyForm,
  buildEmptyReflejos,
  buildEmptyTono,
  hasClinicalData,
  hoyISO,
} from './historia-clinica-form/utils/clinicalHistoryFormUtils.js';

export default function HistoriaClinicaForm() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState(buildEmptyForm());
  const [tono, setTono] = useState(buildEmptyTono());
  const [reflejos, setReflejos] = useState(buildEmptyReflejos());
  const [historiaId, setHistoriaId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const p = await getPatient(patientId);
      setPatient(p);
      const historia = await getPatientHistoria(patientId);
      if (historia) {
        setHistoriaId(historia.id);
        const loaded = {};
        for (const k of Object.keys(form)) loaded[k] = historia[k] ?? '';
        setForm(loaded);
        if (historia.tono_muscular) {
          try { setTono({ ...buildEmptyTono(), ...JSON.parse(historia.tono_muscular) }); } catch {}
        }
        if (historia.reflejos) {
          try { setReflejos({ ...buildEmptyReflejos(), ...JSON.parse(historia.reflejos) }); } catch {}
        }
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form, patient_id: Number(patientId) };
      payload.tono_muscular = JSON.stringify(tono);
      payload.reflejos = JSON.stringify(reflejos);
      if (!hasClinicalData(form, tono, reflejos)) {
        setError('Agrega al menos un dato clinico antes de guardar la historia.');
        setSaving(false);
        return;
      }
      // convertir strings vacíos a null
      for (const k of Object.keys(payload)) {
        if (payload[k] === '') payload[k] = null;
      }
      // fecha no puede ser null — defaultear a hoy si el usuario la borró
      if (!payload.fecha) payload.fecha = hoyISO();

      if (historiaId) {
        await updateHistoria(historiaId, payload);
      } else {
        const res = await createHistoria(payload);
        setHistoriaId(res.id);
      }
      navigate(`/pacientes/${patientId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded || !patient) return <div className="p-8 text-slate-500">Cargando...</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link to={`/pacientes/${patientId}`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
          <ArrowLeft size={14} /> Volver al paciente
        </Link>
        <div className="flex justify-between items-start gap-3 flex-wrap mt-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {historiaId ? 'Editar' : 'Nueva'} historia clínica — <span className="text-slate-600">{patient.nombre} {patient.apellido}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">Unidad del Dolor · fecha {form.fecha || new Date().toISOString().slice(0,10)}</p>
          </div>
          {historiaId && (
            <Link to={`/print/historia-clinica/${patientId}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
              <Printer size={14} /> Imprimir
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card icon={FileText} title="Fecha">
          <div className="max-w-xs">
            <input type="date" value={form.fecha || ''} onChange={e=>setField('fecha', e.target.value)} className={inp} />
          </div>
        </Card>

        <Card icon={ClipboardList} title="Consulta — Anamnesis del dolor">
          {ANAMNESIS.map(([k, l]) => (
            <LongField key={k} label={l} value={form[k]} onChange={v => setField(k, v)} />
          ))}
        </Card>

        <Card icon={History} title="Antecedentes Personales Patológicos">
          {APP.map(([k, l]) => (
            <LongField key={k} label={l} value={form[k]} onChange={v => setField(k, v)} />
          ))}
        </Card>

        <Card icon={Users} title="Antecedentes No Patológicos, Sociales y Familiares">
          {SOCIAL_FAMILIAR.map(([k, l]) => (
            <LongField key={k} label={l} value={form[k]} onChange={v => setField(k, v)} />
          ))}
        </Card>

        <Card icon={Stethoscope} title="Revisión por Sistemas — Constitucional">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Tensión arterial">
              <input className={inp} value={form.tension_arterial || ''} onChange={e=>setField('tension_arterial', e.target.value)} placeholder="ej: 120/80" />
            </Field>
            <Field label="Frecuencia cardíaca">
              <input className={inp} value={form.frecuencia_cardiaca || ''} onChange={e=>setField('frecuencia_cardiaca', e.target.value)} placeholder="ej: 72 lpm" />
            </Field>
            <Field label="Saturación O₂">
              <input className={inp} value={form.saturacion_o2 || ''} onChange={e=>setField('saturacion_o2', e.target.value)} placeholder="ej: 98%" />
            </Field>
          </div>
          <div className="mt-3 space-y-3">
            {REVISION.map(([k, l]) => (
              <LongField key={k} label={l} value={form[k]} onChange={v => setField(k, v)} />
            ))}
          </div>
        </Card>

        <Card icon={Activity} title="Sistema Músculo Esquelético">
          {MUSCULO_INSP.map(([k, l]) => (
            <LongField key={k} label={l} value={form[k]} onChange={v => setField(k, v)} />
          ))}
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">Arco de movimiento (ángulo)</h4>
          {ARCOS.map(([k, l]) => (
            <LongField key={k} label={l} value={form[k]} onChange={v => setField(k, v)} />
          ))}
        </Card>

        <Card icon={Hand} title="Sensibilidad">
          {SENSIBILIDAD.map(([k, l]) => (
            <LongField key={k} label={l} value={form[k]} onChange={v => setField(k, v)} />
          ))}
        </Card>

        <Card icon={Footprints} title="Tono Muscular">
          <EscalaLegenda items={ESCALA_TONO} max={5} />
          <GridDI
            filas={MUSCULOS_TONO}
            data={tono}
            setData={setTono}
            max={5}
          />
        </Card>

        <Card icon={Zap} title="Reflejos">
          <EscalaLegenda items={ESCALA_REFLEJOS} max={4} />
          <GridDI
            filas={REFLEJOS_LISTA}
            data={reflejos}
            setData={setReflejos}
            max={4}
          />
        </Card>

        <Card icon={Brain} title="Nervios Craneales">
          {NERVIOS.map(([k, l]) => (
            <LongField key={k} label={l} value={form[k]} onChange={v => setField(k, v)} />
          ))}
        </Card>

        <Card icon={FileText} title="Notas de evaluación">
          <textarea rows={4} className={inp} value={form.notas_evaluacion || ''} onChange={e=>setField('notas_evaluacion', e.target.value)} />
        </Card>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-2 sticky bottom-4 bg-slate-50/80 backdrop-blur rounded-lg p-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Guardando...' : (historiaId ? 'Guardar cambios' : 'Crear historia clínica')}
          </button>
          <Link to={`/pacientes/${patientId}`} className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

