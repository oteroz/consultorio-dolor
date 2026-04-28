import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Building2, Users, Key, Download, Plus, AlertCircle } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('consultorio');

  const tabs = [
    { key: 'consultorio', label: 'Consultorio', icon: Building2 },
    { key: 'usuarios', label: 'Usuarios', icon: Users },
    { key: 'password', label: 'Mi contraseña', icon: Key },
    { key: 'backup', label: 'Backup', icon: Download },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-semibold text-slate-900 mb-6">Administración</h1>
      <div className="border-b border-slate-200 mb-6 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
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
        {tab === 'consultorio' && <ConsultorioTab isAdmin={user.role === 'admin'} />}
        {tab === 'usuarios' && <UsuariosTab isAdmin={user.role === 'admin'} />}
        {tab === 'password' && <PasswordTab />}
        {tab === 'backup' && <BackupTab isAdmin={user.role === 'admin'} />}
      </div>
    </div>
  );
}

function ConsultorioTab({ isAdmin }) {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/admin/settings').then(d => setS(d.settings)); }, []);

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      await api.put('/admin/settings', s);
      setMsg('Guardado.');
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  if (!s) return <p className="text-slate-500">Cargando...</p>;
  if (!isAdmin) return <PermissionDenied />;

  const fields = [
    ['medico_nombre', 'Nombre del médico'],
    ['medico_exequatur', 'Exequátur'],
    ['medico_especialidad', 'Especialidad'],
    ['consultorio_nombre', 'Nombre del consultorio'],
    ['direccion', 'Dirección'],
    ['telefono', 'Teléfono'],
    ['email', 'Email'],
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-4">
      <p className="text-sm text-slate-600">
        Estos datos aparecen en el encabezado de los PDFs e informes.
      </p>
      {fields.map(([k, label]) => (
        <label key={k} className="block">
          <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
          <input className={inputCls} value={s[k] || ''} onChange={e => setS({ ...s, [k]: e.target.value })} />
        </label>
      ))}
      {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );
}

function UsuariosTab({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'medico' });
  const [err, setErr] = useState('');

  async function load() { const d = await api.get('/admin/users'); setUsers(d.users); }
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      await api.post('/admin/users', form);
      setForm({ username: '', password: '', full_name: '', role: 'medico' });
      setShowForm(false);
      load();
    } catch (e) { setErr(e.message); }
  }

  async function toggle(u) {
    await api.put(`/admin/users/${u.id}`, { active: !u.active });
    load();
  }

  if (!isAdmin) return <PermissionDenied />;

  const roleStyles = {
    admin: 'bg-violet-100 text-violet-800',
    medico: 'bg-brand-100 text-brand-800',
    secretaria: 'bg-slate-100 text-slate-700',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuarios del sistema</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 shadow-card animate-fade-in">
          <Field label="Username *"><input required className={inputCls} value={form.username} onChange={e=>setForm({...form, username:e.target.value})} /></Field>
          <Field label="Nombre completo *"><input required className={inputCls} value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} /></Field>
          <Field label="Contraseña *"><input required type="password" className={inputCls} value={form.password} onChange={e=>setForm({...form, password:e.target.value})} /></Field>
          <Field label="Rol *"><select className={inputCls} value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
            <option value="admin">Admin</option>
            <option value="medico">Médico</option>
            <option value="secretaria">Secretaria</option>
          </select></Field>
          {err && <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={14} />{err}</div>}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600 tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Usuario</th>
              <th className="text-left px-5 py-3 font-semibold">Nombre</th>
              <th className="text-left px-5 py-3 font-semibold">Rol</th>
              <th className="text-left px-5 py-3 font-semibold">Estado</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-900">{u.username}</td>
                <td className="px-5 py-3 text-slate-600">{u.full_name}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleStyles[u.role]}`}>{u.role}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => toggle(u)} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                    {u.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PasswordTab() {
  const [old_password, setOld] = useState('');
  const [new_password, setNew] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(''); setErr('');
    try {
      await api.post('/admin/change-password', { old_password, new_password });
      setOld(''); setNew(''); setMsg('Contraseña actualizada correctamente.');
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md space-y-4 shadow-card">
      <Field label="Contraseña actual"><input type="password" required className={inputCls} value={old_password} onChange={e=>setOld(e.target.value)} /></Field>
      <Field label="Nueva contraseña (mínimo 4 caracteres)"><input type="password" required className={inputCls} value={new_password} onChange={e=>setNew(e.target.value)} /></Field>
      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msg}</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={14} />{err}</div>}
      <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50">
        {saving ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

function BackupTab({ isAdmin }) {
  if (!isAdmin) return <PermissionDenied />;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl shadow-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Download size={18} className="text-brand-700" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Backup de la base de datos</h3>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Descarga una copia completa del archivo <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">.db</code>.
        Cópiala a un pendrive o disco externo — es tu única línea de defensa contra pérdida de datos.
      </p>
      <a
        href="/api/admin/backup"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm"
        download
      >
        <Download size={16} /> Descargar backup
      </a>
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
        <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900">
          Recomendación: hacer backup al menos una vez por semana y conservar las últimas 3–4 copias.
        </p>
      </div>
    </div>
  );
}

function PermissionDenied() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-3">
        <Key size={20} className="text-slate-500" />
      </div>
      <p className="text-slate-600">Solo los administradores pueden ver esta sección.</p>
    </div>
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
