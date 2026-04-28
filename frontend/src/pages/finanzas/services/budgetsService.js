import { api } from '../../../lib/api.js';

export function getBudget(id) {
  return api.get(`/budgets/${id}`).then(d => d.budget);
}

export function createBudget(payload) {
  return api.post('/budgets', payload);
}

export function updateBudget(id, payload) {
  return api.put(`/budgets/${id}`, payload);
}

export function convertBudgetToInvoice(id) {
  return api.post(`/budgets/${id}/to-invoice`, {});
}

export function deleteBudget(id) {
  return api.delete(`/budgets/${id}`);
}
