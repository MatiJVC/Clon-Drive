// src/test-aws/test-aws.controller.ts
import { Controller, Get, Post } from '@nestjs/common';
import { TestAwsService } from './test-aws.service.js';

@Controller('test-aws')
export class TestAwsController {
  constructor(private readonly testAwsService: TestAwsService) {}

  @Post('s3-upload')
  uploadToS3() {
    return this.testAwsService.testS3Upload();
  }

  @Post('sqs-send')
  sendToSqs() {
    return this.testAwsService.testSqsSend();
  }

  @Get('sqs-receive')
  receiveFromSqs() {
    return this.testAwsService.testSqsReceive();
  }
}