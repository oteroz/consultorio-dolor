import { useEffect, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { Field, inputCls, PermissionDenied } from '../components/AdminShared.jsx';
import { createUser, getUsers, updateUserActive } from '../services/adminService.js';

export default function UsuariosTab({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'medico' });
  const [err, setErr] = useState('');

  async function load() { const users = await getUsers(); setUsers(users); }
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      await createUser(form);
      setForm({ username: '', password: '', full_name: '', role: 'medico' });
      setShowForm(false);
      load();
    } catch (e) { setErr(e.message); }
  }

  async function toggle(u) {
    await updateUserActive(u.id, !u.active);
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

