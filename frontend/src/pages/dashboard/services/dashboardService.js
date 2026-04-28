import { api } from '../../../lib/api.js';
import { isFirebaseDataSource } from '../../../lib/dataSource.js';
import { getAppointments, getPendingFollowups } from '../../agenda/services/agendaService.js';
import { listPatients } from '../../pacientes/services/pacientesService.js';

const EMPTY_ALERTS = {
  opioides_sin_revision: [],
  seguimientos_vencidos: [],
  eva_alto_sin_retorno: [],
  total: 0,
};

export function getFollowups() {
  if (isFirebaseDataSource()) return getPendingFollowups();

  return api.get('/appointments/followups-pendientes').then(d => d.followups);
}

export function getTodayAppointments() {
  if (isFirebaseDataSource()) {
    const today = new Date().toISOString().slice(0, 10);
    return getAppointments(today, today);
  }

  return api.get('/appointments').then(d => d.appointments);
}

export function getPatientCount() {
  if (isFirebaseDataSource()) return listPatients().then(patients => patients.length);

  return api.get('/patients').then(d => d.patients.length);
}

export function getAlerts() {
  if (isFirebaseDataSource()) return Promise.resolve(EMPTY_ALERTS);

  return api.get('/alerts');
}
