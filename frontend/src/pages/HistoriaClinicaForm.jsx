import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import {
  ArrowLeft, Loader2, Printer,
  ClipboardList, History, Users, Activity, Brain, Stethoscope,
  Hand, Footprints, Zap, FileText,
} from 'lucide-react';

// ============================================================
// Estructura declarativa — cada sección y sus campos
// ============================================================

const ANAMNESIS = [
  ['motivo_consulta', 'Motivo de consulta (síntomas principales)'],
  ['inicio_desarrollo', 'Inicio y desarrollo de los mismos'],
  ['distribucion_espacial', 'Distribución espacial'],
  ['aspectos_cualitativos_cuantitativos', 'Aspectos cualitativos y cuantitativos'],
  ['evolucion_temporal', 'Evolución temporal'],
  ['factores_provocativos', 'Factores provocativos'],
  ['factores_paliativos', 'Factores paliativos'],
  ['tratamiento_actual', 'Tratamiento actual'],
  ['efectos_socio_familiares', 'Efectos socio-familiares secundarios a este problema'],
];

const APP = [
  ['diagnosticos_anteriores', 'Diagnósticos anteriores'],
  ['factores_geneticos_congenitos', 'Factores genéticos y/o congénitos al problema'],
  ['factores_nutricionales', 'Factores nutricionales (pescados, crustáceos, moluscos, yuca, tubérculos, hojas, cáscaras)'],
  ['exposicion_toxicos', 'Exposición a sustancias y/o elementos tóxicos (organofosforados, solventes, pinturas, pigmentos, aceite dieléctrico, metales)'],
  ['traumatismos', 'Traumatismos'],
  ['cirugias', 'Cirugías'],
  ['transfusiones', 'Transfusiones (cuántas unidades y circunstancias)'],
  ['alergicos', 'Alérgicos (medicamentos / sustancias no alimenticias)'],
  ['anestesicos', 'Anestésicos (tipo y duración)'],
  ['ets_its', 'ETS/ITS'],
  ['inmunizaciones', 'Inmunizaciones'],
  ['psiquiatricos', 'Psiquiátricos y psiquiátricos-familiares'],
  ['habitos_toxicos', 'Hábitos tóxicos (tabaco, alcohol, drogas, café e infusiones)'],
];

const SOCIAL_FAMILIAR = [
  ['estado_salud_previo', 'Estado de salud antes de aparecer la sintomatología'],
  ['descripcion_entorno', 'Descripción del entorno por el paciente (¿modifica el entorno la condición del paciente?)'],
  ['familiares_problematica', 'Familiares directos con la misma problemática'],
  ['incidencia_familiares', '¿Inciden los familiares en la problemática del paciente?'],
  ['otros_antecedentes_familiares', 'Otros antecedentes a destacar'],
];

const REVISION = [
  ['auscultacion_pulmones', 'Respiratorio — Auscultación pulmones (murmullos vesiculares, adventicios y roces, simetría, uso de músculos accesorios, cicatrices)'],
  ['auscultacion_corazon', 'Cardiovascular — Auscultación del corazón (ritmo, soplos, sonidos)'],
  ['juicio_percepcion', 'Psiquiátrico — Juicio de percepción (orientación tiempo/espacio/persona, memoria reciente y remota, humor y afecto, depresión, ansiedad, agitación)'],
];

const MUSCULO_INSP = [
  ['inspeccion_dedos_unas', 'Inspección y/o palpación de dedos y uñas'],
  ['examen_articulaciones', 'Examen de las articulaciones, los huesos y los músculos de las áreas'],
  ['marcha_movimientos', 'Marcha — movimientos (rotación e inclinación pélvica, flexión rodilla, desplazamiento centro gravedad, balanceo y desigualdad longitud miembros inferiores)'],
];

