import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { AccessService } from '../access/access.service.js';
import { StorageService } from '../aws/storage.service.js';
import { isUniqueViolation } from '../common/db-errors.js';
import { DB, type Database } from '../db/database.module.js';
import { folders } from '../db/schema.js';

const DUPLICATE = 'Ya existe una carpeta con ese nombre en esta ubicación';

@Injectable()
export class FoldersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: AccessService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, name: string, parentId?: string) {
    // Solo el dueño crea subcarpetas dentro de sus carpetas.
    if (parentId) await this.access.requireFolder(userId, parentId, 'OWNER');
    try {
      const [folder] = await this.db
        .insert(folders)
        .values({ name, ownerId: userId, parentId: parentId ?? null })
        .returning();
      return folder;
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(DUPLICATE);
      throw e;
    }
  }

  async rename(userId: string, folderId: string, name: string) {
    await this.access.requireFolder(userId, folderId, 'EDIT');
    try {
      const [folder] = await this.db
        .update(folders)
        .set({ name })
        .where(eq(folders.id, folderId))
        .returning();
      return folder;
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(DUPLICATE);
      throw e;
    }
  }

  // Borra la carpeta, sus subcarpetas y sus archivos (en S3 y en la BD).
  async remove(userId: string, folderId: string) {
    await this.access.requireFolder(userId, folderId, 'EDIT');
    const res = await this.db.execute<{ s3_key: string }>(sql`
      WITH RECURSIVE tree AS (
        SELECT id FROM folders WHERE id = ${folderId}
        UNION ALL
        SELECT f.id FROM folders f JOIN tree ON f.parent_id = tree.id
      )
      SELECT s3_key FROM files WHERE folder_id IN (SELECT id FROM tree)
    `);
    await this.storage.deleteMany(res.rows.map((r) => r.s3_key));
    // ON DELETE CASCADE elimina subcarpetas, archivos y comparticiones.
    await this.db.delete(folders).where(eq(folders.id, folderId));
  }
}
