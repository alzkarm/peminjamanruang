import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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

  @Get('quick-action/preview')
  async previewQuickAction(@Query() query: QuickActionQueryDto) {
    return this.bookingsService.previewQuickAction(query.token);
  }

  @Post('quick-action/execute')
  @UseGuards(JwtAuthGuard)
  async executeQuickAction(
    @Body() body: { token?: string },
    @Query() query: QuickActionQueryDto,
    @CurrentUser() executor: { id: string; role: string; fullName: string },
  ) {
    const token = body?.token || query?.token;
    return this.bookingsService.verifyAndExecuteQuickAction(token, executor);
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
    return { token, actionUrl: `/approval/result?token=${token}` };
  }

  @Get(':code')
  async verifyBooking(@Param('code') code: string) {
    return this.bookingsService.verifyByCode(code);
  }
}
