// src/app.module.ts
import { Module } from '@nestjs/common';
import { AwsModule } from './aws/aws.module.js';
import { DatabaseModule } from './db/database.module.js';
import { HealthController } from './health/health.controller.js';
import { TestAwsController } from './test-aws/test-aws.controller.js';
import { TestAwsService } from './test-aws/test-aws.service.js';

@Module({
  imports: [DatabaseModule, AwsModule],
  controllers: [HealthController, TestAwsController],
  providers: [TestAwsService],
})
export class AppModule {}
