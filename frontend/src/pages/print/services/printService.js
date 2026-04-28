import { api } from '../../../lib/api.js';
import { getClinicSettings } from '../../../services/clinicSettingsService.js';
import { getConsultation as getConsultationRecord, getPatientConsultations as getConsultationsForPatient } from '../../consultas/services/consultasService.js';
import { getPatientHistoria as getHistoriaForPatient } from '../../historia-clinica-form/services/clinicalHistoryFormService.js';
import { getPatient as getPatientRecord } from '../../pacientes/services/pacientesService.js';
import {
  getMedicationsByIds as getMedicationsByIdsRecord,
  getPatientMedications as getPatientMedicationsRecord,
  getPatientProcedures as getPatientProceduresRecord,
} from '../../patient-detail/services/patientDetailService.js';

export function getSettings() {
  return getClinicSettings();
}

export function getPatient(id) {
  return getPatientRecord(id);
}

export function getConsultation(id) {
  return getConsultationRecord(id);
}

export function getInvoice(id) {
  return api.get(`/invoices/${id}`).then(d => d.invoice);
}

export function getBudget(id) {
  return api.get(`/budgets/${id}`).then(d => d.budget);
}

export function getHistoria(patientId) {
  return getHistoriaForPatient(patientId);
}

export function getMedicationsByIds(ids) {
  return getMedicationsByIdsRecord(ids);
}

export function getPatientConsultations(patientId) {
  return getConsultationsForPatient(patientId);
}

export function getPatientProcedures(patientId) {
  return getPatientProceduresRecord(patientId);
}

export function getPatientMedications(patientId) {
  return getPatientMedicationsRecord(patientId);
}

export function getPaymentById(id) {
  return api.get('/finances/payments?').then(d => d.payments.find(p => p.id === Number(id)));
}

export function getInvoicesIndex() {
  return api.get('/invoices').then(d => d.invoices);
}
