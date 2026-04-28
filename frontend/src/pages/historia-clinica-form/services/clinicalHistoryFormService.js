import { api } from '../../../lib/api.js';
import { isFirebaseDataSource } from '../../../lib/dataSource.js';
import { FIRESTORE_COLLECTIONS } from '../../../lib/firestoreCollections.js';
import { getPatient as getPatientRecord } from '../../pacientes/services/pacientesService.js';

export function getPatient(patientId) {
  return getPatientRecord(patientId);
}

export function getPatientHistoria(patientId) {
  if (isFirebaseDataSource()) return getFirestorePatientHistoria(patientId);

  return api.get(`/historias/patient/${patientId}`).then(d => d.historia);
}

export function createHistoria(payload) {
  if (isFirebaseDataSource()) return createFirestoreHistoria(payload);

  return api.post('/historias', toApiPayload(payload));
}

export function updateHistoria(historiaId, payload) {
  if (isFirebaseDataSource()) return updateFirestoreHistoria(historiaId, payload);

  return api.put(`/historias/${historiaId}`, toApiPayload(payload));
}

function toApiPayload(payload) {
  return {
    ...payload,
    patient_id: payload.patient_id === undefined ? undefined : Number(payload.patient_id),
  };
}

function toFirestorePayload(payload) {
  const data = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) data[key] = value;
  }
  if (data.patient_id !== undefined) data.patient_id = String(data.patient_id);
  if (!data.fecha) data.fecha = new Date().toISOString().slice(0, 10);
  return data;
}

function normalizeFirestoreHistoria(snapshot) {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    created_at: data.created_at?.toDate?.().toISOString?.() || data.created_at || null,
    updated_at: data.updated_at?.toDate?.().toISOString?.() || data.updated_at || null,
  };
}

async function firestoreApi() {
  const [
    firestore,
    { requireFirestore },
  ] = await Promise.all([
    import('firebase/firestore'),
    import('../../../lib/firebase.js'),
  ]);

  return { ...firestore, db: requireFirestore() };
}

async function getFirestorePatientHistoria(patientId) {
  const { collection, getDocs, limit, query, where, db } = await firestoreApi();
  const snapshot = await getDocs(query(
    collection(db, FIRESTORE_COLLECTIONS.historias),
    where('patient_id', '==', String(patientId)),
    limit(1),
  ));

  return snapshot.empty ? null : normalizeFirestoreHistoria(snapshot.docs[0]);
}

async function createFirestoreHistoria(payload) {
  const existing = await getFirestorePatientHistoria(payload.patient_id);
  if (existing) throw new Error('Este paciente ya tiene historia clinica');

  const { addDoc, collection, serverTimestamp, db } = await firestoreApi();
  const data = toFirestorePayload(payload);
  const ref = await addDoc(collection(db, FIRESTORE_COLLECTIONS.historias), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return { id: ref.id };
}

async function updateFirestoreHistoria(historiaId, payload) {
  const { doc, serverTimestamp, updateDoc, db } = await firestoreApi();
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.historias, String(historiaId)), {
    ...toFirestorePayload(payload),
    updated_at: serverTimestamp(),
  });
  return { ok: true };
}
