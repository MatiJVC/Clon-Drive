import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const PERMISSIONS = ['READ', 'EDIT'] as const;

export class CreateShareDto {
  @IsString()
  username: string;

  @IsIn(PERMISSIONS)
  permission: 'READ' | 'EDIT';

  @IsOptional()
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}

export class UpdateShareDto {
  @IsIn(PERMISSIONS)
  permission: 'READ' | 'EDIT';
}

export class ListSharesQuery {
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}
