import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import {
  Calendar, Clock, Users, CalendarCheck, ChevronRight,
  AlertTriangle, Pill, TrendingUp, CalendarX,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [followups, setFollowups] = useState([]);
  const [todayAppts, setTodayAppts] = useState([]);
  const [patientCount, setPatientCount] = useState(null);
  const [alerts, setAlerts] = useState({
    opioides_sin_revision: [],
    seguimientos_vencidos: [],
    eva_alto_sin_retorno: [],
    total: 0,
  });

  useEffect(() => {
    api.get('/appointments/followups-pendientes').then(d => setFollowups(d.followups)).catch(() => {});
    api.get('/appointments').then(d => setTodayAppts(d.appointments)).catch(() => {});
    api.get('/patients').then(d => setPatientCount(d.patients.length)).catch(() => {});
    api.get('/alerts').then(d => setAlerts(d)).catch(() => {});
  }, []);

  const firstName = user.fullName.split(' ')[0];
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const dateStr = now.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });
  const pending = todayAppts.filter(a => a.estado === 'pendiente').length;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">
          {greeting}, {firstName}
        </h1>
        <p className="text-slate-500 mt-1 capitalize">{dateStr}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Calendar}
          label="Citas hoy"
          value={todayAppts.length}
          hint={pending > 0 ? `${pending} pendiente${pending > 1 ? 's' : ''}` : 'ninguna pendiente'}
          tone="brand"
          link="/agenda"
        />
        <StatCard
          icon={CalendarCheck}
          label="Seguimientos (7 días)"
          value={followups.length}
          hint={followups.length === 0 ? 'al día' : 'por atender'}
          tone="amber"
          link="/agenda"
        />
        <StatCard
          icon={Users}
          label="Pacientes"
          value={patientCount ?? '—'}
          hint="en el sistema"
          tone="slate"
          link="/pacientes"
        />
        <StatCard
          icon={AlertTriangle}
          label="Alertas"
          value={alerts.total}
          hint={alerts.total === 0 ? 'nada urgente' : 'requieren atención'}
          tone={alerts.total === 0 ? 'emerald' : 'rose'}
        />
      </div>

      {alerts.total > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-rose-600" />
            <h2 className="text-lg font-semibold text-slate-900">Requiere atención</h2>
            <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-semibold">{alerts.total}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.opioides_sin_revision.length > 0 && (
              <AlertCard
                icon={Pill}
                tone="amber"
                title="Opioides sin control"
                subtitle=">90 días sin consulta"
                items={alerts.opioides_sin_revision.map(p => ({
                  id: `op-${p.id}`,
                  primary: `${p.apellido}, ${p.nombre}`,
                  secondary: `${p.opioides} · ${p.dias_sin_revision}d sin revisar`,
                  link: `/pacientes/${p.id}`,
                }))}
              />
            )}

            {alerts.seguimientos_vencidos.length > 0 && (
              <AlertCard
                icon={CalendarX}
                tone="rose"
                title="Seguimientos vencidos"
                subtitle="follow-ups pasados sin marcar"
                items={alerts.seguimientos_vencidos.map(s => ({
                  id: `sv-${s.id}`,
                  primary: s.paciente_nombre,
                  secondary: `${s.dias_atraso}d de atraso · ${s.fecha}`,
                  link: `/pacientes/${s.patient_id}`,
                }))}
              />
            )}

            {alerts.eva_alto_sin_retorno.length > 0 && (
              <AlertCard
                icon={TrendingUp}
                tone="rose"
                title="Dolor alto sin retorno"
                subtitle="EVA ≥7, no han vuelto"
                items={alerts.eva_alto_sin_retorno.map(p => ({
                  id: `ea-${p.id}`,
                  primary: `${p.apellido}, ${p.nombre}`,
                  secondary: `EVA ${p.eva} · ${p.dias_sin_volver}d sin volver`,
                  link: `/pacientes/${p.id}`,
                }))}
              />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section
          icon={Clock}
          title="Hoy en agenda"
          link="/agenda"
          linkLabel="Ver agenda"
          empty={todayAppts.length === 0}
          emptyText="Sin citas programadas para hoy."
        >
          <ul className="divide-y divide-slate-100">
            {todayAppts.map(a => (
              <li key={a.id} className="py-3 flex justify-between items-center text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-500 font-mono text-xs w-12 shrink-0">{a.hora ?? '--:--'}</span>
                  <span className="truncate">{a.paciente_nombre}</span>
                </div>
                <StatusDot estado={a.estado} />
              </li>
            ))}
          </ul>
        </Section>

        <Section
          icon={CalendarCheck}
          title="Seguimientos próximos 7 días"
          link="/agenda"
          linkLabel="Ver todos"
          empty={followups.length === 0}
          emptyText="Sin seguimientos pendientes."
        >
          <ul className="divide-y divide-slate-100">
            {followups.map(f => (
              <li key={f.id} className="py-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium truncate">{f.paciente_nombre}</span>
                  <span className="text-slate-500 text-xs shrink-0 ml-2">{f.fecha}</span>
                </div>
                {f.motivo && <div className="text-xs text-slate-500 mt-0.5 truncate">{f.motivo}</div>}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = 'brand', link }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  const Wrapper = link ? Link : 'div';
  const wrapperProps = link ? { to: link } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover hover:border-slate-300 transition block group"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{hint}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]} group-hover:scale-105 transition`}>
          <Icon size={18} />
        </div>
      </div>
    </Wrapper>
  );
}

function AlertCard({ icon: Icon, tone, title, subtitle, items }) {
  const tones = {
    amber: { border: 'border-amber-200', bg: 'bg-amber-50', icon: 'text-amber-600', count: 'bg-amber-200 text-amber-900' },
    rose: { border: 'border-rose-200', bg: 'bg-rose-50', icon: 'text-rose-600', count: 'bg-rose-200 text-rose-900' },
  }[tone] || { border: 'border-slate-200', bg: 'bg-slate-50', icon: 'text-slate-600', count: 'bg-slate-200 text-slate-700' };

  return (
    <div className={`bg-white rounded-2xl border ${tones.border} shadow-card overflow-hidden flex flex-col`}>
      <div className={`p-4 ${tones.bg} border-b ${tones.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={18} className={tones.icon} />
            <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tones.count}`}>{items.length}</span>
        </div>
        <p className="text-xs text-slate-600 mt-1">{subtitle}</p>
      </div>
      <ul className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
        {items.slice(0, 10).map(item => (
          <li key={item.id}>
            <Link to={item.link} className="p-3 block hover:bg-slate-50 transition">
              <div className="font-medium text-sm text-slate-900 truncate">{item.primary}</div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">{item.secondary}</div>
            </Link>
          </li>
        ))}
        {items.length > 10 && (
          <li className="p-3 text-center text-xs text-slate-500">+{items.length - 10} más</li>
        )}
      </ul>
    </div>
  );
}

function Section({ icon: Icon, title, children, link, linkLabel, empty, emptyText }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-brand-600" />
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        {link && (
          <Link to={link} className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
            {linkLabel}
            <ChevronRight size={14} />
          </Link>
        )}
      </div>
      {empty ? <p className="text-sm text-slate-500 py-2">{emptyText}</p> : children}
    </div>
  );
}

function StatusDot({ estado }) {
  const colors = {
    pendiente: 'bg-amber-500',
    atendida: 'bg-emerald-500',
    cancelada: 'bg-slate-400',
    noshow: 'bg-slate-400',
  };
  return (
    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
      <span className={`w-2 h-2 rounded-full ${colors[estado] || 'bg-slate-400'}`}></span>
      {estado}
    </div>
  );
}
