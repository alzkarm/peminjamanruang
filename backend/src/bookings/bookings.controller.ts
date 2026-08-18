import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  QueryBookingDto,
} from './dto/create-booking.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/common/types';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `proposal-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
    }),
  )
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const attachmentUrl = file ? `/uploads/${file.filename}` : undefined;
    return this.bookingsService.create(userId, dto, attachmentUrl);
  }

  @Get()
  async findAll(@Query() query: QueryBookingDto) {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role; fullName: string },
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, currentUser, dto);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role; fullName: string },
    @Body() body?: { notes?: string; catatan?: string },
  ) {
    const reason = body?.notes || body?.catatan;
    return this.bookingsService.cancelBooking(id, currentUser, reason);
  }
}
