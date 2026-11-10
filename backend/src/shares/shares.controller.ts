import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/auth-user.js';
import { CreateShareDto, ListSharesQuery, UpdateShareDto } from './shares.dto.js';
import { SharesService } from './shares.service.js';

@Controller('shares')
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  // { username, permission: "READ" | "EDIT", fileId | folderId }
  @Post()
  share(@CurrentUser() user: AuthUser, @Body() dto: CreateShareDto) {
    return this.shares.share(user.id, dto);
  }

  // GET /shares?fileId=X  o  /shares?folderId=X
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListSharesQuery) {
    return this.shares.list(user.id, query);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShareDto,
  ) {
    return this.shares.update(user.id, id, dto.permission);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.shares.remove(user.id, id);
  }
}
