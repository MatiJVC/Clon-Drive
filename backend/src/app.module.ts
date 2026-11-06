// src/app.module.ts
import { Module } from '@nestjs/common';
import { TestAwsController } from './test-aws/test-aws.controller.js';
import { TestAwsService } from './test-aws/test-aws.service.js';

@Module({
  imports: [],
  controllers: [TestAwsController],
  providers: [TestAwsService],
})
export class AppModule {}
