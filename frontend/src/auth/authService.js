import { api } from '../lib/api.js';
import { isFirebaseDataSource } from '../lib/dataSource.js';
import { FIRESTORE_COLLECTIONS } from '../lib/firestoreCollections.js';

function profileFromFirebaseUser(firebaseUser, profile) {
  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    username: profile.email || firebaseUser.email,
    email: profile.email || firebaseUser.email,
    fullName: profile.full_name || firebaseUser.displayName || firebaseUser.email,
    role: profile.role,
    active: profile.active,
  };
}

async function getUserProfile(uid) {
  const [{ doc, getDoc }, { requireFirestore }] = await Promise.all([
    import('firebase/firestore'),
    import('../lib/firebase.js'),
  ]);
  const snapshot = await getDoc(doc(requireFirestore(), FIRESTORE_COLLECTIONS.users, uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function createBootstrapAdminProfile(firebaseUser) {
  const [{ doc, serverTimestamp, setDoc }, { requireFirestore }] = await Promise.all([
    import('firebase/firestore'),
    import('../lib/firebase.js'),
  ]);
  const profile = {
    email: firebaseUser.email,
    full_name: firebaseUser.displayName || firebaseUser.email,
    role: 'admin',
    active: true,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await setDoc(doc(requireFirestore(), FIRESTORE_COLLECTIONS.users, firebaseUser.uid), profile, { merge: true });
  return profileFromFirebaseUser(firebaseUser, profile);
}

export function subscribeToAuthState(onUser, onError) {
  if (!isFirebaseDataSource()) {
    api.get('/auth/me')
      .then((data) => onUser(data.user))
      .catch(() => onUser(null));
    return () => {};
  }

  let unsubscribe = null;
  let cancelled = false;

  Promise.all([
    import('firebase/auth'),
    import('../lib/firebase.js'),
  ]).then(([{ onAuthStateChanged }, { requireFirebaseAuth }]) => {
    if (cancelled) return;

    unsubscribe = onAuthStateChanged(
      requireFirebaseAuth(),
      async (firebaseUser) => {
        if (!firebaseUser) {
          onUser(null);
          return;
        }

        const profile = await getUserProfile(firebaseUser.uid);
        if (!profile || profile.active === false) {
          onUser(null);
          return;
        }

        onUser(profileFromFirebaseUser(firebaseUser, profile));
      },
      onError,
    );
  }).catch(onError);

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

export async function loginUser(username, password) {
  if (!isFirebaseDataSource()) {
    const data = await api.post('/auth/login', { username, password });
    return data.user;
  }

  const [
    { browserLocalPersistence, setPersistence, signInWithEmailAndPassword, signOut },
    { requireFirebaseAuth },
  ] = await Promise.all([
    import('firebase/auth'),
    import('../lib/firebase.js'),
  ]);
  const auth = requireFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  const credential = await signInWithEmailAndPassword(auth, username, password);
  const profile = await getUserProfile(credential.user.uid);

  if (!profile) {
    return createBootstrapAdminProfile(credential.user);
  }

  if (profile.active === false) {
    await signOut(auth);
    throw new Error('Usuario inactivo.');
  }

  return profileFromFirebaseUser(credential.user, profile);
}

export async function logoutUser() {
  if (!isFirebaseDataSource()) {
    await api.post('/auth/logout', {});
    return;
  }

  const [{ signOut }, { requireFirebaseAuth }] = await Promise.all([
    import('firebase/auth'),
    import('../lib/firebase.js'),
  ]);
  await signOut(requireFirebaseAuth());
}
