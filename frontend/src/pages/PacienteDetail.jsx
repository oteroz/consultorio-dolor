import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  Clock, User, FileText, Activity, Pill, Calendar as CalIcon, Wallet, ClipboardList,
  Pencil, Trash2, Printer, Plus, AlertCircle, TrendingDown,
} from 'lucide-react';
import EvaChart from '../components/EvaChart.jsx';

const TABS = [
  { key: 'historia', label: 'Cronología', icon: Clock },
  { key: 'historia_clinica', label: 'Historia clínica', icon: ClipboardList },
  { key: 'info', label: 'Información', icon: User },
  { key: 'consultas', label: 'Consultas', icon: FileText },
  { key: 'procedimientos', label: 'Procedimientos', icon: Activity },
  { key: 'prescripcion', label: 'Prescripcion', icon: Pill },
  { key: 'cuenta', label: 'Cuenta', icon: Wallet },
  { key: 'agenda', label: 'Agenda', icon: CalIcon },
];

export default function PacienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState('historia');

  useEffect(() => {
    api.get(`/patients/${id}`).then(d => setPatient(d.patient));
  }, [id]);

  async function eliminar() {
    if (!confirm('¿Eliminar este paciente y toda su información?')) return;
    await api.delete(`/patients/${id}`);
    navigate('/pacientes');
  }

  if (!patient) return <div className="p-8 text-slate-500">Cargando...</div>;

  const canWrite = user.role !== 'secretaria';
  const initials = (patient.nombre[0] + (patient.apellido[0] || '')).toUpperCase();

  return (
    <div className="p-8 max-w-6xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 mb-6 flex justify-between items-start gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white flex items-center justify-center text-xl font-semibold shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900 truncate">{patient.nombre} {patient.apellido}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {patient.cedula || 'Sin cédula'}
              {patient.telefono && <> · {patient.telefono}</>}
              {patient.fecha_nacimiento && <> · {calcularEdad(patient.fecha_nacimiento)} años</>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link to={`/pacientes/${id}/editar`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700">
            <Pencil size={14} /> Editar
          </Link>
          {user.role === 'admin' && (
            <button onClick={eliminar} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium">
              <Trash2 size={14} /> Eliminar
            </button>
          )}
          <Link to={`/print/informe/${id}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
            <Printer size={14} /> Informe PDF
          </Link>
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              tab === t.key
                ? 'text-brand-700 border-brand-600'
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'historia' && <HistoriaTab patientId={id} />}
        {tab === 'historia_clinica' && <HistoriaClinicaTab patientId={id} canWrite={canWrite} />}
        {tab === 'info' && <InfoTab patient={patient} patientId={id} />}
        {tab === 'consultas' && <ConsultasTab patientId={id} canWrite={canWrite} />}
        {tab === 'procedimientos' && <ProcedimientosTab patientId={id} canWrite={canWrite} />}
        {tab === 'prescripcion' && <MedicacionTab patientId={id} canWrite={canWrite} />}
        {tab === 'cuenta' && <CuentaTab patientId={id} />}
        {tab === 'agenda' && <AgendaTab patient={patient} />}
      </div>
    </div>
  );
}

/* --------------------------- HISTORIA (TIMELINE) --------------------------- */

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function sortKeyFrom(dateStr, fallbackTime = '00:00:00') {
  if (!dateStr) return '0000-00-00T00:00:00';
  const s = dateStr.replace(' ', 'T');
  return s.length <= 10 ? `${s}T${fallbackTime}` : s;
}

function HistoriaTab({ patientId }) {
  const [events, setEvents] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const desde = new Date(); desde.setFullYear(desde.getFullYear() - 5);
        const hasta = new Date(); hasta.setFullYear(hasta.getFullYear() + 1);
        const desdeISO = desde.toISOString().slice(0, 10);
        const hastaISO = hasta.toISOString().slice(0, 10);

        const [consults, procs, meds, titrs, appts] = await Promise.all([
          api.get(`/consultations/patient/${patientId}`),
          api.get(`/procedures/patient/${patientId}`),
          api.get(`/medications/patient/${patientId}`),
          api.get(`/medications/patient/${patientId}/titrations`),
          api.get(`/appointments?desde=${desdeISO}&hasta=${hastaISO}`),
        ]);

        setConsultations(consults.consultations);
        setProcedures(procs.procedures);

        const list = [];

        for (const c of consults.consultations) {
          list.push({ type: 'consulta', sortKey: sortKeyFrom(c.date), title: c.motivo_consulta || 'Consulta', data: c });
        }

        for (const p of procs.procedures) {
          list.push({ type: 'procedimiento', sortKey: sortKeyFrom(p.fecha), title: p.subtipo || p.tipo, tipo: p.tipo, data: p });
        }

        for (const m of meds.medications) {
          list.push({ type: 'medicacion-inicio', sortKey: sortKeyFrom(m.fecha_inicio), title: `Prescripcion: ${m.farmaco}`, data: m });
          if (!m.activo && m.fecha_fin) {
            list.push({ type: 'medicacion-fin', sortKey: sortKeyFrom(m.fecha_fin, '23:59:00'), title: `Prescripcion suspendida: ${m.farmaco}`, data: m });
          }
        }

        // Titulaciones: ocultar el "Inicio" automático (ya contado como medicacion-inicio)
        for (const t of titrs.titrations) {
          if (t.motivo_cambio === 'Inicio') continue;
          list.push({ type: 'titulacion', sortKey: sortKeyFrom(t.fecha, '12:00:00'), title: `Titulación: ${t.farmaco}`, data: t });
        }

        for (const a of (appts.appointments || []).filter(x => x.patient_id === Number(patientId))) {
          list.push({
            type: 'cita',
            sortKey: `${a.fecha}T${a.hora || '00:00'}:00`,
            title: a.motivo || (a.tipo === 'cita' ? 'Cita programada' : a.tipo === 'walkin' ? 'Sin cita' : 'Seguimiento'),
            tipo: a.tipo,
            data: a,
          });
        }

        list.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
        setEvents(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  if (loading) return <div className="text-sm text-slate-500">Cargando historia...</div>;

  const hasChartData = consultations.some(c => c.eva !== null && c.eva !== undefined) || procedures.length > 0;

  if (events.length === 0) return (
    <>
      {hasChartData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card mb-6">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-brand-600" />
            Evolución del dolor (EVA)
          </h3>
          <EvaChart consultations={consultations} procedures={procedures} />
        </div>
      )}
      <EmptyState icon={Clock} text="Aún no hay historia clínica. Empieza con una consulta." />
    </>
  );

  const groups = [];
  let current = null;
  for (const e of events) {
    const d = new Date(e.sortKey);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!current || current.key !== key) {
      current = { key, label: `${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}`, events: [] };
      groups.push(current);
    }
    current.events.push(e);
  }

  return (
    <div>
      {hasChartData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card mb-6">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-brand-600" />
            Evolución del dolor (EVA)
          </h3>
          <EvaChart consultations={consultations} procedures={procedures} />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Historia cronológica</h2>
        <div className="text-xs text-slate-500">{events.length} eventos</div>
      </div>

      <div className="space-y-8">
        {groups.map(g => (
          <div key={g.key}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{g.label}</h3>
            <ol className="relative border-l-2 border-slate-200 ml-3 space-y-4">
              {g.events.map((e, idx) => <TimelineEvent key={`${g.key}-${idx}`} event={e} />)}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineEvent({ event }) {
  const cfg = eventConfig(event);
  const Icon = cfg.icon;
  const d = new Date(event.sortKey);
  const dateStr = d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
  const timeStr = event.type === 'cita' && event.data.hora ? event.data.hora : null;

  return (
    <li className="ml-6 relative">
      <span className={`absolute -left-[34px] top-2 flex items-center justify-center w-7 h-7 rounded-full ring-4 ring-slate-50 ${cfg.dot}`}>
        <Icon size={13} className="text-white" strokeWidth={2.5} />
      </span>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 flex-wrap">
              <span className={cfg.badgeText}>{cfg.badge}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 normal-case">{dateStr}{timeStr && ` · ${timeStr}`}</span>
            </div>
            <div className="font-medium text-slate-900 mt-1 capitalize">{event.title}</div>
          </div>
          <TimelineExtras event={event} />
        </div>
        <TimelineBody event={event} />
      </div>
    </li>
  );
}

function eventConfig(event) {
  switch (event.type) {
    case 'consulta':
      return { icon: FileText, dot: 'bg-brand-600', badge: 'Consulta', badgeText: 'text-brand-700' };
    case 'procedimiento':
      return { icon: Activity, dot: 'bg-violet-600', badge: 'Procedimiento', badgeText: 'text-violet-700' };
    case 'medicacion-inicio':
      return {
        icon: Pill,
        dot: event.data.es_opioide ? 'bg-amber-600' : 'bg-emerald-600',
        badge: event.data.es_opioide ? 'Opioide prescrito' : 'Prescripcion iniciada',
        badgeText: event.data.es_opioide ? 'text-amber-700' : 'text-emerald-700',
      };
    case 'medicacion-fin':
      return { icon: Pill, dot: 'bg-slate-400', badge: 'Prescripcion suspendida', badgeText: 'text-slate-500' };
    case 'titulacion':
      return { icon: Pill, dot: 'bg-sky-600', badge: 'Titulación', badgeText: 'text-sky-700' };
    case 'cita': {
      const label = event.tipo === 'followup' ? 'Seguimiento' : event.tipo === 'walkin' ? 'Sin cita' : 'Cita';
      return { icon: CalIcon, dot: 'bg-slate-500', badge: label, badgeText: 'text-slate-600' };
    }
    default:
      return { icon: Clock, dot: 'bg-slate-400', badge: 'Evento', badgeText: 'text-slate-500' };
  }
}

function TimelineExtras({ event }) {
  if (event.type === 'consulta' && event.data.eva !== null && event.data.eva !== undefined) {
    return <EvaBadge value={event.data.eva} />;
  }
  if (event.type === 'cita') {
    return <StatusBadge estado={event.data.estado} />;
  }
  return null;
}

function TimelineBody({ event }) {
  const d = event.data;
  switch (event.type) {
    case 'consulta':
      return (
        <div className="mt-2 text-sm space-y-1">
          {d.diagnostico && <div className="text-slate-700"><span className="font-medium">Dx:</span> {d.diagnostico}</div>}
          {d.plan && <div className="text-slate-500 whitespace-pre-wrap line-clamp-3">{d.plan}</div>}
          <Link to={`/print/receta/${d.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
            <Printer size={12} /> Indicaciones PDF
          </Link>
        </div>
      );
    case 'procedimiento': {
      const hasPrePost = d.eva_pre != null || d.eva_post != null;
      const delta = (d.eva_pre != null && d.eva_post != null) ? d.eva_pre - d.eva_post : null;
      return (
        <div className="mt-2 text-sm space-y-0.5 text-slate-600">
          {hasPrePost && (
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {d.eva_pre != null && <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">EVA pre {d.eva_pre}</span>}
              {d.eva_post != null && <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">EVA post {d.eva_post}</span>}
              {delta != null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${delta > 0 ? 'bg-emerald-100 text-emerald-800' : delta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                  {delta > 0 ? `↓ ${delta}` : delta < 0 ? `↑ ${Math.abs(delta)}` : '= 0'}
                </span>
              )}
            </div>
          )}
          {d.zona && <div>Zona: {d.zona}</div>}
          {(d.farmaco || d.dosis) && <div>{d.farmaco} {d.dosis && `· ${d.dosis}`}</div>}
          {d.guiado_por && <div className="capitalize">Guía: {d.guiado_por}</div>}
          {formatPreVitals(d) && <div><span className="font-medium">Signos vitales pre:</span> {formatPreVitals(d)}</div>}
          {d.resultado && <div className="text-slate-700">Resultado: {d.resultado}</div>}
          {d.complicaciones && (
            <div className="text-red-700 flex items-center gap-1">
              <AlertCircle size={12} /> {d.complicaciones}
            </div>
          )}
        </div>
      );
    }
    case 'titulacion':
      return (
        <div className="mt-1 text-sm text-slate-600">
          <span className="font-medium">{d.dosis}</span>
          {d.frecuencia && ` · ${d.frecuencia}`}
          {d.via && ` · ${d.via}`}
          {d.motivo_cambio && <span className="text-xs text-slate-500 ml-2">({d.motivo_cambio})</span>}
        </div>
      );
    case 'medicacion-inicio':
      return d.notas ? <div className="mt-1 text-sm text-slate-500">{d.notas}</div> : null;
    default:
      return null;
  }
}

/* --------------------------- TABS EXISTENTES --------------------------- */

function InfoTab({ patient, patientId }) {
  const [extra, setExtra] = useState({ historia: null, medications: [], consultations: [] });

  useEffect(() => {
    Promise.all([
      api.get(`/historias/patient/${patientId}`).catch(() => ({ historia: null })),
      api.get(`/medications/patient/${patientId}`).catch(() => ({ medications: [] })),
      api.get(`/consultations/patient/${patientId}`).catch(() => ({ consultations: [] })),
    ]).then(([h, m, c]) => setExtra({
      historia: h.historia,
      medications: m.medications || [],
      consultations: c.consultations || [],
    }));
  }, [patientId]);

  const { historia, medications, consultations } = extra;
  const activeMeds = medications.filter(m => m.activo);
  const opioids = activeMeds.filter(m => m.es_opioide);
  const lastConsult = consultations[0];
  const alergias = historia?.alergicos || patient.antecedentes_alergicos;
  const hasAlertas = alergias || opioids.length > 0;

  function edad() {
    if (!patient.fecha_nacimiento) return '—';
    const h = new Date(), n = new Date(patient.fecha_nacimiento);
    let e = h.getFullYear() - n.getFullYear();
    const m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
    return e + ' años';
  }

  return (
    <div className="space-y-4">
      {hasAlertas && (
        <div className="bg-rose-50 border-l-4 border-rose-500 rounded-lg p-4">
          <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-2">
            <AlertCircle size={14} /> Alertas importantes
          </h3>
          <div className="space-y-1 text-sm">
            {alergias && (
              <div><span className="font-semibold text-rose-900">Alergias:</span> <span className="text-rose-800 whitespace-pre-wrap">{alergias}</span></div>
            )}
            {opioids.length > 0 && (
              <div><span className="font-semibold text-rose-900">Opioide activo:</span> <span className="text-rose-800">{opioids.map(m => m.farmaco).join(', ')}</span></div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Datos personales">
          <Row label="Nombres">{patient.nombre}{patient.apodo ? <span className="text-slate-500"> ({patient.apodo})</span> : null}</Row>
          <Row label="Apellidos">{patient.apellido}</Row>
          <Row label="Cédula">{patient.cedula || '—'}</Row>
          <Row label="Nacionalidad">{patient.nacionalidad || '—'}</Row>
          <Row label="F. nacimiento">{patient.fecha_nacimiento || '—'}</Row>
          <Row label="Edad">{edad()}</Row>
          <Row label="Sexo">{patient.genero || '—'}{patient.identidad_genero ? ` / ${patient.identidad_genero}` : ''}</Row>
          <Row label="Estado civil">{patient.estado_civil || '—'}</Row>
          <Row label="# hijos">{patient.numero_hijos ?? '—'}</Row>
          <Row label="Lugar de origen">{patient.lugar_origen || '—'}</Row>
          <Row label="Tipo de sangre">{patient.tipo_sangre
            ? <span className="inline-block bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-xs font-semibold">{patient.tipo_sangre}</span>
            : '—'}
          </Row>
          <Row label="Escolaridad">{patient.escolaridad || '—'}</Row>
          <Row label="Ocupación">{patient.ocupacion || '—'}</Row>
          {patient.profesiones_anteriores && <Row label="Prof. anteriores" block>{patient.profesiones_anteriores}</Row>}
        </InfoCard>

        <div className="space-y-4">
          <InfoCard title="Contacto">
            <Row label="Celular">{patient.telefono || '—'}</Row>
            {patient.telefono_2 && <Row label="Teléfono 1">{patient.telefono_2}</Row>}
            {patient.telefono_otro && <Row label="Teléfono 2">{patient.telefono_otro}</Row>}
            <Row label="Email">{patient.email || '—'}</Row>
            <Row label="Dirección" block>{patient.direccion || '—'}</Row>
          </InfoCard>

          {(patient.referente_nombre || patient.referente_telefono || patient.referente_direccion) && (
            <InfoCard title="Persona que lo refirió">
              <Row label="Nombre">{patient.referente_nombre || '—'}</Row>
              <Row label="Teléfono">{patient.referente_telefono || '—'}</Row>
              {patient.referente_direccion && <Row label="Dirección" block>{patient.referente_direccion}</Row>}
            </InfoCard>
          )}

          <InfoCard title="Contacto de emergencia">
            <Row label="Nombre">{patient.contacto_emergencia_nombre || '—'}</Row>
            <Row label="Teléfono">{patient.contacto_emergencia_telefono || '—'}</Row>
          </InfoCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Resumen clínico">
          <Row label="Alergias" block>
            {alergias || <span className="text-slate-400 italic">Sin alergias conocidas</span>}
          </Row>
          {historia?.diagnosticos_anteriores && (
            <Row label="Dx anteriores" block>{historia.diagnosticos_anteriores}</Row>
          )}
          {historia?.traumatismos && (
            <Row label="Traumatismos" block>{historia.traumatismos}</Row>
          )}
          {(historia?.cirugias || patient.antecedentes_quirurgicos) && (
            <Row label="Cirugías" block>{historia?.cirugias || patient.antecedentes_quirurgicos}</Row>
          )}
          {patient.antecedentes_personales && (
            <Row label="Ant. personales" block>{patient.antecedentes_personales}</Row>
          )}
          {patient.antecedentes_familiares && (
            <Row label="Ant. familiares" block>{patient.antecedentes_familiares}</Row>
          )}
        </InfoCard>

        <div className="space-y-4">
          <InfoCard title={`Prescripcion activa (${activeMeds.length})`}>
            {activeMeds.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Sin prescripcion activa.</p>
            ) : (
              <ul className="space-y-2">
                {activeMeds.map(m => (
                  <li key={m.id} className="text-sm">
                    <div className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                      {m.farmaco}
                      {m.es_opioide && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Opioide</span>}
                    </div>
                    {m.ultima_titulacion && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {m.ultima_titulacion.dosis}
                        {m.ultima_titulacion.frecuencia && ` · ${m.ultima_titulacion.frecuencia}`}
                        {m.ultima_titulacion.via && ` · ${m.ultima_titulacion.via}`}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>

          <InfoCard title="Última consulta">
            {lastConsult ? (
              <div className="space-y-2">
                <Row label="Fecha">{new Date(lastConsult.date).toLocaleDateString('es-DO')}</Row>
                {lastConsult.motivo_consulta && <Row label="Motivo" block>{lastConsult.motivo_consulta}</Row>}
                {lastConsult.diagnostico && <Row label="Diagnóstico" block>{lastConsult.diagnostico}</Row>}
                {lastConsult.eva !== null && lastConsult.eva !== undefined && (
                  <Row label="EVA"><EvaBadge value={lastConsult.eva} /></Row>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Sin consultas registradas.</p>
            )}
          </InfoCard>
        </div>
      </div>

      {patient.notas && (
        <InfoCard title="Notas generales">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{patient.notas}</p>
        </InfoCard>
      )}
    </div>
  );
}

function ConsultasTab({ patientId, canWrite }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get(`/consultations/patient/${patientId}`).then(d => setItems(d.consultations));
  }, [patientId]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Historial de consultas</h2>
        {canWrite && (
          <Link to={`/pacientes/${patientId}/consulta/nueva`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">
            <Plus size={16} /> Nueva consulta
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={FileText} text="Sin consultas registradas." />
      ) : (
        <ul className="space-y-2">
          {items.map(c => (
            <li key={c.id} className="bg-white border border-slate-200 rounded-xl shadow-card hover:shadow-card-hover hover:border-slate-300 transition flex justify-between items-stretch gap-0 overflow-hidden">
              <Link to={`/pacientes/${patientId}/consulta/${c.id}`} className="flex-1 p-4 min-w-0 hover:bg-slate-50 transition">
                <div className="text-xs text-slate-500">{new Date(c.date).toLocaleString('es-DO')}</div>
                <div className="font-medium mt-1 text-slate-900 truncate">{c.motivo_consulta || 'Consulta'}</div>
                {c.diagnostico && <div className="text-sm text-slate-600 mt-1">Dx: {c.diagnostico}</div>}
              </Link>
              <div className="flex items-center gap-3 shrink-0 p-4 border-l border-slate-100">
                {c.eva !== null && c.eva !== undefined && <EvaBadge value={c.eva} />}
                <Link to={`/print/receta/${c.id}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                  <Printer size={14} /> Indicaciones
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProcedimientosTab({ patientId, canWrite }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProcedure());
  const [latestEva, setLatestEva] = useState(null);
  const [evaPostFor, setEvaPostFor] = useState(null);
  const [evaPostValue, setEvaPostValue] = useState('');

  async function load() {
    const d = await api.get(`/procedures/patient/${patientId}`);
    setItems(d.procedures);
  }
  useEffect(() => {
    load();
    api.get(`/consultations/patient/${patientId}`).then(d => {
      const withEva = d.consultations.filter(c => c.eva != null);
      setLatestEva(withEva.length ? withEva[0].eva : null);
    });
  }, [patientId]);

  function openForm() {
    setForm({ ...emptyProcedure(), eva_pre: latestEva != null ? String(latestEva) : '' });
    setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault();
    const payload = { ...form, patient_id: Number(patientId) };
    payload.followup_days = payload.followup_days ? Number(payload.followup_days) : null;
    payload.eva_pre = payload.eva_pre !== '' ? Number(payload.eva_pre) : null;
    for (const key of [
      'pre_tension_arterial',
      'pre_frecuencia_cardiaca',
      'pre_frecuencia_respiratoria',
      'pre_saturacion_o2',
      'pre_temperatura',
      'pre_glucemia',
    ]) {
      payload[key] = payload[key] || null;
    }
    await api.post('/procedures', payload);
    setShowForm(false);
    setForm(emptyProcedure());
    load();
  }

  async function saveEvaPost(e, procId) {
    e.preventDefault();
    if (evaPostValue === '') return;
    await api.patch(`/procedures/${procId}`, { eva_post: Number(evaPostValue) });
    setEvaPostFor(null);
    setEvaPostValue('');
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Procedimientos intervencionistas</h2>
        {canWrite && (
          <button onClick={openForm} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">
            <Plus size={16} /> Nuevo procedimiento
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-5 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-card animate-fade-in">
          <Field label="Tipo *"><select required className={inputCls} value={form.tipo} onChange={e=>setForm({...form, tipo:e.target.value})}>
            <option value="bloqueo">Bloqueo</option>
            <option value="infiltracion">Infiltración</option>
            <option value="neuromodulacion">Neuromodulación</option>
          </select></Field>
          <Field label="Subtipo / descripción"><input className={inputCls} value={form.subtipo} onChange={e=>setForm({...form, subtipo:e.target.value})} placeholder="ej: bloqueo epidural lumbar" /></Field>
          <Field label="Zona"><input className={inputCls} value={form.zona} onChange={e=>setForm({...form, zona:e.target.value})} /></Field>
          <Field label="Guiado por"><select className={inputCls} value={form.guiado_por} onChange={e=>setForm({...form, guiado_por:e.target.value})}>
            <option value="">—</option>
            <option value="ecografia">Ecografía</option>
            <option value="fluoroscopia">Fluoroscopia</option>
            <option value="ninguno">Ninguno</option>
          </select></Field>
          <Field label="Fármaco"><input className={inputCls} value={form.farmaco} onChange={e=>setForm({...form, farmaco:e.target.value})} /></Field>
          <Field label="Dosis"><input className={inputCls} value={form.dosis} onChange={e=>setForm({...form, dosis:e.target.value})} /></Field>
          <Field full label="Técnica"><input className={inputCls} value={form.tecnica} onChange={e=>setForm({...form, tecnica:e.target.value})} /></Field>
          <Field full label="Complicaciones"><input className={inputCls} value={form.complicaciones} onChange={e=>setForm({...form, complicaciones:e.target.value})} /></Field>
          <Field full label="Resultado"><input className={inputCls} value={form.resultado} onChange={e=>setForm({...form, resultado:e.target.value})} /></Field>
          <Field label="Días hasta seguimiento"><input type="number" min="0" className={inputCls} value={form.followup_days} onChange={e=>setForm({...form, followup_days:e.target.value})} placeholder="ej: 14" /></Field>
          <Field label="EVA antes del procedimiento (0-10)">
            <input type="number" min="0" max="10" className={inputCls} value={form.eva_pre} onChange={e=>setForm({...form, eva_pre:e.target.value})} placeholder={latestEva != null ? `Última consulta: ${latestEva}` : '0-10'} />
          </Field>
          <div className="md:col-span-2 border-t border-slate-100 pt-3 mt-1">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Signos vitales pre-procedimiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="TA"><input className={inputCls} value={form.pre_tension_arterial} onChange={e=>setForm({...form, pre_tension_arterial:e.target.value})} placeholder="120/80" /></Field>
              <Field label="FC"><input className={inputCls} value={form.pre_frecuencia_cardiaca} onChange={e=>setForm({...form, pre_frecuencia_cardiaca:e.target.value})} placeholder="72 lpm" /></Field>
              <Field label="FR"><input className={inputCls} value={form.pre_frecuencia_respiratoria} onChange={e=>setForm({...form, pre_frecuencia_respiratoria:e.target.value})} placeholder="16 rpm" /></Field>
              <Field label="SpO2"><input className={inputCls} value={form.pre_saturacion_o2} onChange={e=>setForm({...form, pre_saturacion_o2:e.target.value})} placeholder="98%" /></Field>
              <Field label="Temp."><input className={inputCls} value={form.pre_temperatura} onChange={e=>setForm({...form, pre_temperatura:e.target.value})} placeholder="36.5 C" /></Field>
              <Field label="Glucemia"><input className={inputCls} value={form.pre_glucemia} onChange={e=>setForm({...form, pre_glucemia:e.target.value})} placeholder="mg/dL" /></Field>
            </div>
          </div>
          <Field full label="Notas"><textarea rows={2} className={inputCls} value={form.notas} onChange={e=>setForm({...form, notas:e.target.value})} /></Field>
          <div className="md:col-span-2 flex gap-2 pt-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">Cancelar</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState icon={Activity} text="Sin procedimientos registrados." />
      ) : (
        <ul className="space-y-2">
          {items.map(p => {
            const delta = (p.eva_pre != null && p.eva_post != null) ? p.eva_pre - p.eva_post : null;
            return (
              <li key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500">{new Date(p.fecha).toLocaleString('es-DO')}</div>
                    <div className="font-medium mt-1 capitalize text-slate-900">
                      {p.tipo}{p.subtipo ? ' · ' + p.subtipo : ''}
                    </div>

                    {(p.eva_pre != null || p.eva_post != null) && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {p.eva_pre != null && <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">EVA pre {p.eva_pre}</span>}
                        {p.eva_post != null && <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">EVA post {p.eva_post}</span>}
                        {delta != null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${delta > 0 ? 'bg-emerald-100 text-emerald-800' : delta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                            {delta > 0 ? `↓ ${delta} puntos` : delta < 0 ? `↑ ${Math.abs(delta)} puntos` : 'sin cambio'}
                          </span>
                        )}
                      </div>
                    )}

                    {p.zona && <div className="text-sm text-slate-600 mt-1">Zona: {p.zona}</div>}
                    {(p.farmaco || p.dosis) && <div className="text-sm text-slate-600">{p.farmaco} {p.dosis && `· ${p.dosis}`}</div>}
                    {p.guiado_por && <div className="text-sm text-slate-600 capitalize">Guía: {p.guiado_por}</div>}
                    {formatPreVitals(p) && (
                      <div className="text-xs text-slate-600 mt-2 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                        <span className="font-semibold">Signos vitales pre:</span> {formatPreVitals(p)}
                      </div>
                    )}
                    {p.resultado && <div className="text-sm text-slate-700 mt-1">Resultado: {p.resultado}</div>}
                    {p.complicaciones && (
                      <div className="text-sm text-red-700 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} /> Complicaciones: {p.complicaciones}
                      </div>
                    )}
                    {p.notas && <div className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{p.notas}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {p.followup_days > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full whitespace-nowrap">
                        seguimiento {p.followup_days}d
                      </span>
                    )}
                    {canWrite && p.eva_post == null && (
                      <button
                        onClick={() => { setEvaPostFor(p.id); setEvaPostValue(''); }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap"
                      >
                        + Registrar EVA post
                      </button>
                    )}
                  </div>
                </div>

                {evaPostFor === p.id && (
                  <form onSubmit={e => saveEvaPost(e, p.id)} className="mt-3 p-3 bg-slate-50 rounded-lg flex gap-2 items-end animate-fade-in">
                    <label className="flex-1">
                      <span className="text-xs font-medium text-slate-600 mb-1 block">EVA post-procedimiento (0-10)</span>
                      <input type="number" min="0" max="10" required autoFocus className={inputCls} value={evaPostValue} onChange={e=>setEvaPostValue(e.target.value)} />
                    </label>
                    <button type="submit" className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Guardar</button>
                    <button type="button" onClick={() => setEvaPostFor(null)} className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-medium">Cancelar</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MedicacionTab({ patientId, canWrite }) {
  const [meds, setMeds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMed());
  const [addTitrTo, setAddTitrTo] = useState(null);
  const [titrForm, setTitrForm] = useState({ dosis: '', frecuencia: '', via: '', motivo_cambio: '' });
  const [selectedIds, setSelectedIds] = useState([]);

  async function load() {
    const d = await api.get(`/medications/patient/${patientId}`);
    setMeds(d.medications);
    setSelectedIds(current => current.filter(id => d.medications.some(m => m.id === id)));
  }
  useEffect(() => { load(); }, [patientId]);

  async function submit(e) {
    e.preventDefault();
    await api.post('/medications', { ...form, patient_id: Number(patientId) });
    setForm(emptyMed());
    setShowForm(false);
    load();
  }

  async function addTitration(e) {
    e.preventDefault();
    await api.post(`/medications/${addTitrTo}/titrations`, titrForm);
    setAddTitrTo(null);
    setTitrForm({ dosis: '', frecuencia: '', via: '', motivo_cambio: '' });
    load();
  }

  async function toggleActive(med) {
    await api.put(`/medications/${med.id}`, { activo: !med.activo });
    load();
  }

  function toggleSelected(id) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  const printIds = selectedIds.length ? selectedIds : meds.filter(m => m.activo).map(m => m.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Prescripcion y titulacion</h2>
        <div className="flex gap-2 flex-wrap justify-end">
          {meds.length > 0 && (
            <Link
              to={`/print/prescripcion/${printIds.join(',')}`}
              target="_blank"
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                printIds.length ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 text-slate-400 pointer-events-none'
              }`}
            >
              <Printer size={16} /> Receta {selectedIds.length ? 'seleccionada' : 'activa'}
            </Link>
          )}
          {canWrite && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">
              <Plus size={16} /> Nueva prescripcion
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-5 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-card animate-fade-in">
          <Field label="Farmaco *"><input required className={inputCls} value={form.farmaco} onChange={e=>setForm({...form, farmaco:e.target.value})} /></Field>
          <Field label="Es opioide">
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input type="checkbox" className="accent-brand-600" checked={form.es_opioide} onChange={e=>setForm({...form, es_opioide:e.target.checked})} />
              Marcar como opioide
            </label>
          </Field>
          <Field label="Dosis inicial"><input className={inputCls} value={form.dosis_inicial} onChange={e=>setForm({...form, dosis_inicial:e.target.value})} placeholder="ej: 10 mg" /></Field>
          <Field label="Frecuencia"><input className={inputCls} value={form.frecuencia_inicial} onChange={e=>setForm({...form, frecuencia_inicial:e.target.value})} placeholder="ej: c/8h" /></Field>
          <Field label="Via"><input className={inputCls} value={form.via_inicial} onChange={e=>setForm({...form, via_inicial:e.target.value})} placeholder="ej: oral" /></Field>
          <Field full label="Notas"><textarea rows={2} className={inputCls} value={form.notas} onChange={e=>setForm({...form, notas:e.target.value})} /></Field>
          <div className="md:col-span-2 flex gap-2 pt-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">Cancelar</button>
          </div>
        </form>
      )}

      {meds.length === 0 ? (
        <EmptyState icon={Pill} text="Sin prescripciones registradas." />
      ) : (
        <ul className="space-y-3">
          {meds.map(m => (
            <li key={m.id} className={`bg-white border rounded-xl p-4 shadow-card ${m.activo ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
              <div className="flex justify-between items-start gap-3">
                <label className="pt-1 shrink-0">
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleSelected(m.id)}
                    aria-label={`Seleccionar ${m.farmaco} para receta`}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                    {m.farmaco}
                    {m.es_opioide && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        <AlertCircle size={11} /> Opioide
                      </span>
                    )}
                    {!m.activo && <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">Suspendido</span>}
                  </div>
                  {m.ultima_titulacion && (
                    <div className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">{m.ultima_titulacion.dosis}</span>
                      {m.ultima_titulacion.frecuencia && ` · ${m.ultima_titulacion.frecuencia}`}
                      {m.ultima_titulacion.via && ` · ${m.ultima_titulacion.via}`}
                      <span className="text-slate-400 ml-2 text-xs">desde {m.ultima_titulacion.fecha}</span>
                    </div>
                  )}
                  {m.notas && <div className="text-sm text-slate-500 mt-1">{m.notas}</div>}
                </div>
                <div className="flex gap-3 text-sm shrink-0">
                  <Link to={`/print/prescripcion/${m.id}`} target="_blank" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium">
                    <Printer size={14} /> Receta
                  </Link>
                  {canWrite && (
                    <>
                      <button onClick={() => setAddTitrTo(addTitrTo === m.id ? null : m.id)} className="text-brand-600 hover:text-brand-700 font-medium">+ Titulacion</button>
                      <button onClick={() => toggleActive(m)} className="text-slate-500 hover:text-slate-900">
                        {m.activo ? 'Suspender' : 'Reactivar'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {addTitrTo === m.id && (
                <form onSubmit={addTitration} className="mt-3 p-3 bg-slate-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-2 animate-fade-in">
                  <input required placeholder="Nueva dosis" className={inputCls} value={titrForm.dosis} onChange={e=>setTitrForm({...titrForm, dosis:e.target.value})} />
                  <input placeholder="Frecuencia" className={inputCls} value={titrForm.frecuencia} onChange={e=>setTitrForm({...titrForm, frecuencia:e.target.value})} />
                  <input placeholder="Via" className={inputCls} value={titrForm.via} onChange={e=>setTitrForm({...titrForm, via:e.target.value})} />
                  <input placeholder="Motivo de cambio" className={inputCls} value={titrForm.motivo_cambio} onChange={e=>setTitrForm({...titrForm, motivo_cambio:e.target.value})} />
                  <div className="col-span-2 md:col-span-4 flex gap-2">
                    <button type="submit" className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm">Agregar</button>
                    <button type="button" onClick={() => setAddTitrTo(null)} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm">Cancelar</button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AgendaTab({ patient }) {
  const [appts, setAppts] = useState([]);
  useEffect(() => {
    const desde = new Date(); desde.setMonth(desde.getMonth() - 6);
    const hasta = new Date(); hasta.setMonth(hasta.getMonth() + 3);
    api.get(`/appointments?desde=${desde.toISOString().slice(0,10)}&hasta=${hasta.toISOString().slice(0,10)}`)
      .then(d => setAppts(d.appointments.filter(a => a.patient_id === patient.id)));
  }, [patient.id]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Agenda del paciente</h2>
      {appts.length === 0 ? (
        <EmptyState icon={CalIcon} text="Sin citas registradas." />
      ) : (
        <ul className="space-y-2">
          {appts.map(a => (
            <li key={a.id} className="bg-white border border-slate-200 rounded-xl p-3 text-sm flex justify-between items-center shadow-card">
              <div>
                <span className="font-medium text-slate-900">{a.fecha}</span>
                {a.hora && <span className="text-slate-500 ml-2 font-mono">{a.hora}</span>}
                <span className="ml-3 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a.tipo === 'walkin' ? 'Sin cita' : a.tipo === 'followup' ? 'Seguimiento' : 'Cita'}</span>
                {a.motivo && <span className="text-slate-500 ml-2">· {a.motivo}</span>}
              </div>
              <StatusBadge estado={a.estado} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoriaClinicaTab({ patientId, canWrite }) {
  const [historia, setHistoria] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/historias/patient/${patientId}`)
      .then(d => setHistoria(d.historia))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <p className="text-slate-500">Cargando...</p>;

  if (!historia) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-card">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <ClipboardList size={24} className="text-slate-400" />
        </div>
        <p className="text-slate-700 font-medium">Este paciente aún no tiene historia clínica formal.</p>
        <p className="text-slate-500 text-sm mt-1 mb-5">Documento completo de la Unidad del Dolor: anamnesis, antecedentes, examen físico, neurológico.</p>
        {canWrite && (
          <Link to={`/pacientes/${patientId}/historia-clinica`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">
            <Plus size={16} /> Crear historia clínica
          </Link>
        )}
      </div>
    );
  }

  let tono = {}, reflejos = {};
  if (historia.tono_muscular) { try { tono = JSON.parse(historia.tono_muscular); } catch {} }
  if (historia.reflejos) { try { reflejos = JSON.parse(historia.reflejos); } catch {} }
  const hasData = hasHistoriaClinicaData(historia, tono, reflejos);

  return (
    <div>
      <div className="flex justify-between items-start gap-3 flex-wrap mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Historia Clínica — Unidad del Dolor</h2>
          <p className="text-sm text-slate-500 mt-0.5">Registrada el {historia.fecha}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canWrite && (
            <Link to={`/pacientes/${patientId}/historia-clinica`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">
              <Pencil size={14} /> Editar
            </Link>
          )}
          <Link to={`/print/historia-clinica/${patientId}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
            <Printer size={14} /> Imprimir
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {!hasData && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-amber-900">Historia creada sin datos registrados</h3>
            <p className="text-sm text-amber-800 mt-1">
              Esta historia clinica existe, pero todavia no tiene campos clinicos completados. Usa Editar para llenarla.
            </p>
          </div>
        )}
        <HCView title="Consulta — Anamnesis del dolor" data={historia} fields={[
          ['motivo_consulta', 'Motivo de consulta'],
          ['inicio_desarrollo', 'Inicio y desarrollo'],
          ['distribucion_espacial', 'Distribución espacial'],
          ['aspectos_cualitativos_cuantitativos', 'Aspectos cualitativos y cuantitativos'],
          ['evolucion_temporal', 'Evolución temporal'],
          ['factores_provocativos', 'Factores provocativos'],
          ['factores_paliativos', 'Factores paliativos'],
          ['tratamiento_actual', 'Tratamiento actual'],
          ['efectos_socio_familiares', 'Efectos socio-familiares'],
        ]} />

        <HCView title="Antecedentes Personales Patológicos" data={historia} fields={[
          ['diagnosticos_anteriores', 'Diagnósticos anteriores'],
          ['factores_geneticos_congenitos', 'Factores genéticos y/o congénitos'],
          ['factores_nutricionales', 'Factores nutricionales'],
          ['exposicion_toxicos', 'Exposición a tóxicos'],
          ['traumatismos', 'Traumatismos'],
          ['cirugias', 'Cirugías'],
          ['transfusiones', 'Transfusiones'],
          ['alergicos', 'Alérgicos'],
          ['anestesicos', 'Anestésicos'],
          ['ets_its', 'ETS/ITS'],
          ['inmunizaciones', 'Inmunizaciones'],
          ['psiquiatricos', 'Psiquiátricos'],
          ['habitos_toxicos', 'Hábitos tóxicos'],
        ]} />

        <HCView title="Antecedentes No Patológicos, Sociales y Familiares" data={historia} fields={[
          ['estado_salud_previo', 'Estado de salud antes de la sintomatología'],
          ['descripcion_entorno', 'Entorno del paciente'],
          ['familiares_problematica', 'Familiares con la misma problemática'],
          ['incidencia_familiares', '¿Inciden los familiares?'],
          ['otros_antecedentes_familiares', 'Otros antecedentes a destacar'],
        ]} />

        <HCView title="Revisión por Sistemas" data={historia} fields={[
          ['tension_arterial', 'Tensión arterial'],
          ['frecuencia_cardiaca', 'Frecuencia cardíaca'],
          ['saturacion_o2', 'Saturación O₂'],
          ['auscultacion_pulmones', 'Respiratorio — Auscultación pulmones'],
          ['auscultacion_corazon', 'Cardiovascular — Auscultación del corazón'],
          ['juicio_percepcion', 'Psiquiátrico — Juicio de percepción'],
        ]} />

        <HCView title="Sistema Músculo Esquelético" data={historia} fields={[
          ['inspeccion_dedos_unas', 'Inspección de dedos y uñas'],
          ['examen_articulaciones', 'Examen articulaciones/huesos/músculos'],
          ['marcha_movimientos', 'Marcha — movimientos'],
          ['columna_cervical', 'Columna cervical'],
          ['columna_toracolumbar', 'Columna toracolumbar'],
          ['columna_rotacion', 'Rotación'],
          ['hombros', 'Hombros'],
          ['codos', 'Codos'],
          ['munecas_movimiento', 'Muñecas — Movimiento 130-0-130°'],
          ['munecas_palmas_dorsos', 'Muñecas — Palmas y dorsos juntas'],
          ['prueba_phalen', 'Prueba de Phalen'],
          ['pronacion_supinacion', 'Pronación y supinación'],
          ['dedos_abrir_cerrar', 'Dedos — Abrir y cerrar puños'],
          ['dedos_tocar_primer', 'Dedos — Tocar primer dedo'],
          ['miembros_inferiores', 'Miembros inferiores'],
        ]} />

        <HCView title="Sensibilidad" data={historia} fields={[
          ['deficit_trastorno', 'Déficit o trastorno'],
          ['sensacion_propioceptiva', 'Sensación propioceptiva'],
          ['sensibilidad_presion', 'Sensibilidad a la presión'],
          ['sensibilidad_combinada', 'Combinada (cortical)'],
        ]} />

        <TablaDIView title="Tono Muscular" subtitle="Escala 0-5: Cero / Indicios / Pobre / Aceptable / Buena / Fisiológica" data={tono} filas={[
          ['brazo', 'Brazo'], ['antebrazo', 'Antebrazo'], ['mano', 'Mano'],
          ['pierna', 'Pierna'], ['muslo', 'Muslo'], ['pie', 'Pie'],
        ]} />

        <TablaDIView title="Reflejos" subtitle="Escala 0-4: Ausente / Vestigial / Fisiológico / Exaltado / Espástico" data={reflejos} filas={[
          ['biceps_c5', 'Bíceps C5'], ['braquio_radial_c6', 'Braquio radial C6'],
          ['triceps_c7', 'Tríceps C7'], ['flexores_c8', 'Flexores seclos C8'],
          ['cuadriceps_l2_4', 'Cuádriceps L2, L3, L4'],
          ['triceps_sural', 'Tríceps Sural L5, L1, S2'],
          ['aquileo', 'Aquíleo'], ['corneal', 'Corneal V, VII'],
          ['nauseoso', 'Nauseoso IX, X'], ['abd_sup', 'Abd Sup T8-T10'],
          ['cremasterico', 'Cremastérico L1, L5'],
          ['anal', 'Anal S3, S4, S5'],
          ['babinski', 'Babinski'], ['chaddock', 'Chaddock'], ['oppenheim', 'Oppenheim'],
        ]} />

        <HCView title="Nervios Craneales" data={historia} fields={[
          ['nc1_olfatorio', 'I. Olfatorio'],
          ['nc2_optico', 'II. Óptico'],
          ['nc3_5_oculomotor', 'III-IV-VI. Oculomotor, Troclear, MOE'],
          ['nc5_trigemino', 'V. Trigémino'],
          ['nc7_facial', 'VII. Facial'],
          ['nc8_auditivo', 'VIII. Auditivo'],
          ['nc9_glosofaringeo', 'IX. Glosofaríngeo'],
          ['nc10_vago', 'X. Vago'],
          ['nc11_accesorio', 'XI. Accesorio'],
          ['nc12_hipogloso', 'XII. Hipogloso'],
        ]} />

        {historia.notas_evaluacion && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notas de evaluación</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{historia.notas_evaluacion}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HCView({ title, data, fields }) {
  const filled = fields.filter(([k]) => data[k] != null && data[k] !== '');
  if (!filled.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
      <dl className="space-y-2.5">
        {filled.map(([k, label]) => (
          <div key={k}>
            <dt className="text-xs font-medium text-slate-600">{label}</dt>
            <dd className="text-sm text-slate-800 whitespace-pre-wrap mt-0.5">{data[k]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TablaDIView({ title, subtitle, filas, data }) {
  const anyFilled = filas.some(([k]) => data[k] && (data[k].d !== '' || data[k].i !== ''));
  if (!anyFilled) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-500 mb-2">{subtitle}</p>}
      <table className="w-full text-sm mt-2">
        <thead>
          <tr className="text-xs uppercase text-slate-500 tracking-wider border-b border-slate-200">
            <th className="text-left py-2 font-semibold">Zona / Reflejo</th>
            <th className="text-center py-2 font-semibold w-20">Derecha</th>
            <th className="text-center py-2 font-semibold w-20">Izquierda</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map(([k, label]) => (
            <tr key={k}>
              <td className="py-2 text-slate-700">{label}</td>
              <td className="py-2 text-center tabular-nums font-medium">{data[k]?.d !== '' && data[k]?.d !== undefined ? data[k].d : '—'}</td>
              <td className="py-2 text-center tabular-nums font-medium">{data[k]?.i !== '' && data[k]?.i !== undefined ? data[k].i : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hasHistoriaClinicaData(historia, tono, reflejos) {
  const ignored = new Set([
    'id', 'patient_id', 'doctor_id', 'fecha', 'created_at', 'updated_at',
    'tono_muscular', 'reflejos',
  ]);
  const hasText = Object.entries(historia).some(([k, v]) => {
    if (ignored.has(k)) return false;
    return String(v ?? '').trim() !== '';
  });
  const hasTono = Object.values(tono).some(v => v?.d !== '' || v?.i !== '');
  const hasReflejos = Object.values(reflejos).some(v => v?.d !== '' || v?.i !== '');
  return hasText || hasTono || hasReflejos;
}

function CuentaTab({ patientId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/finances/patient/${patientId}`).then(setData);
  }, [patientId]);

  const fmt = n => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!data) return <p className="text-slate-500">Cargando...</p>;
  const { invoices, payments, budgets, summary } = data;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facturado</div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">{fmt(summary.total_facturado)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagado</div>
            <div className="text-2xl font-semibold text-emerald-700 tabular-nums mt-1">{fmt(summary.total_pagado)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Por cobrar</div>
            <div className={`text-2xl font-semibold tabular-nums mt-1 ${summary.deuda > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{fmt(summary.deuda)}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Presupuestos</h2>
        <Link to={`/finanzas/presupuesto/nuevo?patient=${patientId}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">
          <Plus size={16} /> Presupuesto
        </Link>
      </div>
      {budgets.length === 0 ? (
        <p className="text-sm text-slate-500 mb-6">Sin presupuestos.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {budgets.map(b => (
            <li key={b.id}>
              <Link to={`/finanzas/presupuesto/${b.id}`} className="block bg-white border border-slate-200 rounded-xl p-3 shadow-card hover:shadow-card-hover hover:border-slate-300 transition">
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <div className="font-mono text-xs text-slate-500">PRES-{b.fecha.slice(0,4)}-{String(b.id).padStart(5, '0')}</div>
                    <div className="text-sm text-slate-900 mt-0.5">{b.fecha}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-slate-900">{fmt(b.total)}</div>
                    <BudgetEstadoBadge estado={b.estado} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Facturas</h2>
        <Link to={`/finanzas/factura/nueva?patient=${patientId}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">
          <Plus size={16} /> Factura
        </Link>
      </div>
      {invoices.length === 0 ? (
        <p className="text-sm text-slate-500 mb-6">Sin facturas.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {invoices.map(i => (
            <li key={i.id}>
              <Link to={`/finanzas/factura/${i.id}`} className="block bg-white border border-slate-200 rounded-xl p-3 shadow-card hover:shadow-card-hover hover:border-slate-300 transition">
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <div>
                    <div className="font-mono text-xs text-slate-500">FAC-{i.fecha.slice(0,4)}-{String(i.id).padStart(5, '0')}</div>
                    <div className="text-sm text-slate-900 mt-0.5">{i.fecha}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-slate-900">{fmt(i.total)}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 justify-end">
                      Pagado <span className="tabular-nums">{fmt(i.pagado)}</span>
                      <InvoiceEstadoBadge estado={i.estado} />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-lg font-semibold text-slate-900 mb-3">Historial de pagos</h2>
      {payments.length === 0 ? (
        <p className="text-sm text-slate-500">Sin pagos registrados.</p>
      ) : (
        <ul className="space-y-2">
          {payments.map(p => (
            <li key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-card flex justify-between items-center flex-wrap gap-2">
              <div>
                <div className="font-mono text-xs text-slate-500">REC-{p.fecha.slice(0,4)}-{String(p.id).padStart(5, '0')}</div>
                <div className="text-sm text-slate-600 mt-0.5">
                  {p.fecha.slice(0, 10)}
                  {p.metodo && <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{p.metodo}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-emerald-700">{fmt(p.monto)}</span>
                <Link to={`/print/recibo/${p.id}`} target="_blank" className="text-xs text-brand-600 hover:text-brand-700 font-medium">Recibo</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BudgetEstadoBadge({ estado }) {
  const styles = {
    borrador: 'bg-slate-100 text-slate-600',
    aprobado: 'bg-brand-100 text-brand-800',
    facturado: 'bg-emerald-100 text-emerald-800',
    cancelado: 'bg-slate-200 text-slate-600',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize mt-1 inline-block ${styles[estado] || styles.borrador}`}>{estado}</span>;
}

function InvoiceEstadoBadge({ estado }) {
  const styles = {
    pendiente: 'bg-amber-100 text-amber-800',
    parcial: 'bg-sky-100 text-sky-800',
    pagada: 'bg-emerald-100 text-emerald-800',
    anulada: 'bg-slate-200 text-slate-600',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${styles[estado] || styles.pendiente}`}>{estado}</span>;
}

/* --------------------------- HELPERS COMPARTIDOS --------------------------- */

function EvaBadge({ value }) {
  const tone = value <= 3 ? 'bg-emerald-100 text-emerald-800' :
               value <= 6 ? 'bg-amber-100 text-amber-800' :
               'bg-rose-100 text-rose-800';
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${tone}`}>EVA {value}</span>;
}

function StatusBadge({ estado }) {
  const styles = {
    pendiente: 'bg-amber-100 text-amber-800',
    atendida: 'bg-emerald-100 text-emerald-800',
    cancelada: 'bg-slate-100 text-slate-600',
    noshow: 'bg-slate-100 text-slate-600',
  };
  const dots = {
    pendiente: 'bg-amber-500',
    atendida: 'bg-emerald-500',
    cancelada: 'bg-slate-400',
    noshow: 'bg-slate-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wide px-2.5 py-1 rounded-full ${styles[estado] || styles.cancelada}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[estado] || dots.cancelada}`}></span>
      {estado}
    </span>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-card">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Icon size={20} className="text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">{text}</p>
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

function emptyProcedure() {
  return {
    tipo: 'bloqueo',
    subtipo: '',
    zona: '',
    farmaco: '',
    dosis: '',
    tecnica: '',
    guiado_por: '',
    complicaciones: '',
    resultado: '',
    notas: '',
    followup_days: '',
    eva_pre: '',
    pre_tension_arterial: '',
    pre_frecuencia_cardiaca: '',
    pre_frecuencia_respiratoria: '',
    pre_saturacion_o2: '',
    pre_temperatura: '',
    pre_glucemia: '',
  };
}

function formatPreVitals(p) {
  const parts = [
    p.pre_tension_arterial && `TA ${p.pre_tension_arterial}`,
    p.pre_frecuencia_cardiaca && `FC ${p.pre_frecuencia_cardiaca}`,
    p.pre_frecuencia_respiratoria && `FR ${p.pre_frecuencia_respiratoria}`,
    p.pre_saturacion_o2 && `SpO2 ${p.pre_saturacion_o2}`,
    p.pre_temperatura && `Temp ${p.pre_temperatura}`,
    p.pre_glucemia && `Glu ${p.pre_glucemia}`,
  ].filter(Boolean);
  return parts.join(' · ');
}
function emptyMed() {
  return { farmaco: '', es_opioide: false, dosis_inicial: '', frecuencia_inicial: '', via_inicial: '', notas: '' };
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm';

function InfoCard({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ label, children, block }) {
  return block ? (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap">{children}</div>
    </div>
  ) : (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 text-right">{children}</span>
    </div>
  );
}
function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
