import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { AccessService } from '../access/access.service.js';
import { DB, type Database } from '../db/database.module.js';
import { files, folders, shares, users } from '../db/schema.js';

// Columnas de un archivo que se devuelven al frontend (sin la key de S3).
export const fileColumns = {
  id: files.id,
  name: files.name,
  mimeType: files.mimeType,
  size: files.size,
  status: files.status,
  ownerId: files.ownerId,
  folderId: files.folderId,
  createdAt: files.createdAt,
  updatedAt: files.updatedAt,
};

@Injectable()
export class DriveService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: AccessService,
  ) {}

  // Contenido de una carpeta (o de la raíz del usuario si folderId es undefined).
  async list(userId: string, folderId?: string) {
    if (!folderId) {
      return {
        folder: null,
        access: 'OWNER' as const,
        breadcrumb: [],
        folders: await this.db
          .select()
          .from(folders)
          .where(and(eq(folders.ownerId, userId), isNull(folders.parentId)))
          .orderBy(asc(folders.name)),
        files: await this.db
          .select(fileColumns)
          .from(files)
          .where(
            and(
              eq(files.ownerId, userId),
              isNull(files.folderId),
              ne(files.status, 'CANCELLED'),
            ),
          )
          .orderBy(asc(files.name)),
      };
    }

    const { access, breadcrumb } = await this.access.requireFolder(
      userId,
      folderId,
      'READ',
    );
    const folder = await this.db.query.folders.findFirst({
      where: eq(folders.id, folderId),
    });
    return {
      folder,
      access,
      breadcrumb,
      folders: await this.db
        .select()
        .from(folders)
        .where(eq(folders.parentId, folderId))
        .orderBy(asc(folders.name)),
      // El dueño ve también los archivos que aún se están procesando;
      // los demás solo ven los que ya están listos.
      files: await this.db
        .select(fileColumns)
        .from(files)
        .where(
          and(
            eq(files.folderId, folderId),
            access === 'OWNER'
              ? ne(files.status, 'CANCELLED')
              : eq(files.status, 'READY'),
          ),
        )
        .orderBy(asc(files.name)),
    };
  }

  // Carpetas y archivos que otros usuarios compartieron directamente conmigo.
  async sharedWithMe(userId: string) {
    const sharedFolders = await this.db
      .select({
        folder: folders,
        permission: shares.permission,
        ownerUsername: users.username,
      })
      .from(shares)
      .innerJoin(folders, eq(folders.id, shares.folderId))
      .innerJoin(users, eq(users.id, folders.ownerId))
      .where(eq(shares.sharedWithId, userId))
      .orderBy(asc(folders.name));

    const sharedFiles = await this.db
      .select({
        file: fileColumns,
        permission: shares.permission,
        ownerUsername: users.username,
      })
      .from(shares)
      .innerJoin(files, eq(files.id, shares.fileId))
      .innerJoin(users, eq(users.id, files.ownerId))
      .where(and(eq(shares.sharedWithId, userId), eq(files.status, 'READY')))
      .orderBy(asc(files.name));

    return {
      folders: sharedFolders.map(({ folder, ...rest }) => ({ ...folder, ...rest })),
      files: sharedFiles.map(({ file, ...rest }) => ({ ...file, ...rest })),
    };
  }

  // Busca por nombre en todo lo que el usuario puede ver: lo propio y lo que
  // le compartieron (directamente o dentro de una carpeta compartida).
  async search(userId: string, q: string) {
    const term = q.trim();
    if (!term) return { folders: [], files: [] };
    const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;

    // Carpetas accesibles por compartición (y todas sus subcarpetas),
    // con el mejor permiso que el usuario tenga sobre cada una.
    const sharedTree = sql`
      WITH RECURSIVE acc AS (
        SELECT f.id, s.permission::text AS perm
        FROM shares s JOIN folders f ON f.id = s.folder_id
        WHERE s.shared_with_id = ${userId}
        UNION ALL
        SELECT c.id, acc.perm FROM folders c JOIN acc ON c.parent_id = acc.id
      ),
      acc_best AS (
        SELECT id, CASE WHEN bool_or(perm = 'EDIT') THEN 'EDIT' ELSE 'READ' END AS perm
        FROM acc GROUP BY id
      )`;

    const folderRows = await this.db.execute<SearchFolderRow>(sql`
      ${sharedTree}
      SELECT f.id, f.name, f.owner_id, f.parent_id, f.created_at, f.updated_at,
             u.username AS owner_username,
             CASE WHEN f.owner_id = ${userId} THEN 'OWNER' ELSE ab.perm END AS access
      FROM folders f
      JOIN users u ON u.id = f.owner_id
      LEFT JOIN acc_best ab ON ab.id = f.id
      WHERE (f.owner_id = ${userId} OR ab.id IS NOT NULL)
        AND f.name ILIKE ${pattern}
      ORDER BY f.name
      LIMIT 50`);

    const fileRows = await this.db.execute<SearchFileRow>(sql`
      ${sharedTree}
      SELECT fi.id, fi.name, fi.mime_type, fi.size, fi.status, fi.owner_id, fi.folder_id,
             fi.created_at, fi.updated_at, u.username AS owner_username,
             CASE
               WHEN fi.owner_id = ${userId} THEN 'OWNER'
               WHEN ds.permission = 'EDIT' OR ab.perm = 'EDIT' THEN 'EDIT'
               ELSE 'READ'
             END AS access
      FROM files fi
      JOIN users u ON u.id = fi.owner_id
      LEFT JOIN shares ds ON ds.file_id = fi.id AND ds.shared_with_id = ${userId}
      LEFT JOIN acc_best ab ON ab.id = fi.folder_id
      WHERE (fi.owner_id = ${userId} OR ds.id IS NOT NULL OR ab.id IS NOT NULL)
        AND fi.name ILIKE ${pattern}
        AND (fi.status = 'READY' OR (fi.owner_id = ${userId} AND fi.status <> 'CANCELLED'))
      ORDER BY fi.name
      LIMIT 50`);

    const owner = (r: { owner_id: string; owner_username: string }) =>
      r.owner_id === userId ? {} : { ownerUsername: r.owner_username };
    return {
      folders: folderRows.rows.map((r) => ({
        id: r.id,
        name: r.name,
        ownerId: r.owner_id,
        parentId: r.parent_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        access: r.access,
        ...owner(r),
      })),
      files: fileRows.rows.map((r) => ({
        id: r.id,
        name: r.name,
        mimeType: r.mime_type,
        size: Number(r.size),
        status: r.status,
        ownerId: r.owner_id,
        folderId: r.folder_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        access: r.access,
        ...owner(r),
      })),
    };
  }
}

type Access = 'OWNER' | 'EDIT' | 'READ';
interface SearchFolderRow {
  id: string;
  name: string;
  owner_id: string;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
  owner_username: string;
  access: Access;
  [key: string]: unknown;
}
interface SearchFileRow {
  id: string;
  name: string;
  mime_type: string;
  size: string | number;
  status: string;
  owner_id: string;
  folder_id: string | null;
  created_at: Date;
  updated_at: Date;
  owner_username: string;
  access: Access;
  [key: string]: unknown;
}
