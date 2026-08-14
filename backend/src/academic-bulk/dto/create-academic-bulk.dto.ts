import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAcademicBulkDto {
  @IsNotEmpty({ message: 'Kode & Nama Mata Kuliah wajib diisi.' })
  @IsString()
  courseName: string;

  @IsNotEmpty({ message: 'Nama Dosen Pengampu wajib diisi.' })
  @IsString()
  lecturerName: string;

  @IsNotEmpty({ message: 'Daftar ID Ruangan wajib diisi.' })
  @IsArray()
  @IsString({ each: true })
  roomIds: string[];

  @IsNotEmpty({ message: 'Hari dalam seminggu wajib diisi (1=Senin, 5=Jumat).' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  dayOfWeek: number; // 1 = Monday, 2 = Tuesday, ..., 5 = Friday (excludes Saturday/Sunday)

  @IsNotEmpty({ message: 'Jam Mulai (HH:mm) wajib diisi.' })
  @IsString()
  startTimeStr: string; // e.g. "08:00"

  @IsNotEmpty({ message: 'Jam Selesai (HH:mm) wajib diisi.' })
  @IsString()
  endTimeStr: string; // e.g. "10:30"

  @IsNotEmpty({ message: 'Tanggal awal semester wajib diisi.' })
  @IsDateString()
  semesterStartDate: string; // e.g. "2026-09-01"

  @IsNotEmpty({ message: 'Tanggal akhir semester wajib diisi.' })
  @IsDateString()
  semesterEndDate: string; // e.g. "2027-01-15"

  @IsOptional()
  @IsString()
  faculty?: string;

  @IsOptional()
  @IsString()
  studentGroup?: string;
}
