import { Global, Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';

// Configuración compartida para hablar con LocalStack (S3 y SQS).
// Inyectar con: constructor(private s3: S3Client, private sqs: SQSClient)
// y leer bucket/cola desde AWS_CONFIG.
export const AWS_CONFIG = Symbol('AWS_CONFIG');

export interface AwsConfig {
  bucketName: string;
  queueUrl: string;
}

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
  ],
  exports: [S3Client, SQSClient, AWS_CONFIG],
})
export class AwsModule {}
