# Consultorio de Dolor

Aplicacion web para gestion de un consultorio de terapia del dolor.

## Estado

La aplicacion actual funciona localmente con:

- Frontend: React, Vite y Tailwind CSS.
- Backend local: Node, Express y SQLite.
- Autenticacion local: sesiones de Express y `bcryptjs`.

El objetivo del refactor es llevar el proyecto a una arquitectura publicable en GitHub Pages, con React hablando directamente con Firebase como base de datos externa y autenticacion con Firebase Auth.

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

## Deploy a GitHub Pages

El workflow vive en `.github/workflows/deploy-pages.yml` y se ejecuta en cada push a `main`.

Requisitos:

- Activar GitHub Pages en el repositorio usando **GitHub Actions** como source.
- Definir variables `VITE_...` en tiempo de build si no van versionadas.

Build local de Pages (opcional):

```bash
npm run build:pages -w frontend
```
