import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class QuickActionQueryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, {
    message: 'Format token persetujuan cepat tidak valid.',
  })
  token!: string;
}
