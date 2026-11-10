import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { and, eq, inArray } from 'drizzle-orm';
import { AccessService } from '../access/access.service.js';
import { StorageService } from '../aws/storage.service.js';
import { DB, type Database } from '../db/database.module.js';
import { files } from '../db/schema.js';
import { fileColumns } from '../drive/drive.service.js';

export const pendingKey = (fileId: string) => `pending/${fileId}`;
export const finalKey = (ownerId: string, fileId: string) =>
  `files/${ownerId}/${fileId}`;

export interface UploadedTmpFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: AccessService,
    private readonly storage: StorageService,
  ) {}

  // Paso 1 del flujo de carga (el paso 2 lo hace UploadWorker):
  //  - registra el archivo en la BD (PENDING)
  //  - lo sube a S3 bajo pending/<id>
  //  - lo marca PROCESSING y publica un mensaje en la cola SQS
  async upload(userId: string, tmp: UploadedTmpFile, folderId?: string) {
    try {
      if (folderId) await this.access.requireFolder(userId, folderId, 'OWNER');

      const id = randomUUID();
      const name = decodeName(tmp.originalname);
      const mimeType = tmp.mimetype || 'application/octet-stream';
      await this.db.insert(files).values({
        id,
        name,
        mimeType,
        size: tmp.size,
        s3Key: pendingKey(id),
        status: 'PENDING',
        ownerId: userId,
        folderId: folderId ?? null,
      });

      try {
        await this.storage.put(
          pendingKey(id),
          createReadStream(tmp.path),
          tmp.size,
          mimeType,
        );
        await this.db
          .update(files)
          .set({ status: 'PROCESSING' })
          .where(eq(files.id, id));
        await this.storage.enqueue({ fileId: id });
      } catch (e) {
        await this.db.delete(files).where(eq(files.id, id));
        await this.storage.delete(pendingKey(id)).catch(() => undefined);
        throw e;
      }
      return this.get(id);
    } finally {
      await unlink(tmp.path).catch(() => undefined);
    }
  }

  async details(userId: string, fileId: string) {
    const { access } = await this.access.requireFile(userId, fileId, 'READ');
    return { ...(await this.get(fileId)), access };
  }

  async download(userId: string, fileId: string) {
    const { file } = await this.access.requireFile(userId, fileId, 'READ');
    if (file.status !== 'READY')
      throw new ConflictException('El archivo todavía se está procesando');
    const obj = await this.storage.get(file.s3Key);
    return { file, body: obj.Body as Readable };
  }

  async rename(userId: string, fileId: string, name: string) {
    await this.access.requireFile(userId, fileId, 'EDIT');
    await this.db.update(files).set({ name }).where(eq(files.id, fileId));
    return this.get(fileId);
  }

  async remove(userId: string, fileId: string) {
    const { file } = await this.access.requireFile(userId, fileId, 'EDIT');
    await this.db.delete(files).where(eq(files.id, fileId));
    await this.storage.delete(file.s3Key).catch((e) =>
      this.logger.warn(`No se pudo borrar ${file.s3Key} de S3: ${e}`),
    );
  }

  // Cancela un archivo que aún no termina de procesarse.
  // (Si se cancela mientras el navegador todavía lo está enviando, basta con
  // abortar la petición: el backend nunca llega a registrarlo.)
  async cancel(userId: string, fileId: string) {
    await this.access.requireFile(userId, fileId, 'OWNER');
    const updated = await this.db
      .update(files)
      .set({ status: 'CANCELLED' })
      .where(
        and(eq(files.id, fileId), inArray(files.status, ['PENDING', 'PROCESSING'])),
      )
      .returning({ id: files.id });
    if (updated.length === 0)
      throw new BadRequestException('El archivo ya terminó de procesarse');
    await this.storage.delete(pendingKey(fileId)).catch(() => undefined);
    return this.get(fileId);
  }

  private async get(fileId: string) {
    const [file] = await this.db
      .select(fileColumns)
      .from(files)
      .where(eq(files.id, fileId));
    return file;
  }
}

// Multer entrega el nombre en latin1; si en realidad venía en UTF-8
// (ñ, tildes) se recupera aquí.
function decodeName(name: string) {
  const utf8 = Buffer.from(name, 'latin1').toString('utf8');
  return utf8.includes('�') ? name : utf8;
}
