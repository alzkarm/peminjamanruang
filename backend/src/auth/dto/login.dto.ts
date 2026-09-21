import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Username / NIM / NIDN / NIK wajib diisi.' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: 'Kata sandi SSO wajib diisi.' })
  @IsString()
  @MinLength(3, { message: 'Kata sandi minimal 3 karakter.' })
  password: string;
}

export class SyncLdapUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  email?: string;

  @IsNotEmpty()
  @IsString()
  unitName: string;
}
