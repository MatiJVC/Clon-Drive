# API del Clon Drive

Base: `http://localhost:3000`. Salvo `/auth/register`, `/auth/login` y `/health`, todo exige el header
`Authorization: Bearer <accessToken>`.

Errores: `400` datos inválidos · `401` sin token o token inválido · `403` sin permiso suficiente ·
`404` no existe o no tienes acceso · `409` conflicto (nombre repetido, archivo aún procesándose).

## Auth

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/auth/register` | `{ username, password }` | `{ accessToken, user: { id, username } }` |
| POST | `/auth/login` | `{ username, password }` | igual que register |
| GET | `/auth/me` | — | `{ id, username }` |

`username`: 3–30 caracteres (letras, números, `.` `_` `-`). `password`: mínimo 6.

## Navegar

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/drive` | Raíz del usuario |
| GET | `/drive?folderId=X` | Contenido de la carpeta X (propia o compartida) |
| GET | `/drive/shared` | `{ folders, files }` compartidos conmigo, cada uno con `permission` y `ownerUsername` |
| GET | `/drive/search?q=texto` | `{ folders, files }` cuyo nombre contiene el texto, propios o compartidos (también dentro de carpetas compartidas). Cada uno trae `access` y, si no es propio, `ownerUsername`. Máximo 50 de cada tipo |

`/drive` devuelve `{ folder, access, breadcrumb: [{ id, name }], folders: [...], files: [...] }`.
`access` es `OWNER`, `EDIT` o `READ` y sirve para mostrar u ocultar botones.

## Carpetas

| Método | Ruta | Body | Permiso |
|---|---|---|---|
| POST | `/folders` | `{ name, parentId? }` | dueño de `parentId` |
| PATCH | `/folders/:id` | `{ name }` | EDIT |
| DELETE | `/folders/:id` | — | EDIT (borra todo su contenido) |

## Archivos

| Método | Ruta | Body | Permiso |
|---|---|---|---|
| POST | `/files` | `multipart/form-data`: `file`, `folderId?` | dueño de la carpeta |
| GET | `/files/:id` | — | READ (sirve para consultar `status`) |
| GET | `/files/:id/download` | — | READ, solo si `status = READY` |
| GET | `/files/:id/preview` | — | READ, solo si `READY`. Devuelve `{ url, mimeType }`: una URL temporal (15 min) para la vista previa |
| GET | `/files/:id/stream?token=…` | — | Pública (el token va en la URL). Sirve el archivo `inline` y acepta `Range`, para `<video>`, `<audio>` e `<iframe>` |
| PATCH | `/files/:id` | `{ name }` | EDIT |
| DELETE | `/files/:id` | — | EDIT |
| POST | `/files/:id/cancel` | — | dueño, si aún no está `READY` |

Flujo de carga:
1. `POST /files` responde `202` con el archivo en `status: "PROCESSING"`. Ya está en S3 bajo `pending/` y hay un mensaje en la cola SQS.
2. El worker toma el mensaje, verifica el archivo y lo mueve a `files/<dueño>/<id>`. Queda `READY`. Si falla 3 veces queda `FAILED` y el mensaje pasa a la DLQ.
3. El frontend consulta `GET /files/:id` cada ~1 s hasta ver `READY`.

Cancelar:
- Mientras el navegador todavía envía el archivo, basta con abortar la petición (`AbortController` o `xhr.abort()`). El backend no registra nada.
- Si ya respondió `202` pero sigue `PROCESSING`, se usa `POST /files/:id/cancel`.

Tamaño máximo: `MAX_UPLOAD_MB` (500 por defecto). Con `WORKER_DELAY_MS=3000` el worker espera 3 s antes de procesar cada archivo, para que en la demo se alcance a ver el estado `PROCESSING`.

Vista previa:
- `<video>`, `<audio>` e `<iframe>` no pueden enviar el header `Authorization`, por eso `GET /files/:id/preview` entrega una URL con un token que dura 15 minutos y solo sirve para leer ese archivo. No funciona como token de sesión.
- El permiso se vuelve a revisar en cada petición: si dejan de compartir el archivo, el enlace deja de funcionar.
- HTML, SVG, XML y JavaScript se entregan como texto plano y aislados, para que no ejecuten código en el navegador.

## Compartir

| Método | Ruta | Body | Quién |
|---|---|---|---|
| POST | `/shares` | `{ username, permission: "READ" \| "EDIT", fileId \| folderId }` | dueño. Si ya estaba compartido, actualiza el permiso |
| GET | `/shares?fileId=X` o `?folderId=X` | — | dueño: lista `{ id, username, permission }` |
| PATCH | `/shares/:id` | `{ permission }` | dueño |
| DELETE | `/shares/:id` | — | dueño, o quien lo recibió (para dejar de verlo) |
| GET | `/users/search?q=abc` | — | usuarios cuyo nombre empieza con `abc` (para autocompletar) |

Compartir una carpeta da el mismo permiso sobre todo su contenido, incluidas las subcarpetas.
`READ` permite ver y descargar. `EDIT` además permite renombrar y eliminar.
Solo el dueño puede subir archivos, crear subcarpetas y compartir.
