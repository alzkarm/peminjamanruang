import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

const VALID_FACULTIES = ['FEB', 'FH', 'FTI', 'FK', 'FKG', 'FP'] as const;

export class CreateCbtBookingDto {
  @IsNotEmpty({ message: 'Judul kegiatan CBT wajib diisi.' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'Fakultas wajib dipilih.' })
  @IsIn(VALID_FACULTIES, {
    message: 'Fakultas harus salah satu dari: FEB, FH, FTI, FK, FKG, FP.',
  })
  faculty: string;

  @IsNotEmpty({ message: 'Nomor kursi awal wajib diisi.' })
  @IsInt({ message: 'Nomor kursi awal harus bilangan bulat.' })
  @Min(1, { message: 'Nomor kursi minimal adalah 1.' })
  @Max(200, { message: 'Nomor kursi maksimal adalah 200.' })
  @Type(() => Number)
  seatStart: number;

  @IsNotEmpty({ message: 'Nomor kursi akhir wajib diisi.' })
  @IsInt({ message: 'Nomor kursi akhir harus bilangan bulat.' })
  @Min(1, { message: 'Nomor kursi minimal adalah 1.' })
  @Max(200, { message: 'Nomor kursi maksimal adalah 200.' })
  @Type(() => Number)
  seatEnd: number;

  @IsNotEmpty({ message: 'Waktu mulai wajib diisi.' })
  @IsDateString({}, { message: 'Format waktu mulai harus ISO 8601.' })
  startTime: string;

  @IsNotEmpty({ message: 'Waktu selesai wajib diisi.' })
  @IsDateString({}, { message: 'Format waktu selesai harus ISO 8601.' })
  endTime: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryCbtSeatsDto {
  @IsNotEmpty({ message: 'Waktu mulai wajib diisi untuk melihat status kursi.' })
  @IsDateString({}, { message: 'Format waktu mulai harus ISO 8601.' })
  startTime: string;

  @IsNotEmpty({ message: 'Waktu selesai wajib diisi untuk melihat status kursi.' })
  @IsDateString({}, { message: 'Format waktu selesai harus ISO 8601.' })
  endTime: string;
}
