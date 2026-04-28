import { api } from '../../../lib/api.js';

export function getPatient(patientId) {
  return api.get(`/patients/${patientId}`).then(d => d.patient);
}

export function getPatientHistoria(patientId) {
  return api.get(`/historias/patient/${patientId}`).then(d => d.historia);
}

export function createHistoria(payload) {
  return api.post('/historias', payload);
}

export function updateHistoria(historiaId, payload) {
  return api.put(`/historias/${historiaId}`, payload);
}

