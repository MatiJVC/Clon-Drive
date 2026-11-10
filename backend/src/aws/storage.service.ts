import { Inject, Injectable } from '@nestjs/common';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { Readable } from 'node:stream';
import { AWS_CONFIG, type AwsConfig } from './aws.config.js';

// Operaciones sobre el bucket y la cola que usa el resto del backend.
@Injectable()
export class StorageService {
  constructor(
    @Inject(S3Client) private readonly s3: S3Client,
    @Inject(SQSClient) private readonly sqs: SQSClient,
    @Inject(AWS_CONFIG) private readonly cfg: AwsConfig,
  ) {}

  put(key: string, body: Readable, size: number, contentType: string) {
    return this.s3.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucketName,
        Key: key,
        Body: body,
        ContentLength: size,
        ContentType: contentType,
      }),
    );
  }

  get(key: string) {
    return this.s3.send(
      new GetObjectCommand({ Bucket: this.cfg.bucketName, Key: key }),
    );
  }

  head(key: string) {
    return this.s3.send(
      new HeadObjectCommand({ Bucket: this.cfg.bucketName, Key: key }),
    );
  }

  copy(fromKey: string, toKey: string) {
    return this.s3.send(
      new CopyObjectCommand({
        Bucket: this.cfg.bucketName,
        CopySource: `${this.cfg.bucketName}/${fromKey}`,
        Key: toKey,
      }),
    );
  }

  async delete(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.cfg.bucketName, Key: key }),
    );
  }

  async deleteMany(keys: string[]) {
    for (let i = 0; i < keys.length; i += 1000) {
      await this.s3.send(
        new DeleteObjectsCommand({
          Bucket: this.cfg.bucketName,
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) },
        }),
      );
    }
  }

  enqueue(body: object) {
    return this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.cfg.queueUrl,
        MessageBody: JSON.stringify(body),
      }),
    );
  }
}
