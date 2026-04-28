import { api } from '../../../lib/api.js';

export function getFollowups() {
  return api.get('/appointments/followups-pendientes').then(d => d.followups);
}

export function getTodayAppointments() {
  return api.get('/appointments').then(d => d.appointments);
}

export function getPatientCount() {
  return api.get('/patients').then(d => d.patients.length);
}

export function getAlerts() {
  return api.get('/alerts');
}
