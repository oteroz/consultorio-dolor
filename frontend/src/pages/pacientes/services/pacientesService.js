import { api } from '../../../lib/api.js';

export function listPatients(query) {
  const qs = query ? `?q=${encodeURIComponent(query)}` : '';
  return api.get(`/patients${qs}`).then(d => d.patients);
}

export function getPatient(id) {
  return api.get(`/patients/${id}`).then(d => d.patient);
}

export function createPatient(payload) {
  return api.post('/patients', payload).then(d => d.patient);
}

export function updatePatient(id, payload) {
  return api.put(`/patients/${id}`, payload);
}
