import { api } from '../lib/api.js';
import { isFirebaseDataSource } from '../lib/dataSource.js';
import { FIRESTORE_COLLECTIONS, FIRESTORE_DOCS } from '../lib/firestoreCollections.js';

const DEFAULT_SETTINGS = {
  medico_nombre: '',
  medico_exequatur: '',
  medico_especialidad: 'Anestesiologia / Algologia',
  consultorio_nombre: '',
  direccion: '',
  telefono: '',
  email: '',
};

export async function getClinicSettings() {
  if (!isFirebaseDataSource()) {
    return api.get('/admin/settings').then(d => d.settings);
  }

  const [{ doc, getDoc }, { requireFirestore }] = await Promise.all([
    import('firebase/firestore'),
    import('../lib/firebase.js'),
  ]);
  const ref = doc(
    requireFirestore(),
    FIRESTORE_COLLECTIONS.clinicSettings,
    FIRESTORE_DOCS.clinicSettings,
  );
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? { ...DEFAULT_SETTINGS, ...snapshot.data() } : DEFAULT_SETTINGS;
}

export async function updateClinicSettings(settings) {
  if (!isFirebaseDataSource()) {
    return api.put('/admin/settings', settings);
  }

  const [{ doc, serverTimestamp, setDoc }, { requireFirestore }] = await Promise.all([
    import('firebase/firestore'),
    import('../lib/firebase.js'),
  ]);
  const ref = doc(
    requireFirestore(),
    FIRESTORE_COLLECTIONS.clinicSettings,
    FIRESTORE_DOCS.clinicSettings,
  );
  return setDoc(ref, { ...settings, updated_at: serverTimestamp() }, { merge: true });
}
