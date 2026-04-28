import { api } from '../../../lib/api.js';

export function listPatientsForSelect() {
  return api.get('/patients').then(d => d.patients);
}
