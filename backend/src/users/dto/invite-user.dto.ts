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

  // NOTE: tidak ada field password — akun invite adalah whitelist LDAP murni.
  // Password selalu diverifikasi langsung ke server LDAP YARSI saat login,
  // tidak pernah disimpan di database lokal.
}
