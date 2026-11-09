// Modelo de datos del Clon Drive.
// S3 (LocalStack) guarda el contenido de los archivos; PostgreSQL guarda
// usuarios, carpetas, metadatos de archivos y permisos de compartición.
// Después de modificar este archivo: `npm run db:generate` crea la migración.
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Estado de un archivo dentro del flujo de carga con cola (SQS).
//  PENDING    registro creado, el archivo aún se está subiendo
//  PROCESSING subido a S3 bajo pending/, mensaje enviado a la cola
//  READY      el worker lo validó y lo movió a su ruta final
//  FAILED     el worker no pudo procesarlo (el mensaje terminó en la DLQ)
//  CANCELLED  el usuario canceló la carga
export const fileStatus = pgEnum('file_status', [
  'PENDING',
  'PROCESSING',
  'READY',
  'FAILED',
  'CANCELLED',
]);

// Nivel de acceso al compartir (requisito 7).
//  READ  ver y descargar
//  EDIT  además renombrar y eliminar
export const permission = pgEnum('permission', ['READ', 'EDIT']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Nombre único con el que se comparte (requisito 8).
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamps.createdAt,
});

export const folders = pgTable(
  'folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // null = carpeta en la raíz del usuario
    parentId: uuid('parent_id').references((): AnyPgColumn => folders.id, {
      onDelete: 'cascade',
    }),
    ...timestamps,
  },
  (t) => [
    // No se repite el nombre dentro de una misma carpeta.
    // NULLS NOT DISTINCT hace que también aplique en la raíz.
    unique('folders_owner_parent_name_uq')
      .on(t.ownerId, t.parentId, t.name)
      .nullsNotDistinct(),
    index('folders_parent_idx').on(t.parentId),
  ],
);

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    mimeType: text('mime_type').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    s3Key: text('s3_key').notNull().unique(),
    status: fileStatus('status').notNull().default('PENDING'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // null = archivo en la raíz del usuario
    folderId: uuid('folder_id').references(() => folders.id, {
      onDelete: 'cascade',
    }),
    ...timestamps,
  },
  (t) => [index('files_owner_folder_idx').on(t.ownerId, t.folderId)],
);

// Un registro de compartición apunta a un archivo O a una carpeta, nunca a
// ambos. Compartir una carpeta da el mismo permiso sobre todo su contenido.
export const shares = pgTable(
  'shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    permission: permission('permission').notNull().default('READ'),
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id').references(() => folders.id, {
      onDelete: 'cascade',
    }),
    sharedWithId: uuid('shared_with_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sharedById: uuid('shared_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    check(
      'shares_exactly_one_target',
      sql`(${t.fileId} IS NULL) <> (${t.folderId} IS NULL)`,
    ),
    uniqueIndex('shares_file_user_uq').on(t.fileId, t.sharedWithId),
    uniqueIndex('shares_folder_user_uq').on(t.folderId, t.sharedWithId),
    index('shares_shared_with_idx').on(t.sharedWithId),
  ],
);

export type User = typeof users.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type DriveFile = typeof files.$inferSelect;
export type Share = typeof shares.$inferSelect;
