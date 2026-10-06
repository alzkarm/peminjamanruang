import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/common/types';

@Controller('verify')
export class VerifyController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('quick-action/execute')
  async executeQuickAction(@Query('token') token: string) {
    return this.bookingsService.verifyAndExecuteQuickAction(token);
  }

  @Get('quick-action/generate-link/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.YAYASAN, Role.ADMIN_YAYASAN, Role.ADMIN_LPF, Role.ADMIN_UNIV, Role.ADMIN_UMUM)
  async getQuickApprovalLink(
    @Param('bookingId') bookingId: string,
    @Query('action') action: 'APPROVE' | 'REJECT',
    @CurrentUser('id') approverId: string,
  ) {
    const token = this.bookingsService.generateQuickActionToken(bookingId, action || 'APPROVE', approverId);
    return { token, actionUrl: `/api/verify/quick-action/execute?token=${token}` };
  }

  @Get(':code')
  async verifyBooking(@Param('code') code: string) {
    return this.bookingsService.verifyByCode(code);
  }
}
