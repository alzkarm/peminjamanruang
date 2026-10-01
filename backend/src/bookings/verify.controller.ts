import { Controller, Get, Param } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('verify')
export class VerifyController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get(':code')
  async verifyBooking(@Param('code') code: string) {
    return this.bookingsService.verifyByCode(code);
  }
}
