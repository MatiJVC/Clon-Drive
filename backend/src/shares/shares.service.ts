import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { AccessService } from '../access/access.service.js';
import { DB, type Database } from '../db/database.module.js';
import { shares, users } from '../db/schema.js';
import type { CreateShareDto } from './shares.dto.js';

type Target = { fileId?: string; folderId?: string };

@Injectable()
export class SharesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: AccessService,
  ) {}

  // Solo el dueño puede compartir. Si ya estaba compartido con ese usuario,
  // se actualiza el permiso.
  async share(ownerId: string, dto: CreateShareDto) {
    const target = await this.requireOwnedTarget(ownerId, dto);

    const user = await this.db.query.users.findFirst({
      where: eq(users.username, dto.username),
    });
    if (!user) throw new NotFoundException(`No existe el usuario "${dto.username}"`);
    if (user.id === ownerId)
      throw new BadRequestException('No puedes compartir contigo mismo');

    const [share] = await this.db
      .insert(shares)
      .values({
        ...target,
        permission: dto.permission,
        sharedWithId: user.id,
        sharedById: ownerId,
      })
      .onConflictDoUpdate({
        target: target.fileId
          ? [shares.fileId, shares.sharedWithId]
          : [shares.folderId, shares.sharedWithId],
        set: { permission: dto.permission },
      })
      .returning();
    return { ...share, username: user.username };
  }

  // Con quién está compartido un archivo o carpeta (solo el dueño lo ve).
  async list(ownerId: string, query: Target) {
    const target = await this.requireOwnedTarget(ownerId, query);
    return this.db
      .select({
        id: shares.id,
        permission: shares.permission,
        username: users.username,
        createdAt: shares.createdAt,
      })
      .from(shares)
      .innerJoin(users, eq(users.id, shares.sharedWithId))
      .where(
        target.fileId
          ? eq(shares.fileId, target.fileId)
          : eq(shares.folderId, target.folderId!),
      )
      .orderBy(asc(users.username));
  }

  async update(userId: string, shareId: string, permission: 'READ' | 'EDIT') {
    const share = await this.find(shareId);
    if (share.sharedById !== userId)
      throw new ForbiddenException('Solo el dueño puede cambiar el permiso');
    const [updated] = await this.db
      .update(shares)
      .set({ permission })
      .where(eq(shares.id, shareId))
      .returning();
    return updated;
  }

  // Lo puede quitar el dueño, o quien lo recibió (para dejar de verlo).
  async remove(userId: string, shareId: string) {
    const share = await this.find(shareId);
    if (share.sharedById !== userId && share.sharedWithId !== userId)
      throw new NotFoundException('Compartición no encontrada');
    await this.db.delete(shares).where(eq(shares.id, shareId));
  }

  private async find(shareId: string) {
    const share = await this.db.query.shares.findFirst({
      where: eq(shares.id, shareId),
    });
    if (!share) throw new NotFoundException('Compartición no encontrada');
    return share;
  }

  private async requireOwnedTarget(userId: string, t: Target): Promise<Target> {
    if (!!t.fileId === !!t.folderId)
      throw new BadRequestException('Indica fileId o folderId (solo uno)');
    if (t.fileId) {
      await this.access.requireFile(userId, t.fileId, 'OWNER');
      return { fileId: t.fileId };
    }
    await this.access.requireFolder(userId, t.folderId!, 'OWNER');
    return { folderId: t.folderId };
  }
}
