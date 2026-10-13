import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CbtRoomService } from './cbt-room.service';
import { CreateCbtBookingDto, QueryCbtSeatsDto } from './dto/cbt-room.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('cbt-room')
export class CbtRoomController {
  constructor(private readonly cbtRoomService: CbtRoomService) {}

  /**
   * GET /api/cbt-room/seats?startTime=...&endTime=...
   * Public endpoint — returns booked seats for a given time slot.
   */
  @Get('seats')
  async getSeats(@Query() query: QueryCbtSeatsDto) {
    return this.cbtRoomService.getSeatsForTimeSlot(query);
  }

  /**
   * POST /api/cbt-room/book
   * Authenticated — books seats for the logged-in user.
   */
  @Post('book')
  @UseGuards(JwtAuthGuard)
  async bookSeats(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCbtBookingDto,
  ) {
    return this.cbtRoomService.bookSeats(userId, dto);
  }

  /**
   * GET /api/cbt-room/my-bookings
   * Authenticated — lists CBT bookings for the logged-in user only.
   */
  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  async getMyBookings(@CurrentUser('id') userId: string) {
    return this.cbtRoomService.getUserBookings(userId);
  }

  /**
   * GET /api/cbt-room/bookings
   * Authenticated — lists all CBT bookings (Admin & Superadmin only).
   */
  @Get('bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async getAllBookings() {
    return this.cbtRoomService.getAllBookings();
  }

  /**
   * PATCH /api/cbt-room/bookings/:id/status
   * Authenticated — approve or reject a CBT booking (Admin & Superadmin only).
   */
  @Patch('bookings/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async updateBookingStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'PENDING',
  ) {
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      throw new BadRequestException('Status tidak valid. Harus APPROVED, REJECTED, atau PENDING.');
    }
    return this.cbtRoomService.updateBookingStatus(id, status);
  }
}
