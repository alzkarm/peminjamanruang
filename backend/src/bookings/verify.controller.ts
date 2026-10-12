import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/common/types';
import { QuickActionQueryDto } from './dto/quick-action-query.dto';
@Controller('verify')
export class VerifyController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('quick-action/execute')
  @UseGuards(JwtAuthGuard)
  async executeQuickAction(
    @Query() query: QuickActionQueryDto,
    @CurrentUser() executor: { id: string; role: string; fullName: string },
  ) {
    return this.bookingsService.verifyAndExecuteQuickAction(query.token, executor);
  }
  @Get('quick-action/generate-link/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
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
