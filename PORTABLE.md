# Uso portable sin internet

Esta aplicacion esta pensada para Windows y puede correr en una PC sin internet si la carpeta se copia completa.

## Preparar el paquete

En la PC de desarrollo:

```bat
npm install
npm run migrate
npm run seed
npm run build
```

Luego copia al pendrive la carpeta `consultorio-dolor` completa, incluyendo:

- `node-portable\`
- `node_modules\`
- `backend\`
- `frontend\`
- `package.json`
- `package-lock.json`
- `INICIAR.bat`
- `APAGAR.bat`

El frontend compilado debe existir en `backend\public\index.html`.

## Instalar en la PC del consultorio

1. Copia la carpeta `consultorio-dolor` desde el pendrive a una carpeta local de la PC, por ejemplo `C:\ConsultorioDolor`.
2. Ejecuta `INICIAR.bat`.
3. Se abrira `http://localhost:3000` en el navegador.
4. Para cerrar la app, ejecuta `APAGAR.bat`.

Se recomienda usar la app desde el disco local de la PC, no directamente desde el pendrive. SQLite puede funcionar desde USB, pero es mas lento y aumenta el riesgo de perdida de datos si se desconecta.

## Datos y respaldo

La base de datos queda en:

```text
backend\data\consultorio.db
```

Para mover la app a otra PC, cierra primero con `APAGAR.bat` y copia tambien:

- `backend\data\consultorio.db`
- `backend\data\consultorio.db-wal`, si existe
- `backend\data\consultorio.db-shm`, si existe

Tambien puedes usar el boton de backup del panel de administracion.

## Importante

- La PC no necesita tener Node.js instalado.
- La PC no necesita internet.
- No borres `node-portable` ni `node_modules`.
- Cambia la clave del usuario `admin` despues del primer inicio.
