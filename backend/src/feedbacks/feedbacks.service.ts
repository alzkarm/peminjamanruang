import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbacksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { feedback: true },
    });

    if (!booking) {
      throw new NotFoundException('Data peminjaman tidak ditemukan.');
    }

    if (booking.feedback) {
      throw new ConflictException('Feedback untuk peminjaman ini sudah pernah diisi.');
    }

    const overallRating = Number(
      ((dto.cleanlinessRating + dto.facilityRating + dto.staffRating) / 3).toFixed(2),
    );

    return this.prisma.feedback.create({
      data: {
        bookingId: dto.bookingId,
        userId,
        cleanlinessRating: dto.cleanlinessRating,
        facilityRating: dto.facilityRating,
        staffRating: dto.staffRating,
        overallRating,
        comments: dto.comments,
        reportedIssues: dto.reportedIssues,
      },
      include: {
        booking: { include: { room: true } },
        user: { select: { fullName: true, unitName: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.feedback.findMany({
      include: {
        booking: { include: { room: { include: { floor: true } } } },
        user: { select: { fullName: true, username: true, unitName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRoom(roomId: string) {
    return this.prisma.feedback.findMany({
      where: { booking: { roomId } },
      include: {
        booking: { select: { title: true, startTime: true, endTime: true } },
        user: { select: { fullName: true, unitName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
