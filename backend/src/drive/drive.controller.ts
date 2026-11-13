import { Controller, Get, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/auth-user.js';
import { DriveService } from './drive.service.js';

@Controller('drive')
export class DriveController {
  constructor(private readonly drive: DriveService) {}

  // GET /drive             -> raíz del usuario
  // GET /drive?folderId=X  -> contenido de la carpeta X (propia o compartida)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('folderId', new ParseUUIDPipe({ optional: true })) folderId?: string,
  ) {
    return this.drive.list(user.id, folderId);
  }

  // GET /drive/search?q=texto -> busca por nombre en lo propio y lo compartido
  @Get('search')
  search(@CurrentUser() user: AuthUser, @Query('q') q = '') {
    return this.drive.search(user.id, String(q).slice(0, 100));
  }

  // GET /drive/shared -> lo que me compartieron
  @Get('shared')
  shared(@CurrentUser() user: AuthUser) {
    return this.drive.sharedWithMe(user.id);
  }
}
