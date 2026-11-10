import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { sql } from 'drizzle-orm';
import { AWS_CONFIG, type AwsConfig } from '../aws/aws.module.js';
import { DB, type Database } from '../db/database.module.js';

// GET /health: confirma que el backend llega a PostgreSQL, al bucket y a la cola.
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(S3Client) private readonly s3: S3Client,
    @Inject(SQSClient) private readonly sqs: SQSClient,
    @Inject(AWS_CONFIG) private readonly aws: AwsConfig,
  ) {}

  @Get()
  async check() {
    const checks = {
      database: await this.probe(() => this.db.execute(sql`select 1`)),
      s3: await this.probe(() =>
        this.s3.send(new HeadBucketCommand({ Bucket: this.aws.bucketName })),
      ),
      sqs: await this.probe(() =>
        this.sqs.send(
          new GetQueueAttributesCommand({
            QueueUrl: this.aws.queueUrl,
            AttributeNames: ['QueueArn'],
          }),
        ),
      ),
    };
    const ok = Object.values(checks).every((c) => c === 'ok');
    if (!ok) throw new ServiceUnavailableException({ status: 'error', checks });
    return { status: 'ok', checks };
  }

  private async probe(fn: () => Promise<unknown>): Promise<string> {
    try {
      await fn();
      return 'ok';
    } catch (e) {
      return e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 200) : 'error';
    }
  }
}
