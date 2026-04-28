# Consultorio de Dolor

Aplicacion web para gestion de un consultorio de terapia del dolor.

## Estado

La aplicacion actual funciona localmente con:

- Frontend: React, Vite y Tailwind CSS.
- Backend local: Node, Express y SQLite.
- Autenticacion local: sesiones de Express y `bcryptjs`.

El objetivo del refactor es llevar el proyecto a una arquitectura publicable en GitHub Pages, con React hablando directamente con Firebase como base de datos externa. No se usara Firebase Auth por ahora; los usuarios se manejaran con el sistema propio.

## Desarrollo Local

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

Servicios locales actuales:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

## Refactor

Principios para el trabajo:

- Un archivo, una responsabilidad.
- Separar paginas, componentes, hooks, servicios de datos y utilidades.
- Evitar llamadas directas a `/api` dentro de componentes nuevos.
- Mantener el backend local solo mientras sirva durante la migracion.
- No versionar bases SQLite, builds, `node_modules` ni runtime portable.

## Variables de Entorno

Usar `.env.example` como plantilla. Los archivos `.env` reales no se versionan.
