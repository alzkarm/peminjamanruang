import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CbtRoomService } from './cbt-room.service';
import { CreateCbtBookingDto, QueryCbtSeatsDto } from './dto/cbt-room.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
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
   * GET /api/cbt-room/bookings
   * Authenticated — lists all CBT bookings.
   */
  @Get('bookings')
  @UseGuards(JwtAuthGuard)
  async getAllBookings() {
    return this.cbtRoomService.getAllBookings();
  }
}
