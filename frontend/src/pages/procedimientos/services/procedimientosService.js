import { api } from '../../../lib/api.js';

export function listProcedures({ desde, hasta, tipo } = {}) {
  const qs = new URLSearchParams();
  if (desde) qs.set('desde', desde);
  if (hasta) qs.set('hasta', hasta);
  if (tipo) qs.set('tipo', tipo);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api.get(`/procedures${suffix}`).then(d => d.procedures);
}
