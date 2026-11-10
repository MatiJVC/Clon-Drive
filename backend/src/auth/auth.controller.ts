import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../common/auth-user.js';
import { CredentialsDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: CredentialsDto) {
    return this.auth.register(dto.username, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: CredentialsDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
