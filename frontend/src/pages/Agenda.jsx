import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api.js';
import {
  Plus, Calendar as CalIcon, CalendarCheck, Check, X, UserX,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Helpers — ISO sensible a timezone local (no toISOString, que usa UTC)
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();       // 0=Dom, 1=Lun, ..., 6=Sáb
  const diff = day === 0 ? -6 : 1 - day; // Semana empieza lunes
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d) { return addDays(startOfWeek(d), 6); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

export default function Agenda() {
  const [mode, setMode] = useState('dia'); // 'dia' | 'semana' | 'mes'
  const [cursor, setCursor] = useState(new Date());
  const [appts, setAppts] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: '', tipo: 'cita', fecha: toISO(new Date()), hora: '', motivo: '' });

  const { desde, hasta } = useMemo(() => {
    if (mode === 'dia') return { desde: toISO(cursor), hasta: toISO(cursor) };
    if (mode === 'semana') return { desde: toISO(startOfWeek(cursor)), hasta: toISO(endOfWeek(cursor)) };
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    return { desde: toISO(startOfWeek(first)), hasta: toISO(endOfWeek(last)) };
  }, [mode, cursor]);

  async function load() {
    const d = await api.get(`/appointments?desde=${desde}&hasta=${hasta}`);
    setAppts(d.appointments);
    const f = await api.get('/appointments/followups-pendientes');
    setFollowups(f.followups);
  }
  useEffect(() => { load(); }, [desde, hasta]);
  useEffect(() => { api.get('/patients').then(d => setPatients(d.patients)); }, []);

  async function submit(e) {
    e.preventDefault();
    await api.post('/appointments', { ...form, patient_id: Number(form.patient_id) });
    setForm({ patient_id: '', tipo: 'cita', fecha: toISO(cursor), hora: '', motivo: '' });
    setShowForm(false);
    load();
  }

  async function cambiarEstado(id, estado) {
    await api.put(`/appointments/${id}`, { estado });
    load();
  }

  function goPrev() {
    if (mode === 'dia') setCursor(addDays(cursor, -1));
    else if (mode === 'semana') setCursor(addDays(cursor, -7));
    else setCursor(addMonths(cursor, -1));
  }
  function goNext() {
    if (mode === 'dia') setCursor(addDays(cursor, 1));
    else if (mode === 'semana') setCursor(addDays(cursor, 7));
    else setCursor(addMonths(cursor, 1));
  }
  function goToday() { setCursor(new Date()); }

  function jumpToDay(date) {
    setCursor(date);
    setMode('dia');
  }

  const titulo = useMemo(() => {
    if (mode === 'dia') {
      return cursor.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (mode === 'semana') {
      const ini = startOfWeek(cursor);
      const fin = endOfWeek(cursor);
      if (ini.getMonth() === fin.getMonth()) {
        return `${ini.getDate()} – ${fin.getDate()} ${MESES[ini.getMonth()]} ${ini.getFullYear()}`;
      }
      return `${ini.getDate()} ${MESES[ini.getMonth()]} – ${fin.getDate()} ${MESES[fin.getMonth()]} ${fin.getFullYear()}`;
    }
    return `${MESES[cursor.getMonth()].charAt(0).toUpperCase() + MESES[cursor.getMonth()].slice(1)} ${cursor.getFullYear()}`;
  }, [mode, cursor]);

  function openNewCita(fechaInicial) {
    setForm({ patient_id: '', tipo: 'cita', fecha: fechaInicial || toISO(cursor), hora: '', motivo: '' });
    setShowForm(true);
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-semibold text-slate-900">Agenda</h1>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          <ModeBtn active={mode === 'dia'} onClick={() => setMode('dia')}>Día</ModeBtn>
          <ModeBtn active={mode === 'semana'} onClick={() => setMode('semana')}>Semana</ModeBtn>
          <ModeBtn active={mode === 'mes'} onClick={() => setMode('mes')}>Mes</ModeBtn>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={goPrev} aria-label="Anterior" className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200">
                <ChevronLeft size={16} />
              </button>
              <button onClick={goNext} aria-label="Siguiente" className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200">
                <ChevronRight size={16} />
              </button>
              <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-sm font-medium">
                Hoy
              </button>
              <span className="text-sm font-semibold text-slate-700 capitalize ml-2">{titulo}</span>
            </div>
            <button onClick={() => openNewCita()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm">
              <Plus size={16} /> Nueva cita
            </button>
          </div>

          {showForm && (
            <CitaForm form={form} setForm={setForm} patients={patients} onSubmit={submit} onCancel={() => setShowForm(false)} />
          )}

          {mode === 'dia' && <DayView appts={appts} onEstado={cambiarEstado} />}
          {mode === 'semana' && <WeekView cursor={cursor} appts={appts} onDayClick={jumpToDay} />}
          {mode === 'mes' && <MonthView cursor={cursor} appts={appts} onDayClick={jumpToDay} />}
        </div>

        <div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center gap-2">
              <CalendarCheck size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-slate-700">Seguimientos (7 días)</span>
            </div>
            {followups.length === 0 ? (
              <p className="p-6 text-slate-500 text-sm text-center">Sin seguimientos pendientes.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {followups.map(f => (
                  <li key={f.id} className="p-4 text-sm hover:bg-slate-50">
                    <div className="flex justify-between items-start">
                      <span className="font-medium truncate">{f.paciente_nombre}</span>
                      <span className="text-slate-500 text-xs shrink-0 ml-2">{f.fecha}</span>
                    </div>
                    {f.motivo && <div className="text-slate-500 mt-1 text-xs">{f.motivo}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

function DayView({ appts, onEstado }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {appts.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <CalIcon size={20} className="text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Sin citas programadas para esta fecha.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {appts.map(a => (
            <li key={a.id} className="p-4 flex justify-between items-center gap-3 flex-wrap hover:bg-slate-50 transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-slate-500 font-mono text-sm w-14">{a.hora || '--:--'}</span>
                  <span className="font-medium text-slate-900">{a.paciente_nombre}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tipoLabel(a.tipo)}</span>
                </div>
                {a.motivo && <div className="text-sm text-slate-500 mt-1 ml-[76px]">{a.motivo}</div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge estado={a.estado} />
                {a.estado === 'pendiente' && (
                  <div className="flex gap-1">
                    <button onClick={() => onEstado(a.id, 'atendida')} title="Marcar atendida" className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700">
                      <Check size={14} />
                    </button>
                    <button onClick={() => onEstado(a.id, 'noshow')} title="No-show" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                      <UserX size={14} />
                    </button>
                    <button onClick={() => onEstado(a.id, 'cancelada')} title="Cancelar" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeekView({ cursor, appts, onDayClick }) {
  const ini = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ini, i));
  const todayISO = toISO(new Date());

  const byDay = useMemo(() => {
    const map = {};
    for (const a of appts) (map[a.fecha] ||= []).push(a);
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    }
    return map;
  }, [appts]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {days.map((d, i) => (
          <div key={i} className="px-3 py-2 text-center border-r last:border-r-0 border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{DIAS_CORTOS[i]}</div>
            <div className={`text-sm font-semibold mt-0.5 ${toISO(d) === todayISO ? 'text-brand-700' : 'text-slate-700'}`}>
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[480px]">
        {days.map((d, i) => {
          const iso = toISO(d);
          const isToday = iso === todayISO;
          const dayAppts = byDay[iso] || [];
          return (
            <button
              key={i}
              onClick={() => onDayClick(d)}
              className={`p-2 border-r last:border-r-0 border-slate-100 text-left hover:bg-slate-50 transition flex flex-col gap-1 ${isToday ? 'bg-brand-50/30' : ''}`}
            >
              {dayAppts.length === 0 ? (
                <span className="text-[11px] text-slate-300">—</span>
              ) : (
                <>
                  {dayAppts.slice(0, 8).map(a => (
                    <div key={a.id} className={`text-[11px] px-1.5 py-0.5 rounded ${estadoPill(a.estado)} truncate`}>
                      <span className="font-mono">{(a.hora || '').slice(0, 5) || '—'}</span> {a.paciente_nombre.split(' ')[0]}
                    </div>
                  ))}
                  {dayAppts.length > 8 && (
                    <div className="text-[11px] text-slate-500 px-1">+{dayAppts.length - 8} más</div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ cursor, appts, onDayClick }) {
  const first = startOfMonth(cursor);
  const last = endOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const gridEnd = endOfWeek(last);

  const days = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) days.push(new Date(d));

  const todayISO = toISO(new Date());
  const currentMonth = cursor.getMonth();

  const byDay = useMemo(() => {
    const map = {};
    for (const a of appts) (map[a.fecha] ||= []).push(a);
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    }
    return map;
  }, [appts]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {DIAS_CORTOS.map(d => (
          <div key={d} className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center border-r last:border-r-0 border-slate-200">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const iso = toISO(d);
          const isToday = iso === todayISO;
          const isCurrent = d.getMonth() === currentMonth;
          const dayAppts = byDay[iso] || [];
          return (
            <button
              key={i}
              onClick={() => onDayClick(d)}
              className={`min-h-[92px] p-1.5 border-r last:border-r-0 border-b border-slate-100 text-left hover:bg-slate-50 transition flex flex-col ${
                !isCurrent ? 'bg-slate-50/60 opacity-60' : ''
              } ${isToday ? 'bg-brand-50/30' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isToday ? 'w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center' : isCurrent ? 'text-slate-700' : 'text-slate-400'}`}>
                  {d.getDate()}
                </span>
                {dayAppts.length > 0 && !isToday && (
                  <span className="text-[10px] text-slate-500">{dayAppts.length}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayAppts.slice(0, 3).map(a => (
                  <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded ${estadoPill(a.estado)} truncate`}>
                    {(a.hora || '').slice(0, 5) || ''} {a.paciente_nombre.split(' ')[0]}
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div className="text-[10px] text-slate-500 px-1">+{dayAppts.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CitaForm({ form, setForm, patients, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-card animate-fade-in">
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-slate-600 mb-1 block">Paciente *</span>
        <select required value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className={inputCls}>
          <option value="">-- elegir --</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>
              {p.apellido}, {p.nombre} {p.cedula ? `(${p.cedula})` : ''}
            </option>
          ))}
        </select>
      </label>
      <Field label="Tipo">
        <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
          <option value="cita">Cita programada</option>
          <option value="walkin">Sin cita</option>
          <option value="followup">Seguimiento</option>
        </select>
      </Field>
      <Field label="Fecha">
        <input required type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Hora">
        <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Motivo">
        <input value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} className={inputCls} />
      </Field>
      <div className="md:col-span-2 flex gap-2">
        <button type="submit" className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Guardar</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">Cancelar</button>
      </div>
    </form>
  );
}

function tipoLabel(tipo) {
  if (tipo === 'walkin') return 'Sin cita';
  if (tipo === 'followup') return 'Seguimiento';
  return 'Cita';
}

function estadoPill(estado) {
  const map = {
    pendiente: 'bg-amber-100 text-amber-800',
    atendida: 'bg-emerald-100 text-emerald-800',
    cancelada: 'bg-slate-100 text-slate-500 line-through',
    noshow: 'bg-slate-100 text-slate-500',
  };
  return map[estado] || 'bg-slate-100 text-slate-600';
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

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
