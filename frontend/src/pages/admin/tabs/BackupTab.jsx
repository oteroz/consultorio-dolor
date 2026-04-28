import { AlertCircle, Download } from 'lucide-react';
import { PermissionDenied } from '../components/AdminShared.jsx';

export default function BackupTab({ isAdmin }) {
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

