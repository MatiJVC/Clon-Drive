import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DB, type Database } from '../db/database.module.js';
import { files, type DriveFile } from '../db/schema.js';

// Nivel de acceso de un usuario sobre una carpeta o archivo.
//  OWNER  es el dueño: puede todo (subir, crear subcarpetas, compartir)
//  EDIT   compartido con edición: ver, descargar, renombrar y eliminar
//  READ   compartido solo lectura: ver y descargar
export type Access = 'OWNER' | 'EDIT' | 'READ';
const RANK: Record<Access, number> = { READ: 1, EDIT: 2, OWNER: 3 };

export const atLeast = (have: Access | null, need: Access) =>
  have !== null && RANK[have] >= RANK[need];

const best = (a: Access | null, b: Access | null): Access | null =>
  !a ? b : !b ? a : RANK[a] >= RANK[b] ? a : b;

interface AncestorRow {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  depth: number;
  shared: 'READ' | 'EDIT' | null; // permiso compartido al usuario en ESA carpeta
  [key: string]: unknown;
}

@Injectable()
export class AccessService {
  constructor(@Inject(DB) private readonly db: Database) {}

  // Carpeta y todos sus ancestros (depth 0 = la carpeta misma), con el permiso
  // que el usuario tenga compartido directamente en cada una.
  private async ancestors(folderId: string, userId: string) {
    const res = await this.db.execute<AncestorRow>(sql`
      WITH RECURSIVE anc AS (
        SELECT id, name, parent_id, owner_id, 0 AS depth
        FROM folders WHERE id = ${folderId}
        UNION ALL
        SELECT f.id, f.name, f.parent_id, f.owner_id, anc.depth + 1
        FROM folders f JOIN anc ON f.id = anc.parent_id
      )
      SELECT anc.*, s.permission AS shared
      FROM anc
      LEFT JOIN shares s ON s.folder_id = anc.id AND s.shared_with_id = ${userId}
      ORDER BY anc.depth DESC
    `);
    return res.rows; // ordenadas de la raíz hacia la carpeta
  }

  // Compartir una carpeta da acceso a todo lo que contiene,
  // así que se toma el mejor permiso entre la carpeta y sus ancestros.
  async folder(userId: string, folderId: string) {
    const chain = await this.ancestors(folderId, userId);
    if (chain.length === 0) throw new NotFoundException('Carpeta no encontrada');

    const ownerId = chain[0].owner_id;
    let access: Access | null = null;
    let breadcrumb = chain;
    if (ownerId === userId) {
      access = 'OWNER';
    } else {
      for (const row of chain) access = best(access, row.shared);
      // Para quien recibió la carpeta compartida, la ruta parte en la
      // carpeta compartida más alta (no ve las carpetas del dueño por encima).
      const firstShared = chain.findIndex((r) => r.shared !== null);
      breadcrumb = firstShared >= 0 ? chain.slice(firstShared) : [];
    }
    return {
      access,
      ownerId,
      breadcrumb: breadcrumb.map((r) => ({ id: r.id, name: r.name })),
    };
  }

  async file(userId: string, fileId: string) {
    const file = await this.db.query.files.findFirst({
      where: eq(files.id, fileId),
    });
    if (!file) throw new NotFoundException('Archivo no encontrado');
    if (file.ownerId === userId) return { file, access: 'OWNER' as Access };

    const direct = await this.db.query.shares.findFirst({
      where: (s, { and, eq }) =>
        and(eq(s.fileId, fileId), eq(s.sharedWithId, userId)),
    });
    let access: Access | null = direct?.permission ?? null;
    if (file.folderId)
      access = best(access, (await this.folder(userId, file.folderId)).access);
    return { file, access };
  }

  // Lanza 404 si no tiene ningún acceso y 403 si tiene menos del necesario.
  async requireFolder(userId: string, folderId: string, need: Access) {
    const result = await this.folder(userId, folderId);
    this.check(result.access, need, 'Carpeta no encontrada');
    return result as typeof result & { access: Access };
  }

  async requireFile(
    userId: string,
    fileId: string,
    need: Access,
  ): Promise<{ file: DriveFile; access: Access }> {
    const result = await this.file(userId, fileId);
    this.check(result.access, need, 'Archivo no encontrado');
    return result as { file: DriveFile; access: Access };
  }

  private check(have: Access | null, need: Access, notFound: string) {
    if (have === null) throw new NotFoundException(notFound);
    if (!atLeast(have, need))
      throw new ForbiddenException(
        need === 'OWNER'
          ? 'Solo el dueño puede hacer esto'
          : 'No tienes permiso de edición',
      );
  }
}
