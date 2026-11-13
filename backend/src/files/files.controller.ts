import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsUUID } from 'class-validator';
import { diskStorage } from 'multer';
import { tmpdir } from 'node:os';
import type { Response } from 'express';
import { CurrentUser, Public, type AuthUser } from '../common/auth-user.js';
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

  // Devuelve una URL temporal para mostrar el archivo en el navegador.
  @Get(':id/preview')
  preview(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.files.previewUrl(user.id, id);
  }

  // Sirve el archivo "inline" para <img>, <video>, <audio> o <iframe>.
  // Pública porque lleva su propio token en la URL (ver previewUrl).
  // Soporta Range para poder adelantar videos y audios.
  @Public()
  @Get(':id/stream')
  async stream(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string | undefined,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, body, range: r } = await this.files.stream(id, token, range);
    // Contenido que el navegador podría ejecutar (HTML, SVG, XML, JS) se
    // entrega como texto plano y aislado, para que no corra scripts.
    const risky = /html|svg|xml|javascript|ecmascript/i.test(file.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (risky) res.setHeader('Content-Security-Policy', 'sandbox');
    if (r) {
      res.status(206);
      res.setHeader('Content-Range', `bytes ${r.start}-${r.end}/${file.size}`);
    }
    return new StreamableFile(body, {
      type: risky ? 'text/plain; charset=utf-8' : file.mimeType,
      length: r ? r.end - r.start + 1 : file.size,
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
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
