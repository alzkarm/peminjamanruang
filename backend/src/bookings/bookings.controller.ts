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
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateBookingDto,
  QueryBookingDto,
  UpdateBookingStatusDto,
  UpdateBatchStatusDto,
  RescheduleBookingDto,
} from './dto/create-booking.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/common/types';
import { diskStorage } from 'multer';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import { Response } from 'express';

const ALLOWED_UPLOADS: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/pjpeg'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const extension = extname(file.originalname).toLowerCase();
        cb(null, !!ALLOWED_UPLOADS[extension]?.includes(file.mimetype));
      },
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
    }),
  )
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file && !(await hasExpectedFileSignature(file))) {
      await fs.unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Jenis file lampiran tidak valid.');
    }
    const attachmentUrl = file ? `/attachments/${file.filename}` : undefined;
    try {
      return await this.bookingsService.create(userId, dto, attachmentUrl);
    } catch (error) {
      if (file) await fs.unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  @Get(':id/attachment')
  @UseGuards(JwtAuthGuard)
  async downloadAttachment(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role },
    @Res() response: Response,
  ) {
    const storedPath = await this.bookingsService.getAttachmentForUser(id, currentUser);
    const filename = basename(storedPath);
    if (!filename || filename !== storedPath.split('/').pop()) {
      throw new NotFoundException('Lampiran tidak ditemukan.');
    }
    const absolutePath = join(process.cwd(), 'uploads', filename);
    if (!existsSync(absolutePath)) throw new NotFoundException('Lampiran tidak ditemukan.');
    return response.download(absolutePath, filename);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() query: QueryBookingDto,
    @CurrentUser() currentUser: { id: string; role: Role },
  ) {
    return this.bookingsService.findAll(query, currentUser);
  }

  @Get('runsheet/daily')
  @UseGuards(JwtAuthGuard)
  async getDailyRunsheet(@Query('date') date?: string) {
    return this.bookingsService.getDailyRunsheet(date);
  }

  @Patch('runsheet/:bookingId/toggle-check')
  @UseGuards(JwtAuthGuard)
  async toggleRunsheetCheck(
    @Param('bookingId') bookingId: string,
    @CurrentUser() currentUser: { id: string; role: Role; fullName: string },
    @Body()
    body: {
      item: 'ac' | 'audio' | 'logistics' | 'cleanliness';
      value: boolean;
      notes?: string;
    },
  ) {
    return this.bookingsService.toggleRunsheetCheck(
      bookingId,
      currentUser,
      body.item,
      body.value,
      body.notes,
    );
  }

  @Post('cleanup-expired')
  @UseGuards(JwtAuthGuard)
  async cleanupExpired() {
    return this.bookingsService.cleanupExpiredBookings();
  }

  @Post('detect-no-show')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async detectNoShow() {
    return this.bookingsService.detectNoShowBookings();
  }

  @Get('penalties/my')
  @UseGuards(JwtAuthGuard)
  async getMyPenalties(@CurrentUser() currentUser: { id: string }) {
    return this.bookingsService.getMyPenalties(currentUser.id);
  }

  @Get('penalties/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async getAllPenalties() {
    return this.bookingsService.getAllPenalties();
  }

  @Patch('penalties/:id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async revokePenalty(@Param('id') id: string) {
    return this.bookingsService.revokePenalty(id);
  }

  @Post(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  async requestReschedule(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role; fullName: string },
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingsService.requestReschedule(id, currentUser, dto);
  }

  @Post(':id/check-in')
  @UseGuards(JwtAuthGuard)
  async checkIn(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role; fullName: string },
  ) {
    return this.bookingsService.checkInBooking(id, currentUser);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role },
  ) {
    return this.bookingsService.findOne(id, currentUser);
  }

  @Patch('batch-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async updateBatchStatus(
    @CurrentUser() currentUser: { id: string; role: Role; fullName: string },
    @Body() dto: UpdateBatchStatusDto,
  ) {
    return this.bookingsService.updateBatchStatus(currentUser, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role; fullName: string },
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, currentUser, dto);
  }
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role; fullName: string },
    @Body() body?: { notes?: string; catatan?: string },
  ) {
    const reason = body?.notes || body?.catatan;
    return this.bookingsService.cancelBooking(id, currentUser, reason);
  }
}

async function hasExpectedFileSignature(file: Express.Multer.File) {
  const header = await fs.readFile(file.path).then((data) => data.subarray(0, 8));
  const extension = extname(file.filename).toLowerCase();
  if (extension === '.pdf') return header.subarray(0, 5).toString() === '%PDF-';
  if (extension === '.png') return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (extension === '.jpg' || extension === '.jpeg') return header.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (extension === '.doc') return header.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  return header.subarray(0, 2).equals(Buffer.from('PK'));
}
