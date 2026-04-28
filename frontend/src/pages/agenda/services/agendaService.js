import { api } from '../../../lib/api.js';

export function getAppointments(desde, hasta) {
  return api.get(`/appointments?desde=${desde}&hasta=${hasta}`).then(d => d.appointments);
}

export function getPendingFollowups() {
  return api.get('/appointments/followups-pendientes').then(d => d.followups);
}

export function getPatients() {
  return api.get('/patients').then(d => d.patients);
}

export function createAppointment(payload) {
  return api.post('/appointments', payload);
}

export function updateAppointmentStatus(id, estado) {
  return api.put(`/appointments/${id}`, { estado });
}

