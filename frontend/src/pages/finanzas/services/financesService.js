import { api } from '../../../lib/api.js';

export function getSummary() {
  return api.get('/finances/summary');
}

export function getDeudores() {
  return api.get('/finances/deudores').then(d => d.deudores);
}

export function getPorMes() {
  return api.get('/finances/por-mes').then(d => d.meses);
}
