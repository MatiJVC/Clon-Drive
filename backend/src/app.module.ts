// src/app.module.ts
import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AwsModule } from './aws/aws.module.js';
import { DatabaseModule } from './db/database.module.js';
import { DriveController } from './drive/drive.controller.js';
import { DriveService } from './drive/drive.service.js';
import { FilesController } from './files/files.controller.js';
import { FilesService } from './files/files.service.js';
import { UploadWorker } from './files/upload.worker.js';
import { FoldersController } from './folders/folders.controller.js';
import { FoldersService } from './folders/folders.service.js';
import { HealthController } from './health/health.controller.js';
import { SharesController } from './shares/shares.controller.js';
import { SharesService } from './shares/shares.service.js';
import { TestAwsController } from './test-aws/test-aws.controller.js';
import { TestAwsService } from './test-aws/test-aws.service.js';
import { UsersController } from './users/users.controller.js';

@Module({
  imports: [DatabaseModule, AwsModule, AccessModule, AuthModule],
  controllers: [
    HealthController,
    DriveController,
    FoldersController,
    FilesController,
    SharesController,
    UsersController,
    TestAwsController,
  ],
  providers: [
    DriveService,
    FoldersService,
    FilesService,
    UploadWorker,
    SharesService,
    TestAwsService,
  ],
})
export class AppModule {}
