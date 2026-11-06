// src/test-aws/test-aws.service.ts
import { Injectable } from '@nestjs/common';
import { 
  S3Client, 
  PutObjectCommand, 
  ListObjectsV2Command 
} from '@aws-sdk/client-s3';
import { 
  SQSClient, 
  SendMessageCommand, 
  ReceiveMessageCommand 
} from '@aws-sdk/client-sqs';

@Injectable()
export class TestAwsService {
  private s3: S3Client;
  private sqs: SQSClient;
  private bucketName = process.env.S3_BUCKET_NAME || 'drive-clon-storage';
  private queueUrl = process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/drive-upload-queue';

  constructor() {
    const awsConfig = {
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      forcePathStyle: true, // Obligatorio para S3 en LocalStack
    };

    this.s3 = new S3Client(awsConfig);
    this.sqs = new SQSClient(awsConfig);
  }

  // --- Pruebas S3 ---
  async testS3Upload() {
    const fileName = `test-${Date.now()}.txt`;
    const content = 'Prueba de subida exitosa desde NestJS';

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: Buffer.from(content),
        ContentType: 'text/plain',
      }),
    );

    const list = await this.s3.send(
      new ListObjectsV2Command({ Bucket: this.bucketName }),
    );

    return {
      status: 'S3 OK',
      uploadedFile: fileName,
      bucketContents: list.Contents?.map((item) => item.Key) || [],
    };
  }

  // --- Pruebas SQS ---
  async testSqsSend() {
    const payload = {
      fileId: 'mock-uuid-1234',
      name: 'archivo-simulado.pdf',
      createdAt: new Date().toISOString(),
    };

    const sendResult = await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(payload),
      }),
    );

    return {
      status: 'SQS Message Sent OK',
      messageId: sendResult.MessageId,
      payload,
    };
  }

async testSqsReceive() {
    const response = await this.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 2,
      }),
    );

    const messages = response.Messages?.map((msg) => {
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(msg.Body || '');
      } catch {
        parsedBody = msg.Body; // Si no es JSON válido (como "Hola SQS"), lo deja como texto
      }

      return {
        id: msg.MessageId,
        body: parsedBody,
        receiptHandle: msg.ReceiptHandle,
      };
    });

    return {
      status: 'SQS Received OK',
      messagesFound: messages?.length || 0,
      messages: messages || [],
    };
  }
}