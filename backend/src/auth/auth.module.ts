import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

const secret = process.env.JWT_SECRET;
if (!secret)
  new Logger('AuthModule').warn(
    'JWT_SECRET no definido: se usa un secreto de desarrollo',
  );

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: secret ?? 'clon-drive-dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
