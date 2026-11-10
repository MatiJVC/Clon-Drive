import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

export interface AuthUser {
  id: string;
  username: string;
}

// Marca un endpoint (o controlador) como accesible sin JWT.
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

// Inyecta el usuario autenticado: method(@CurrentUser() user: AuthUser)
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
