import { Global, Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { AWS_CONFIG, type AwsConfig } from './aws.config.js';
import { StorageService } from './storage.service.js';

export { AWS_CONFIG, type AwsConfig } from './aws.config.js';

// Configuración compartida para hablar con LocalStack (S3 y SQS).

const clientConfig = () => ({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.LOCALSTACK_ENDPOINT ?? 'http://localhost:4566',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
  forcePathStyle: true, // obligatorio para S3 en LocalStack
});

@Global()
@Module({
  providers: [
    { provide: S3Client, useFactory: () => new S3Client(clientConfig()) },
    { provide: SQSClient, useFactory: () => new SQSClient(clientConfig()) },
    {
      provide: AWS_CONFIG,
      useFactory: (): AwsConfig => ({
        bucketName: process.env.S3_BUCKET_NAME ?? 'drive-clon-storage',
        queueUrl:
          process.env.SQS_QUEUE_URL ??
          'http://localhost:4566/000000000000/drive-upload-queue',
      }),
    },
    StorageService,
  ],
  exports: [S3Client, SQSClient, AWS_CONFIG, StorageService],
})
export class AwsModule {}
