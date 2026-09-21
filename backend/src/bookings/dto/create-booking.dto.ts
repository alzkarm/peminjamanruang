import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
  ValidateNested,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType, BookingStatus } from '@/common/types';

export class CreateBookingLogistikDto {
  @IsNotEmpty({ message: 'Jenis item logistik wajib diisi.' })
  @IsString()
  jenisItem: string;

  @IsNotEmpty({ message: 'Jumlah item logistik wajib diisi.' })
  @IsNumber({}, { message: 'Jumlah harus berupa angka.' })
  @Min(1, { message: 'Jumlah minimal 1.' })
  @Type(() => Number)
  jumlah: number;

  @IsOptional()
  @IsString()
  catatan?: string;
}

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingLogistikDto)
  logistik?: CreateBookingLogistikDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  catatan?: string;

  @IsOptional()
  @IsString()
  dokumenUrl?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isLeaderApproved?: boolean;
}

export class UpdateBookingStatusDto {
  @IsNotEmpty({ message: 'Status baru wajib diisi.' })
  @IsEnum(BookingStatus, { message: 'Status booking tidak valid.' })
  status: BookingStatus;

  @ValidateIf((o) => (o.status === BookingStatus.REJECTED || o.status === BookingStatus.RETURNED) && !o.catatan)
  @IsNotEmpty({ message: 'Catatan/alasan wajib diisi ketika status ditolak atau dikembalikan untuk revisi.' })
  @IsString({ message: 'Catatan harus berupa teks.' })
  notes?: string;

  @ValidateIf((o) => (o.status === BookingStatus.REJECTED || o.status === BookingStatus.RETURNED) && !o.notes)
  @IsNotEmpty({ message: 'Catatan/alasan wajib diisi ketika status ditolak atau dikembalikan untuk revisi.' })
  @IsString({ message: 'Catatan harus berupa teks.' })
  catatan?: string;
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
