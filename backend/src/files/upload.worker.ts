import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from '@aws-sdk/client-sqs';
import { and, eq } from 'drizzle-orm';
import { setTimeout as sleep } from 'node:timers/promises';
import { AWS_CONFIG, type AwsConfig } from '../aws/aws.config.js';
import { StorageService } from '../aws/storage.service.js';
import { DB, type Database } from '../db/database.module.js';
import { files } from '../db/schema.js';
import { finalKey, pendingKey } from './files.service.js';

const MAX_RECEIVES = 3; // igual que maxReceiveCount de la DLQ en Terraform

// Paso 2 del flujo de carga: consume la cola SQS y, por cada archivo,
// verifica que llegó completo a S3, lo mueve de pending/ a files/<dueño>/
// y lo marca READY. Si falla 3 veces queda FAILED y el mensaje pasa a la DLQ.
@Injectable()
export class UploadWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(UploadWorker.name);
  private running = false;
  private loop?: Promise<void>;
  private readonly delayMs = Number(process.env.WORKER_DELAY_MS ?? 0);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(SQSClient) private readonly sqs: SQSClient,
    @Inject(AWS_CONFIG) private readonly cfg: AwsConfig,
    private readonly storage: StorageService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.WORKER_ENABLED === 'false') return;
    this.running = true;
    this.loop = this.poll();
    this.logger.log('Worker de cargas escuchando la cola SQS');
  }

  async onApplicationShutdown() {
    this.running = false;
    await this.loop;
  }

  private async poll() {
    while (this.running) {
      try {
        const res = await this.sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: this.cfg.queueUrl,
            MaxNumberOfMessages: 5,
            WaitTimeSeconds: 5,
            MessageSystemAttributeNames: ['ApproximateReceiveCount'],
          }),
        );
        for (const msg of res.Messages ?? []) await this.handle(msg);
      } catch (e) {
        this.logger.error(`Error leyendo la cola: ${e}`);
        await sleep(5000);
      }
    }
  }

  private async handle(msg: Message) {
    const receives = Number(msg.Attributes?.ApproximateReceiveCount ?? 1);
    let fileId: string | undefined;
    try {
      fileId = (JSON.parse(msg.Body ?? '{}') as { fileId?: string }).fileId;
      if (fileId) await this.process(fileId);
      await this.ack(msg);
    } catch (e) {
      this.logger.error(`Falló el archivo ${fileId} (intento ${receives}): ${e}`);
      // Sin ack: SQS lo reintenta. Al último intento se marca FAILED.
      if (fileId && receives >= MAX_RECEIVES)
        await this.db
          .update(files)
          .set({ status: 'FAILED' })
          .where(and(eq(files.id, fileId), eq(files.status, 'PROCESSING')))
          .catch(() => undefined);
    }
  }

  private async process(fileId: string) {
    const file = await this.db.query.files.findFirst({
      where: eq(files.id, fileId),
    });
    // Eliminado o cancelado mientras esperaba en la cola: solo limpiar.
    if (!file || file.status !== 'PROCESSING') {
      await this.storage.delete(pendingKey(fileId)).catch(() => undefined);
      return;
    }

    if (this.delayMs > 0) await sleep(this.delayMs); // para la demo

    let head;
    try {
      head = await this.storage.head(pendingKey(fileId));
    } catch (e) {
      // Si lo cancelaron durante la espera, el objeto ya no existe: no es error.
      if (!(await this.stillProcessing(fileId))) return;
      throw e;
    }
    if (head.ContentLength !== file.size)
      throw new Error(
        `Tamaño en S3 (${head.ContentLength}) distinto al esperado (${file.size})`,
      );

    const target = finalKey(file.ownerId, fileId);
    await this.storage.copy(pendingKey(fileId), target);
    const done = await this.db
      .update(files)
      .set({ status: 'READY', s3Key: target })
      .where(and(eq(files.id, fileId), eq(files.status, 'PROCESSING')))
      .returning({ id: files.id });
    await this.storage.delete(pendingKey(fileId));

    // Lo cancelaron o borraron justo mientras se copiaba.
    if (done.length === 0) await this.storage.delete(target);
    else this.logger.log(`Archivo listo: ${file.name} (${fileId})`);
  }

  private async stillProcessing(fileId: string) {
    const row = await this.db.query.files.findFirst({
      where: eq(files.id, fileId),
      columns: { status: true },
    });
    return row?.status === 'PROCESSING';
  }

  private ack(msg: Message) {
    return this.sqs.send(
      new DeleteMessageCommand({
        QueueUrl: this.cfg.queueUrl,
        ReceiptHandle: msg.ReceiptHandle,
      }),
    );
  }
}
