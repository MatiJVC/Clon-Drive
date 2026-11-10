import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsUUID } from 'class-validator';
import { diskStorage } from 'multer';
import { tmpdir } from 'node:os';
import { CurrentUser, type AuthUser } from '../common/auth-user.js';
import { NameDto } from '../common/name.dto.js';
import { FilesService, type UploadedTmpFile } from './files.service.js';

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 500);

class UploadDto {
  @IsOptional()
  @IsUUID()
  folderId?: string;
}

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  // multipart/form-data con el campo "file" (y opcionalmente "folderId").
  // El archivo se guarda en un temporal en disco, no en memoria,
  // para soportar videos grandes.
  @Post()
  @HttpCode(202)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: tmpdir() }),
      limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedTmpFile | undefined,
    @Body() dto: UploadDto,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")');
    return this.files.upload(user.id, file, dto.folderId);
  }

  @Get(':id')
  details(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.files.details(user.id, id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const { file, body } = await this.files.download(user.id, id);
    return new StreamableFile(body, {
      type: file.mimeType,
      length: file.size,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    });
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NameDto,
  ) {
    return this.files.rename(user.id, id, dto.name);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.files.remove(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.files.cancel(user.id, id);
  }
}
