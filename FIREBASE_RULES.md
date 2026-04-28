# Firestore Rules (Draft)

Reglas base para despliegue en GitHub Pages con Firebase Auth activo y roles en `users/{uid}`.

## Estructura esperada de usuario

Documento en `users/{uid}`:

- `role`: `admin` | `medico` | `secretaria`
- `active`: `true | false`

## Reglas sugeridas

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function isActiveUser() {
      return isSignedIn()
        && userDoc().exists()
        && userDoc().data.active == true;
    }

    function roleIs(role) {
      return isActiveUser() && userDoc().data.role == role;
    }

    function roleIn(roles) {
      return isActiveUser() && userDoc().data.role in roles;
    }

    match /users/{uid} {
      allow read: if isSignedIn() && request.auth.uid == uid;
      allow create: if isSignedIn() && request.auth.uid == uid;
      allow update, delete: if roleIs('admin');
    }

    match /clinic_settings/{docId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico']);
    }

    match /patients/{patientId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico', 'secretaria']);
    }

    match /appointments/{appointmentId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico', 'secretaria']);
    }

    match /consultations/{consultationId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico']);
    }

    match /historias_clinicas/{historiaId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico']);
    }

    match /procedures/{procedureId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico']);
    }

    match /medications/{medicationId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico']);
    }

    match /medication_titrations/{titrationId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico']);
    }

    match /budgets/{budgetId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico', 'secretaria']);
    }

    match /invoices/{invoiceId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico', 'secretaria']);
    }

    match /payments/{paymentId} {
      allow read: if isActiveUser();
      allow write: if roleIn(['admin', 'medico', 'secretaria']);
    }
  }
}
```
