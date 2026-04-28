import { api } from '../../../lib/api.js';

export function getConsultation(id) {
  return api.get(`/consultations/${id}`).then(d => d.consultation);
}

export function createConsultation(payload) {
  return api.post('/consultations', payload).then(d => d.consultation);
}

export function updateConsultation(id, payload) {
  return api.put(`/consultations/${id}`, payload);
}

export function deleteConsultation(id) {
  return api.delete(`/consultations/${id}`);
}