const ARCOS = [
  ['columna_cervical', 'Columna cervical — Flexión lateral, rotación 0-80°, flexión 0-60°, extensión 0-75°'],
  ['columna_toracolumbar', 'Columna toracolumbar — Flexión 0-90°, flexión lateral 0-25°, extensión espinal 0-30°'],
  ['columna_rotacion', 'Rotación'],
  ['hombros', 'Hombros (simetría, deltoides, escápula, flexión externa y frontal, rotación externa e interna)'],
  ['codos', 'Codos (hombro ipsilateral y separar el brazo del cuerpo)'],
  ['munecas_movimiento', 'Muñecas — Movimiento 130-0-130°'],
  ['munecas_palmas_dorsos', 'Colocar las palmas y dorsos de las manos juntas'],
  ['prueba_phalen', 'Prueba de Phalen y Phalen inversa (derecha / izquierda)'],
  ['pronacion_supinacion', 'Movimientos de pronación y supinación (derecha / izquierda)'],
  ['dedos_abrir_cerrar', 'Dedos — Abrir y cerrar puños'],
  ['dedos_tocar_primer', 'Tocar el primer dedo contra los demás (derecho e izquierdo)'],
  ['miembros_inferiores', 'Miembros inferiores (acuclillarse, arrastra pies, pie caído, discrepancias entre rodillas y cadera, deformidad articular)'],
];

const SENSIBILIDAD = [
  ['deficit_trastorno', 'Déficit o trastorno (central y/o periférico, entumecimiento, ardor, presión, tumefacción, hormigueo, picor, constricción y pesadez)'],
  ['sensacion_propioceptiva', 'Sensación propioceptiva (músculos, ligamentos, huesos, tendones y articulaciones)'],
  ['sensibilidad_presion', 'Sensibilidad a la presión (reticular)'],
  ['sensibilidad_combinada', 'Combinada (cortical)'],
];

const NERVIOS = [
  ['nc1_olfatorio', 'I. Olfatorio — Olfato (anosmia y otros)'],
  ['nc2_optico', 'II. Óptico — Agudeza, campos, percepción a la profundidad e identificación de colores'],
  ['nc3_5_oculomotor', 'III-IV-VI. Oculomotor, Troclear y Motor Ocular Externo — Desconjugación de la mirada y balance del eje visual'],
  ['nc5_trigemino', 'V. Trigémino — Sensibilidad de la cara y movimiento de la masticación (movimiento, simetría, fuerza de la mordida)'],
  ['nc7_facial', 'VII. Facial — Sensibilidad de la lengua, membrana timpánica, y expresión de la cara (sonríe y frunce la cara)'],
  ['nc8_auditivo', 'VIII. Auditivo — Vestibular (mareos centrípetos y equilibrio), y coclear (ruidos débiles/fuertes, altos/bajos)'],
  ['nc9_glosofaringeo', 'IX. Glosofaríngeo — Movimientos paladar blando, sensibilidad tercio posterior lengua (náuseas/amargos), autonómico (salivación, reflejo úvula)'],
  ['nc10_vago', 'X. Vago — Defectos del habla (guturales y palatinos), pérdida del reflejo protector al tragar, reflejo vagal por compresión globo ocular'],
  ['nc11_accesorio', 'XI. Accesorio — Elevación hombros (trapecio) y rotación cabeza izquierda/derecha'],
  ['nc12_hipogloso', 'XII. Hipogloso — Movimientos de la lengua'],
];

const MUSCULOS_TONO = [
  ['brazo', 'Brazo'],
  ['antebrazo', 'Antebrazo'],
  ['mano', 'Mano'],
  ['pierna', 'Pierna'],
  ['muslo', 'Muslo'],
  ['pie', 'Pie'],
];

const REFLEJOS_LISTA = [
  ['biceps_c5', 'Bíceps C5'],
  ['braquio_radial_c6', 'Braquio radial C6'],
  ['triceps_c7', 'Tríceps C7'],
  ['flexores_c8', 'Flexores seclos C8'],
  ['cuadriceps_l2_4', 'Cuádriceps L2, L3 y L4'],
  ['triceps_sural', 'Tríceps Sural L5, L1 y S2'],
  ['aquileo', 'Aquíleo'],
  ['corneal', 'Corneal V, VII'],
  ['nauseoso', 'Nauseoso IX, X'],
  ['abd_sup', 'Abd Sup T8-T9, T9-T10'],
  ['cremasterico', 'Cremastérico L1 y L5'],
  ['anal', 'Anal S3, S4 y S5'],
  ['babinski', 'Babinski'],
  ['chaddock', 'Chaddock'],
  ['oppenheim', 'Oppenheim'],
];

const ESCALA_TONO = [
  { n: 5, label: 'Fisiológica' }, { n: 4, label: 'Buena' },
  { n: 3, label: 'Aceptable' }, { n: 2, label: 'Pobre' },
  { n: 1, label: 'Indicios' }, { n: 0, label: 'Cero' },
];

