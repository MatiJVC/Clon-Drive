import { IsOptional, IsUUID } from 'class-validator';
import { NameDto } from '../common/name.dto.js';

export class CreateFolderDto extends NameDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
