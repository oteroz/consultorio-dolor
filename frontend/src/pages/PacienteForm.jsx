import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const EMPTY = {
  // Datos personales (según documento)
  nombre: '', apellido: '', apodo: '',
  cedula: '', nacionalidad: '',
  fecha_nacimiento: '',
  genero: '', identidad_genero: '',
  estado_civil: '', numero_hijos: '',
  lugar_origen: '', tipo_sangre: '',
  escolaridad: '',
  ocupacion: '', profesiones_anteriores: '',
  // Contacto
  telefono: '', telefono_2: '', telefono_otro: '',
  email: '', direccion: '',
  // Referente
  referente_nombre: '', referente_telefono: '', referente_direccion: '',
  // Contacto de emergencia
  contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
  // Antecedentes rápidos (además de los de la historia clínica formal)
  antecedentes_personales: '', antecedentes_familiares: '',
  antecedentes_alergicos: '', antecedentes_quirurgicos: '',
  notas: '',
};

export default function PacienteForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [data, setData] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/patients/${id}`).then(d => {
      const p = d.patient;
      const loaded = {};
      for (const k of Object.keys(EMPTY)) loaded[k] = p[k] ?? '';
      setData(loaded);
    });
  }, [id, isEdit]);

  function set(k, v) { setData(d => ({ ...d, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {};
    for (const k of Object.keys(data)) {
      payload[k] = data[k] === '' ? null : data[k];
    }
    payload.nombre = data.nombre;
    payload.apellido = data.apellido;
    if (data.numero_hijos !== '') payload.numero_hijos = Number(data.numero_hijos);
    try {
      if (isEdit) {
        await api.put(`/patients/${id}`, payload);
        navigate(`/pacientes/${id}`);
      } else {
        const d = await api.post('/patients', payload);
        navigate(`/pacientes/${d.patient.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">{isEdit ? 'Editar paciente' : 'Nuevo paciente'}</h1>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-card">
        <Section title="Datos personales">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombres *"><input required className={input} value={data.nombre} onChange={e=>set('nombre',e.target.value)} /></Field>
            <Field label="Apellidos *"><input required className={input} value={data.apellido} onChange={e=>set('apellido',e.target.value)} /></Field>
            <Field label="Apodo"><input className={input} value={data.apodo} onChange={e=>set('apodo',e.target.value)} /></Field>
            <Field label="Cédula"><input className={input} value={data.cedula} onChange={e=>set('cedula',e.target.value)} /></Field>
            <Field label="Nacionalidad"><input className={input} value={data.nacionalidad} onChange={e=>set('nacionalidad',e.target.value)} placeholder="ej: Dominicana" /></Field>
            <Field label="Fecha de nacimiento"><input type="date" className={input} value={data.fecha_nacimiento} onChange={e=>set('fecha_nacimiento',e.target.value)} /></Field>
            <Field label="Sexo"><select className={input} value={data.genero} onChange={e=>set('genero',e.target.value)}>
              <option value="">--</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="otro">Otro</option>
            </select></Field>
            <Field label="Identidad de género"><input className={input} value={data.identidad_genero} onChange={e=>set('identidad_genero',e.target.value)} placeholder="opcional" /></Field>
            <Field label="Estado civil"><select className={input} value={data.estado_civil} onChange={e=>set('estado_civil',e.target.value)}>
              <option value="">--</option>
              <option value="soltero">Soltero/a</option>
              <option value="casado">Casado/a</option>
              <option value="union_libre">Unión libre</option>
              <option value="divorciado">Divorciado/a</option>
              <option value="viudo">Viudo/a</option>
            </select></Field>
            <Field label="Número de hijos"><input type="number" min="0" className={input} value={data.numero_hijos} onChange={e=>set('numero_hijos',e.target.value)} /></Field>
            <Field label="Lugar de origen"><input className={input} value={data.lugar_origen} onChange={e=>set('lugar_origen',e.target.value)} /></Field>
            <Field label="Tipo de sangre"><select className={input} value={data.tipo_sangre} onChange={e=>set('tipo_sangre',e.target.value)}>
              <option value="">--</option>
              <option>A+</option><option>A-</option>
              <option>B+</option><option>B-</option>
              <option>AB+</option><option>AB-</option>
              <option>O+</option><option>O-</option>
            </select></Field>
          </div>
        </Section>

        <Section title="Formación y trabajo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nivel de escolaridad"><input className={input} value={data.escolaridad} onChange={e=>set('escolaridad',e.target.value)} placeholder="ej: Universitario, Bachiller" /></Field>
            <Field label="Profesión u oficio actual"><input className={input} value={data.ocupacion} onChange={e=>set('ocupacion',e.target.value)} /></Field>
            <Field full label="Profesiones u oficios anteriores de interés"><input className={input} value={data.profesiones_anteriores} onChange={e=>set('profesiones_anteriores',e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="Contacto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Celular"><input className={input} value={data.telefono} onChange={e=>set('telefono',e.target.value)} /></Field>
            <Field label="Teléfono 1"><input className={input} value={data.telefono_2} onChange={e=>set('telefono_2',e.target.value)} /></Field>
            <Field label="Teléfono 2"><input className={input} value={data.telefono_otro} onChange={e=>set('telefono_otro',e.target.value)} /></Field>
            <Field label="Email"><input type="email" className={input} value={data.email} onChange={e=>set('email',e.target.value)} /></Field>
            <Field full label="Dirección"><input className={input} value={data.direccion} onChange={e=>set('direccion',e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="Familiar o persona quien lo refirió">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre"><input className={input} value={data.referente_nombre} onChange={e=>set('referente_nombre',e.target.value)} /></Field>
            <Field label="Teléfono"><input className={input} value={data.referente_telefono} onChange={e=>set('referente_telefono',e.target.value)} /></Field>
            <Field full label="Dirección"><input className={input} value={data.referente_direccion} onChange={e=>set('referente_direccion',e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="Contacto de emergencia">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre"><input className={input} value={data.contacto_emergencia_nombre} onChange={e=>set('contacto_emergencia_nombre',e.target.value)} /></Field>
            <Field label="Teléfono"><input className={input} value={data.contacto_emergencia_telefono} onChange={e=>set('contacto_emergencia_telefono',e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="Antecedentes (resumen rápido)">
          <p className="text-xs text-slate-500 mb-3">Para antecedentes detallados (patológicos, exposición tóxicos, etc.) usa la Historia Clínica completa desde la pestaña correspondiente.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field full label="Personales"><textarea rows={2} className={input} value={data.antecedentes_personales} onChange={e=>set('antecedentes_personales',e.target.value)} /></Field>
            <Field full label="Familiares"><textarea rows={2} className={input} value={data.antecedentes_familiares} onChange={e=>set('antecedentes_familiares',e.target.value)} /></Field>
            <Field full label="Alergias"><textarea rows={2} className={input} value={data.antecedentes_alergicos} onChange={e=>set('antecedentes_alergicos',e.target.value)} /></Field>
            <Field full label="Quirúrgicos"><textarea rows={2} className={input} value={data.antecedentes_quirurgicos} onChange={e=>set('antecedentes_quirurgicos',e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="Notas">
          <textarea rows={3} className={input} value={data.notas} onChange={e=>set('notas',e.target.value)} />
        </Section>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <Link to={isEdit ? `/pacientes/${id}` : '/pacientes'} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm';

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">{title}</h3>
      {children}
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
