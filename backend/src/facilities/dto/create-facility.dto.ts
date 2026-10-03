import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateFacilityDto {
  @IsNotEmpty({ message: 'Nama fasilitas wajib diisi.' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isSpecial?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFacilityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isSpecial?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
