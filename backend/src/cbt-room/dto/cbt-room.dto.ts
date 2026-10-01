import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsIn,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CbtRoomType {
  A = 'A',
  B = 'B',
}

const VALID_FACULTIES = ['FEB', 'FH', 'FTI', 'FK', 'FKG', 'FP'] as const;
const CBT_ROOM_CAPACITIES: Record<CbtRoomType, number> = {
  [CbtRoomType.A]: 196,
  [CbtRoomType.B]: 159,
};

export class CreateCbtBookingDto {
  @IsNotEmpty({ message: 'Ruang CBT wajib dipilih.' })
  @IsEnum(CbtRoomType, {
    message: 'Ruang CBT harus A atau B.',
  })
  roomId: CbtRoomType;

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
  @Type(() => Number)
  seatStart: number;

  @IsNotEmpty({ message: 'Nomor kursi akhir wajib diisi.' })
  @IsInt({ message: 'Nomor kursi akhir harus bilangan bulat.' })
  @Min(1, { message: 'Nomor kursi minimal adalah 1.' })
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
  @IsNotEmpty({ message: 'Ruang CBT wajib dipilih.' })
  @IsEnum(CbtRoomType, {
    message: 'Ruang CBT harus A atau B.',
  })
  roomId: CbtRoomType;

  @IsNotEmpty({ message: 'Waktu mulai wajib diisi untuk melihat status kursi.' })
  @IsDateString({}, { message: 'Format waktu mulai harus ISO 8601.' })
  startTime: string;

  @IsNotEmpty({ message: 'Waktu selesai wajib diisi untuk melihat status kursi.' })
  @IsDateString({}, { message: 'Format waktu selesai harus ISO 8601.' })
  endTime: string;
}

export function getCbtRoomCapacity(roomId: CbtRoomType): number {
  return CBT_ROOM_CAPACITIES[roomId];
}

export function getMaxSeatForRoom(roomId: CbtRoomType): number {
  return CBT_ROOM_CAPACITIES[roomId];
}

export function validateSeatRange(roomId: CbtRoomType, seatStart: number, seatEnd: number): void {
  const maxSeat = getMaxSeatForRoom(roomId);
  if (seatStart < 1 || seatStart > maxSeat) {
    throw new Error(`Nomor kursi awal harus antara 1 dan ${maxSeat} untuk Ruang CBT ${roomId}.`);
  }
  if (seatEnd < 1 || seatEnd > maxSeat) {
    throw new Error(`Nomor kursi akhir harus antara 1 dan ${maxSeat} untuk Ruang CBT ${roomId}.`);
  }
}
