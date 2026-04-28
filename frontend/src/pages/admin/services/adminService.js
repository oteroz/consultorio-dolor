import { api } from '../../../lib/api.js';
import { getClinicSettings, updateClinicSettings } from '../../../services/clinicSettingsService.js';

export function getSettings() {
  return getClinicSettings();
}

export function updateSettings(settings) {
  return updateClinicSettings(settings);
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
