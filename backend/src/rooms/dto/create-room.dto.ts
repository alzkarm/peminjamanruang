import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsNotEmpty({ message: 'Nama ruangan wajib diisi.' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'ID Lantai wajib diisi.' })
  @IsInt()
  @Type(() => Number)
  floorId: number;

  @IsNotEmpty({ message: 'Kapasitas ruangan wajib diisi.' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  isSpecialRoom?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryRoomDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floorId?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSpecialRoom?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floorId?: number;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isSpecialRoom?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

