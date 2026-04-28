import { api } from '../../../lib/api.js';
import { getClinicSettings } from '../../../services/clinicSettingsService.js';

export function getSettings() {
  return getClinicSettings();
}

export function getPatient(id) {
  return api.get(`/patients/${id}`).then(d => d.patient);
}

export function getConsultation(id) {
  return api.get(`/consultations/${id}`).then(d => d.consultation);
}

export function getInvoice(id) {
  return api.get(`/invoices/${id}`).then(d => d.invoice);
}

export function getBudget(id) {
  return api.get(`/budgets/${id}`).then(d => d.budget);
}

export function getHistoria(patientId) {
  return api.get(`/historias/patient/${patientId}`).then(d => d.historia);
}

export function getMedicationsByIds(ids) {
  return api.get(`/medications/by-ids/${ids}`).then(d => d.medications);
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

export function getPaymentById(id) {
  return api.get('/finances/payments?').then(d => d.payments.find(p => p.id === Number(id)));
}

export function getInvoicesIndex() {
  return api.get('/invoices').then(d => d.invoices);
}
