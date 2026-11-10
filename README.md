# Clon Drive — Taller 2 Cloud Computing

## Servicios (`docker-compose.yml`)

| Servicio | Rol | Puerto |
|---|---|---|
| `localstack` | AWS simulado: S3 guarda los archivos, SQS encola las cargas | 4566 |
| `terraform` | Crea el bucket y las colas en LocalStack y termina | — |
| `postgres` | Usuarios, carpetas, metadatos de archivos y permisos | 5432 |
| `backend` | API NestJS; aplica las migraciones de la BD al arrancar | 3000 |

## Levantar todo

Crear un `.env` en la raíz del repo con las credenciales dada por los contribuidores.

```bash
docker compose up -d --build
curl http://localhost:3000/health
# {"status":"ok","checks":{"database":"ok","s3":"ok","sqs":"ok"}}
```

`docker compose logs -f backend` muestra los logs de la API.

## Desarrollar el backend fuera de Docker

```bash
docker compose up -d localstack terraform postgres
cd backend          # requiere backend/.env 
npm install
npm run start:dev
```

Crear en backend/ otro .env con las variables dadas por los contribuidores


## Base de datos

- El esquema está en `backend/src/db/schema.ts` (Drizzle ORM).
- Después de cambiarlo: `npm run db:generate` crea una migración nueva en `backend/drizzle/`. Hay que subirla al repo; el backend la aplica solo al iniciar.
- `npm run db:studio` abre un visor de la base de datos en el navegador.

Tablas: `users`, `folders` (árbol con `parent_id`), `files` (con `status` del flujo de carga con cola) y `shares` (permiso `READ` o `EDIT` sobre un archivo o una carpeta, hacia otro usuario por su `username`).
