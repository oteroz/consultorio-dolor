import { api } from '../../../lib/api.js';

export function listInvoices() {
  return api.get('/invoices').then(d => d.invoices);
}

export function getInvoice(id) {
  return api.get(`/invoices/${id}`).then(d => d.invoice);
}

export function createInvoice(payload) {
  return api.post('/invoices', payload);
}

export function addPayment(invoiceId, payload) {
  return api.post(`/invoices/${invoiceId}/payments`, payload);
}

export function deletePayment(invoiceId, paymentId) {
  return api.delete(`/invoices/${invoiceId}/payments/${paymentId}`);
}

export function voidInvoice(id) {
  return api.post(`/invoices/${id}/void`, {});
}

export function deleteInvoice(id) {
  return api.delete(`/invoices/${id}`);
}
