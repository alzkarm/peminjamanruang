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
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import { Response } from 'express';

const ALLOWED_UPLOADS: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

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

async function hasExpectedFileSignature(file: Express.Multer.File) {
  const header = await fs.readFile(file.path).then((data) => data.subarray(0, 8));
  const extension = extname(file.filename).toLowerCase();
  if (extension === '.pdf') return header.subarray(0, 5).toString() === '%PDF-';
  if (extension === '.doc') return header.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  return header.subarray(0, 2).equals(Buffer.from('PK'));
}
