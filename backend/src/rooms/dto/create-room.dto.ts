import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
  // NOTE: baca dari obj mentah — global enableImplicitConversion mengubah
  // string "false" jadi true SEBELUM @Transform jalan. Dengan baca raw
  // query, "false"/"0" tetap false.
  @Transform(({ obj }) => {
    const raw = obj?.isSpecialRoom;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      if (v === 'true' || v === '1') return true;
      if (v === 'false' || v === '0') return false;
    }
    return raw;
  })
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

