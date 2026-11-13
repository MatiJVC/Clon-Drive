import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC, type AuthUser } from '../common/auth-user.js';

// Guard global: todo endpoint exige "Authorization: Bearer <token>"
// salvo los marcados con @Public().
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Falta el token de acceso');

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        username: string;
        purpose?: string;
      }>(token);
      // Los tokens de vista previa (purpose) solo sirven para /files/:id/stream.
      if (payload.purpose) throw new Error('token de propósito específico');
      req.user = { id: payload.sub, username: payload.username };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
