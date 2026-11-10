import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

// Nombre de carpeta o archivo: sin "/" ni "\" y sin espacios sobrantes.
export class NameDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 255)
  @Matches(/^[^/\\]+$/, { message: 'El nombre no puede contener / ni \\' })
  name: string;
}