const ESCALA_REFLEJOS = [
  { n: 0, label: 'Ausente' }, { n: 1, label: 'Vestigial' },
  { n: 2, label: 'Fisiológico' }, { n: 3, label: 'Exaltado' },
  { n: 4, label: 'Espástico' },
];

// ============================================================
// Componente principal
// ============================================================

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
      const p = await api.get(`/patients/${patientId}`);
      setPatient(p.patient);
      const h = await api.get(`/historias/patient/${patientId}`);
      if (h.historia) {
        setHistoriaId(h.historia.id);
        const loaded = {};
        for (const k of Object.keys(form)) loaded[k] = h.historia[k] ?? '';
        setForm(loaded);
        if (h.historia.tono_muscular) {
          try { setTono({ ...buildEmptyTono(), ...JSON.parse(h.historia.tono_muscular) }); } catch {}
        }
        if (h.historia.reflejos) {
          try { setReflejos({ ...buildEmptyReflejos(), ...JSON.parse(h.historia.reflejos) }); } catch {}
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
        await api.put(`/historias/${historiaId}`, payload);
      } else {
        const res = await api.post('/historias', payload);
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

// ============================================================
// Helpers de estructura
// ============================================================

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildEmptyForm() {
  const keys = [
    'fecha',
    ...ANAMNESIS.map(x => x[0]),
    ...APP.map(x => x[0]),
    ...SOCIAL_FAMILIAR.map(x => x[0]),
    'tension_arterial', 'frecuencia_cardiaca', 'saturacion_o2',
    ...REVISION.map(x => x[0]),
    ...MUSCULO_INSP.map(x => x[0]),
    ...ARCOS.map(x => x[0]),
    ...SENSIBILIDAD.map(x => x[0]),
    ...NERVIOS.map(x => x[0]),
    'notas_evaluacion',
  ];
  const obj = {};
  for (const k of keys) obj[k] = '';
  obj.fecha = hoyISO();
  return obj;
}

function buildEmptyTono() {
  const o = {};
  for (const [k] of MUSCULOS_TONO) o[k] = { d: '', i: '' };
  return o;
}

function buildEmptyReflejos() {
  const o = {};
  for (const [k] of REFLEJOS_LISTA) o[k] = { d: '', i: '' };
  return o;
}

function hasClinicalData(form, tono, reflejos) {
  const hasText = Object.keys(form)
    .filter(k => k !== 'fecha')
    .some(k => String(form[k] ?? '').trim() !== '');
  const hasTono = Object.values(tono).some(v => v?.d !== '' || v?.i !== '');
  const hasReflejos = Object.values(reflejos).some(v => v?.d !== '' || v?.i !== '');
  return hasText || hasTono || hasReflejos;
}

// ============================================================
// Componentes UI
// ============================================================

function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function LongField({ label, value, onChange }) {
  return (
    <label className="block mb-3 last:mb-0">
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      <textarea rows={2} className={inp} value={value || ''} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function EscalaLegenda({ items, max }) {
  return (
    <div className="mb-3 flex gap-3 flex-wrap text-xs text-slate-600">
      {items.map(({ n, label }) => (
        <span key={n} className="inline-flex items-center gap-1">
          <span className="font-mono font-semibold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{n}/{max}</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}

function GridDI({ filas, data, setData, max }) {
  function setCell(k, side, val) {
    const v = val === '' ? '' : Math.max(0, Math.min(max, Number(val) || 0));
    setData(d => ({ ...d, [k]: { ...d[k], [side]: v } }));
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-500 tracking-wider border-b border-slate-200">
            <th className="text-left py-2 font-semibold">Zona / Reflejo</th>
            <th className="text-center py-2 font-semibold w-24">Derecha</th>
            <th className="text-center py-2 font-semibold w-24">Izquierda</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map(([k, label]) => (
            <tr key={k}>
              <td className="py-2 text-slate-700">{label}</td>
              <td className="py-1 text-center">
                <input
                  type="number" min="0" max={max}
                  className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={data[k]?.d ?? ''}
                  onChange={e => setCell(k, 'd', e.target.value)}
                />
              </td>
              <td className="py-1 text-center">
                <input
                  type="number" min="0" max={max}
                  className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={data[k]?.i ?? ''}
                  onChange={e => setCell(k, 'i', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm';
