import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
  ValidateNested,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [value];
      }
    }
    return value;
  })
  additionalFacilities?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingLogistikDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return value;
  })
  logistik?: CreateBookingLogistikDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  catatan?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isLeaderApproved?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [value];
      }
    }
    return value;
  })
  dates?: string[];
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

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  applyToRecurringGroup?: boolean;
}

export class UpdateBatchStatusDto {
  @IsArray({ message: 'Daftar ID booking harus berupa array.' })
  @IsString({ each: true, message: 'Setiap ID booking harus berupa teks.' })
  bookingIds: string[];

  @IsNotEmpty({ message: 'Status baru wajib diisi.' })
  @IsEnum(BookingStatus, { message: 'Status booking tidak valid.' })
  status: BookingStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  catatan?: string;
}

export class RescheduleBookingDto {
  @IsNotEmpty({ message: 'Tanggal baru wajib diisi (YYYY-MM-DD).' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal baru harus YYYY-MM-DD.' })
  newDate: string;

  @IsNotEmpty({ message: 'Jam mulai baru wajib diisi (HH:mm).' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Format jam mulai baru harus HH:mm.' })
  newStartTime: string;

  @IsNotEmpty({ message: 'Jam selesai baru wajib diisi (HH:mm).' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Format jam selesai baru harus HH:mm.' })
  newEndTime: string;

  @IsNotEmpty({ message: 'Alasan pindah jadwal wajib diisi.' })
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  newRoomId?: string;
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
