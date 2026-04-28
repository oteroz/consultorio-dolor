import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const MUSCULOS_TONO = [
  ['brazo', 'Brazo'], ['antebrazo', 'Antebrazo'], ['mano', 'Mano'],
  ['pierna', 'Pierna'], ['muslo', 'Muslo'], ['pie', 'Pie'],
];

const REFLEJOS_LISTA = [
  ['biceps_c5', 'Bíceps C5'], ['braquio_radial_c6', 'Braquio radial C6'],
  ['triceps_c7', 'Tríceps C7'], ['flexores_c8', 'Flexores seclos C8'],
  ['cuadriceps_l2_4', 'Cuádriceps L2, L3 y L4'],
  ['triceps_sural', 'Tríceps Sural L5, L1 y S2'],
  ['aquileo', 'Aquíleo'], ['corneal', 'Corneal V, VII'],
  ['nauseoso', 'Nauseoso IX, X'],
  ['abd_sup', 'Abd Sup T8-T9, T9-T10'],
  ['cremasterico', 'Cremastérico L1 y L5'],
  ['anal', 'Anal S3, S4 y S5'],
  ['babinski', 'Babinski'], ['chaddock', 'Chaddock'], ['oppenheim', 'Oppenheim'],
];

function edad(fNac) {
  if (!fNac) return '—';
  const h = new Date(), n = new Date(fNac);
  let e = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
  return e;
}

const v = x => (x !== null && x !== undefined && x !== '' ? x : '—');

