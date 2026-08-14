import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType, BookingStatus } from '@/common/types';

export class CreateBookingDto {
  @IsNotEmpty({ message: 'ID Ruangan wajib diisi.' })
  @IsString()
  roomId: string;

  @IsNotEmpty({ message: 'Judul kegiatan wajib diisi.' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'Tipe aktivitas wajib diisi.' })
  @IsEnum(ActivityType, { message: 'Tipe aktivitas tidak valid.' })
  activityType: ActivityType;

  @IsNotEmpty({ message: 'Waktu mulai wajib diisi.' })
  @IsDateString({}, { message: 'Format waktu mulai harus ISO 8601 UTC string.' })
  startTime: string;

  @IsNotEmpty({ message: 'Waktu selesai wajib diisi.' })
  @IsDateString({}, { message: 'Format waktu selesai harus ISO 8601 UTC string.' })
  endTime: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalFacilities?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isLeaderApproved?: boolean;
}

export class UpdateBookingStatusDto {
  @IsNotEmpty({ message: 'Status baru wajib diisi.' })
  @IsEnum(BookingStatus, { message: 'Status booking tidak valid.' })
  status: BookingStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSpecialRoom?: boolean;
}
