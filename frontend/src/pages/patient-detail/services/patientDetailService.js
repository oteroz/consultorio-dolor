import { api } from '../../../lib/api.js';
import { getAppointments } from '../../agenda/services/agendaService.js';
import { deletePatient as deletePatientRecord, getPatient as getPatientRecord } from '../../pacientes/services/pacientesService.js';

export function getPatient(patientId) {
  return getPatientRecord(patientId);
}

export function deletePatient(patientId) {
  return deletePatientRecord(patientId);
}

export function getPatientConsultations(patientId) {
  return api.get(`/consultations/patient/${patientId}`).then(d => d.consultations);
}

export function getPatientProcedures(patientId) {
  return api.get(`/procedures/patient/${patientId}`).then(d => d.procedures);
}

export function getPatientMedications(patientId) {
  return api.get(`/medications/patient/${patientId}`).then(d => d.medications);
}

export function getPatientMedicationTitrations(patientId) {
  return api.get(`/medications/patient/${patientId}/titrations`).then(d => d.titrations);
}

export function getAppointmentsBetween(desde, hasta) {
  return getAppointments(desde, hasta);
}

export function getPatientAppointments(patientId, desde, hasta) {
  return getAppointmentsBetween(desde, hasta)
    .then(appointments => appointments.filter(a => String(a.patient_id) === String(patientId)));
}

export function getPatientHistoria(patientId) {
  return api.get(`/historias/patient/${patientId}`).then(d => d.historia);
}

export function getPatientFinances(patientId) {
  return api.get(`/finances/patient/${patientId}`);
}

export function createProcedure(payload) {
  return api.post('/procedures', payload);
}

export function updateProcedureEvaPost(procedureId, evaPost) {
  return api.patch(`/procedures/${procedureId}`, { eva_post: evaPost });
}

export function createMedication(payload) {
  return api.post('/medications', payload);
}

export function createMedicationTitration(medicationId, payload) {
  return api.post(`/medications/${medicationId}/titrations`, payload);
}

export function updateMedicationActive(medicationId, active) {
  return api.put(`/medications/${medicationId}`, { activo: active });
}
