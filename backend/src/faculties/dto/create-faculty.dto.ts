import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateFacultyDto {
  @IsNotEmpty({ message: 'Kode fakultas wajib diisi.' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: 'Nama fakultas wajib diisi.' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  colorBg?: string;

  @IsOptional()
  @IsString()
  colorBorder?: string;

  @IsOptional()
  @IsString()
  colorText?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFacultyDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  colorBg?: string;

  @IsOptional()
  @IsString()
  colorBorder?: string;

  @IsOptional()
  @IsString()
  colorText?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
