import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
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
}

