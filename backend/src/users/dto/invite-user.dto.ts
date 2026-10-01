import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InviteUserDto {
  @IsNotEmpty({ message: 'Identifier (Email / Username / NPM / NIK) wajib diisi.' })
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  unitName?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
