import { api } from '../../../lib/api.js';

export function getSettings() {
  return api.get('/admin/settings').then(d => d.settings);
}

export function updateSettings(settings) {
  return api.put('/admin/settings', settings);
}

export function getUsers() {
  return api.get('/admin/users').then(d => d.users);
}

export function createUser(payload) {
  return api.post('/admin/users', payload);
}

export function updateUserActive(userId, active) {
  return api.put(`/admin/users/${userId}`, { active });
}

export function changePassword(payload) {
  return api.post('/admin/change-password', payload);
}

