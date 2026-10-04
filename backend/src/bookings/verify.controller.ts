import { Controller, Get, Param, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('verify')
export class VerifyController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('quick-action/execute')
  async executeQuickAction(@Query('token') token: string) {
    return this.bookingsService.verifyAndExecuteQuickAction(token);
  }

  @Get('quick-action/generate-link/:bookingId')
  async getQuickApprovalLink(
    @Param('bookingId') bookingId: string,
    @Query('action') action: 'APPROVE' | 'REJECT',
  ) {
    const token = this.bookingsService.generateQuickActionToken(bookingId, action || 'APPROVE');
    return { token, actionUrl: `/api/verify/quick-action/execute?token=${token}` };
  }

  @Get(':code')
  async verifyBooking(@Param('code') code: string) {
    return this.bookingsService.verifyByCode(code);
  }
}
