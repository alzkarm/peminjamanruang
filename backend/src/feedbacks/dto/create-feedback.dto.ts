import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeedbackDto {
  @IsNotEmpty({ message: 'ID Peminjaman wajib diisi.' })
  @IsString()
  bookingId: string;

  @IsNotEmpty({ message: 'Rating kebersihan wajib diisi (1-5).' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  cleanlinessRating: number;

  @IsNotEmpty({ message: 'Rating fasilitas wajib diisi (1-5).' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  facilityRating: number;

  @IsNotEmpty({ message: 'Rating ketepatan waktu petugas wajib diisi (1-5).' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  staffRating: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  reportedIssues?: string;
}