export default function PrintHistoriaClinica() {
  const { patientId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/patients/${patientId}`),
      api.get(`/historias/patient/${patientId}`),
      api.get('/admin/settings'),
    ]).then(([p, h, s]) => {
      setData({ paciente: p.patient, historia: h.historia, settings: s.settings });
      setTimeout(() => window.print(), 500);
    });
  }, [patientId]);

  if (!data) return <div className="p-8">Cargando...</div>;
  const { paciente, historia, settings } = data;

  let tono = {}, reflejos = {};
  if (historia?.tono_muscular) { try { tono = JSON.parse(historia.tono_muscular); } catch {} }
  if (historia?.reflejos) { try { reflejos = JSON.parse(historia.reflejos); } catch {} }

  return (
    <div className="min-h-screen bg-white text-slate-900 p-10 max-w-3xl mx-auto print:p-0 text-[12px] leading-relaxed">
      <header className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="text-center">
          <h1 className="text-lg font-bold">{settings?.medico_nombre || 'Dr./Dra. ___'}</h1>
          <p className="text-[10px] text-slate-600">{settings?.medico_especialidad || 'Anestesiología / Algología'}</p>
          {(settings?.direccion || settings?.telefono) && (
            <p className="text-[10px] text-slate-600">
              {settings.direccion}{settings.telefono && ` · Tel: ${settings.telefono}`}
            </p>
          )}
        </div>
      </header>

      <h2 className="text-center text-base font-bold uppercase tracking-wider mb-1">Historia Clínica — Unidad del Dolor</h2>
      <p className="text-right text-[11px] mb-4">
        <strong>Fecha:</strong> {historia?.fecha || new Date().toISOString().slice(0,10)}
      </p>

      <Section title="Datos Personales">
        <DataGrid pairs={[
          ['Nombres / apodos', `${paciente.nombre} ${paciente.apodo ? `(${paciente.apodo})` : ''}`],
          ['Apellidos', paciente.apellido],
          ['Nacionalidad', v(paciente.nacionalidad)],
          ['Cédula no.', v(paciente.cedula)],
          ['Edad', paciente.fecha_nacimiento ? `${edad(paciente.fecha_nacimiento)} años` : '—'],
          ['Sexo y género', [paciente.genero, paciente.identidad_genero].filter(Boolean).join(' / ') || '—'],
          ['Estado civil', v(paciente.estado_civil)],
          ['Número de hijos', v(paciente.numero_hijos)],
          ['Celular', v(paciente.telefono)],
          ['Teléfono 1', v(paciente.telefono_2)],
          ['Teléfono 2', v(paciente.telefono_otro)],
          ['Dirección', v(paciente.direccion)],
          ['Familiar o persona quien lo refirió', v(paciente.referente_nombre)],
          ['Teléfono de esa persona', v(paciente.referente_telefono)],
          ['Dirección de esa persona', v(paciente.referente_direccion)],
          ['Lugar de origen', v(paciente.lugar_origen)],
          ['Tipo de sangre del paciente', v(paciente.tipo_sangre)],
          ['Nivel de escolaridad', v(paciente.escolaridad)],
          ['Profesión(es) u oficio(s) actual(es)', v(paciente.ocupacion)],
          ['Profesiones y/u oficios anteriores', v(paciente.profesiones_anteriores)],
        ]} />
      </Section>

      {historia && (
        <>
          <Section title="Consulta">
            <LabeledLine label="Motivo de consulta (síntomas principales)" value={historia.motivo_consulta} />
            <LabeledLine label="Inicio y desarrollo de los mismos" value={historia.inicio_desarrollo} />
            <LabeledLine label="Distribución espacial" value={historia.distribucion_espacial} />
            <LabeledLine label="Aspectos cualitativos y cuantitativos" value={historia.aspectos_cualitativos_cuantitativos} />
            <LabeledLine label="Evolución temporal" value={historia.evolucion_temporal} />
            <LabeledLine label="Factores provocativos" value={historia.factores_provocativos} />
            <LabeledLine label="Factores paliativos" value={historia.factores_paliativos} />
            <LabeledLine label="Tratamiento actual" value={historia.tratamiento_actual} />
            <LabeledLine label="Efectos socio-familiares secundarios a este problema" value={historia.efectos_socio_familiares} />
          </Section>

          <Section title="Antecedentes Personales Patológicos">
            <LabeledLine label="Diagnósticos anteriores" value={historia.diagnosticos_anteriores} />
            <LabeledLine label="Factores genéticos y/o congénitos al problema" value={historia.factores_geneticos_congenitos} />
            <LabeledLine label="Factores nutricionales" value={historia.factores_nutricionales} />
            <LabeledLine label="Exposición a sustancias y/o elementos tóxicos" value={historia.exposicion_toxicos} />
            <LabeledLine label="Traumatismos" value={historia.traumatismos} />
            <LabeledLine label="Cirugías" value={historia.cirugias} />
            <LabeledLine label="Transfusiones" value={historia.transfusiones} />
            <LabeledLine label="Alérgicos" value={historia.alergicos} />
            <LabeledLine label="Anestésicos (tipo y duración)" value={historia.anestesicos} />
            <LabeledLine label="ETS/ITS" value={historia.ets_its} />
            <LabeledLine label="Inmunizaciones" value={historia.inmunizaciones} />
            <LabeledLine label="Psiquiátricos y psiquiátricos-familiares" value={historia.psiquiatricos} />
            <LabeledLine label="Hábitos tóxicos (tabaco, alcohol, drogas, café e infusiones)" value={historia.habitos_toxicos} />
          </Section>

          <Section title="Antecedentes Personales No Patológicos">
            <LabeledLine label="Estado de salud antes de aparecer la sintomatología" value={historia.estado_salud_previo} />
          </Section>

          <Section title="Antecedentes Sociales">
            <LabeledLine label="Descripción del entorno por el paciente" value={historia.descripcion_entorno} />
          </Section>

          <Section title="Antecedentes Familiares">
            <LabeledLine label="Familiares directos con la misma problemática" value={historia.familiares_problematica} />
            <LabeledLine label="¿Inciden los familiares en la problemática del paciente?" value={historia.incidencia_familiares} />
            <LabeledLine label="Otros antecedentes a destacar" value={historia.otros_antecedentes_familiares} />
          </Section>

          <Section title="Revisión por Sistemas">
            <p className="font-semibold mt-1">Constitucional</p>
            <DataGrid cols={3} pairs={[
              ['Tensión arterial', v(historia.tension_arterial)],
              ['Frecuencia cardíaca', v(historia.frecuencia_cardiaca)],
              ['Saturación O₂', v(historia.saturacion_o2)],
            ]} />
            <LabeledLine label="Respiratorio — Auscultación pulmones" value={historia.auscultacion_pulmones} />
            <LabeledLine label="Cardiovascular — Auscultación del corazón" value={historia.auscultacion_corazon} />
            <LabeledLine label="Psiquiátrico — Juicio de percepción" value={historia.juicio_percepcion} />
          </Section>

          <Section title="Sistema Músculo Esquelético">
            <LabeledLine label="Inspección y/o palpación de dedos y uñas" value={historia.inspeccion_dedos_unas} />
            <LabeledLine label="Examen de las articulaciones, los huesos y los músculos" value={historia.examen_articulaciones} />
            <LabeledLine label="Marcha — movimientos" value={historia.marcha_movimientos} />
            <p className="font-semibold mt-3">Arco de movimiento (ángulo)</p>
            <LabeledLine label="Columna cervical" value={historia.columna_cervical} />
            <LabeledLine label="Columna toracolumbar" value={historia.columna_toracolumbar} />
            <LabeledLine label="Rotación" value={historia.columna_rotacion} />
            <LabeledLine label="Hombros" value={historia.hombros} />
            <LabeledLine label="Codos" value={historia.codos} />
            <LabeledLine label="Muñecas — Movimiento 130-0-130°" value={historia.munecas_movimiento} />
            <LabeledLine label="Muñecas — Palmas y dorsos juntas" value={historia.munecas_palmas_dorsos} />
            <LabeledLine label="Prueba de Phalen" value={historia.prueba_phalen} />
            <LabeledLine label="Pronación y supinación" value={historia.pronacion_supinacion} />
            <LabeledLine label="Dedos — Abrir y cerrar puños" value={historia.dedos_abrir_cerrar} />
            <LabeledLine label="Dedos — Tocar primer dedo contra los demás" value={historia.dedos_tocar_primer} />
            <LabeledLine label="Miembros inferiores" value={historia.miembros_inferiores} />
          </Section>

          <Section title="Sensibilidad">
            <LabeledLine label="Déficit o trastorno" value={historia.deficit_trastorno} />
            <LabeledLine label="Sensación propioceptiva" value={historia.sensacion_propioceptiva} />
            <LabeledLine label="Sensibilidad a la presión (reticular)" value={historia.sensibilidad_presion} />
            <LabeledLine label="Combinada (cortical)" value={historia.sensibilidad_combinada} />
          </Section>

          <Section title="Tono Muscular">
            <p className="text-[10px] text-slate-600 mb-1">Escala: 5=Fisiológica, 4=Buena, 3=Aceptable, 2=Pobre, 1=Indicios, 0=Cero</p>
            <TablaDI filas={MUSCULOS_TONO} data={tono} />
          </Section>

          <Section title="Reflejos">
            <p className="text-[10px] text-slate-600 mb-1">Escala: 0=Ausente, 1=Vestigial, 2=Fisiológico, 3=Exaltado, 4=Espástico</p>
            <TablaDI filas={REFLEJOS_LISTA} data={reflejos} />
          </Section>

          <Section title="Nervios Craneales">
            <LabeledLine label="I. Olfatorio — Olfato" value={historia.nc1_olfatorio} />
            <LabeledLine label="II. Óptico — Agudeza, campos, percepción y colores" value={historia.nc2_optico} />
            <LabeledLine label="III-IV-VI. Oculomotor, Troclear y Motor Ocular Externo" value={historia.nc3_5_oculomotor} />
            <LabeledLine label="V. Trigémino — Sensibilidad de la cara y masticación" value={historia.nc5_trigemino} />
            <LabeledLine label="VII. Facial — Sensibilidad y expresión de la cara" value={historia.nc7_facial} />
            <LabeledLine label="VIII. Auditivo — Vestibular y coclear" value={historia.nc8_auditivo} />
            <LabeledLine label="IX. Glosofaríngeo" value={historia.nc9_glosofaringeo} />
            <LabeledLine label="X. Vago" value={historia.nc10_vago} />
            <LabeledLine label="XI. Accesorio — Elevación hombros y rotación cabeza" value={historia.nc11_accesorio} />
            <LabeledLine label="XII. Hipogloso — Movimientos de la lengua" value={historia.nc12_hipogloso} />
          </Section>

          <Section title="Notas de evaluación">
            <p className="whitespace-pre-wrap">{v(historia.notas_evaluacion)}</p>
          </Section>
        </>
      )}

      <footer className="mt-12 pt-8">
        <div className="border-t-2 border-slate-900 pt-2 w-64 ml-auto text-center">
          <p className="text-[11px]">Firma y sello</p>
          <p className="text-[10px] text-slate-600 mt-1">{settings?.medico_nombre || ''}</p>
        </div>
      </footer>

      <div className="mt-8 text-center no-print">
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">
          Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-4">
      <h3 className="bg-slate-100 border-l-4 border-slate-900 px-2 py-1 text-sm font-bold uppercase tracking-wider mb-2 break-inside-avoid">{title}</h3>
      <div className="pl-1">{children}</div>
    </section>
  );
}

function LabeledLine({ label, value }) {
  return (
    <div className="mb-1.5 break-inside-avoid">
      <span className="font-semibold">{label}: </span>
      <span className="whitespace-pre-wrap">{v(value)}</span>
    </div>
  );
}

function DataGrid({ pairs, cols = 2 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-x-4`}>
      {pairs.map(([label, value], i) => (
        <div key={i} className="mb-1 flex gap-2">
          <span className="font-semibold shrink-0">{label}:</span>
          <span className="flex-1">{v(value)}</span>
        </div>
      ))}
    </div>
  );
}

function TablaDI({ filas, data }) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr>
          <th className="text-left border border-slate-300 px-2 py-1 bg-slate-50">Zona / Reflejo</th>
          <th className="border border-slate-300 px-2 py-1 bg-slate-50 w-16">D</th>
          <th className="border border-slate-300 px-2 py-1 bg-slate-50 w-16">I</th>
        </tr>
      </thead>
      <tbody>
        {filas.map(([k, label]) => (
          <tr key={k}>
            <td className="border border-slate-300 px-2 py-1">{label}</td>
            <td className="border border-slate-300 px-2 py-1 text-center tabular-nums">{v(data[k]?.d)}</td>
            <td className="border border-slate-300 px-2 py-1 text-center tabular-nums">{v(data[k]?.i)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
