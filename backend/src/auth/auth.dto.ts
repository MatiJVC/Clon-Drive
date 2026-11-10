import { IsString, Length, Matches } from 'class-validator';

export class CredentialsDto {
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'username solo puede tener letras, números, punto, guion y guion bajo',
  })
  username: string;

  @IsString()
  @Length(6, 100)
  password: string;
}
