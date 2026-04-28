export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'api';

export function isFirebaseDataSource() {
  return DATA_SOURCE === 'firebase';
}
