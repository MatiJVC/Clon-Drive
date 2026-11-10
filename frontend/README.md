# Frontend — Clon Drive

Base React de la fase 1, conectable a la API NestJS real.

## Desarrollo

```bash
cp .env.example .env
npm install
npm run dev
```

La API debe estar disponible en `VITE_API_URL` (por defecto `http://localhost:3000`).

## Verificación

```bash
npm run typecheck
npm run lint
npm run build
```

## Contenedor

Las variables `VITE_*` se incrustan durante la compilación. Construir indicando la URL que usará el navegador:

```bash
docker build --build-arg VITE_API_URL=http://localhost:3000 -t clon-drive-frontend ./frontend
docker run --rm -p 8080:80 clon-drive-frontend
```

Al integrarlo en Compose, la URL no debe ser `http://backend:3000`: ese nombre solo existe dentro de la red Docker y no es resoluble por el navegador. El origen servido deberá añadirse también a `CORS_ORIGIN` del backend en una fase de infraestructura posterior.

## Descargas

Las descargas autenticadas se solicitan con Axios como `Blob`, se guardan con el nombre indicado por `Content-Disposition` y liberan su Object URL después de iniciar la descarga. Este enfoque mantiene el JWT fuera de la URL, pero requiere conservar temporalmente el archivo completo en memoria; para archivos muy grandes sería preferible un mecanismo de streaming o una URL firmada proporcionada por el backend.
