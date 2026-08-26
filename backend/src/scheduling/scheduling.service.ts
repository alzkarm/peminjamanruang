import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BLOCKING_BOOKING_STATUSES } from './scheduling.constants';
import {
  runSerializableWithRetry,
  SchedulingBusyError,
} from './serializable-retry';

type PrismaExecutor = Pick<PrismaService, 'room' | 'booking'>;

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAvailability(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
    executor: PrismaExecutor = this.prisma,
  ) {
    this.assertValidInterval(startTime, endTime);

    const room = await executor.room.findUnique({ where: { id: roomId } });
    if (!room || !room.isActive) {
      throw new NotFoundException('Ruangan tidak ditemukan atau tidak aktif.');
    }

    const conflict = await executor.booking.findFirst({
      where: {
        roomId,
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        status: { in: BLOCKING_BOOKING_STATUSES },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
      orderBy: { startTime: 'asc' },
    });

    return { isAvailable: !conflict, room, conflict };
  }

  async assertAvailable(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
    executor: PrismaExecutor = this.prisma,
  ) {
    const availability = await this.checkAvailability(
      roomId,
      startTime,
      endTime,
      excludeBookingId,
      executor,
    );

    if (!availability.isAvailable) {
      throw new ConflictException({
        code: 'BOOKING_CONFLICT',
        message: 'Jadwal ruangan sudah tidak tersedia.',
        conflict: {
          id: availability.conflict.id,
          title: availability.conflict.title,
          status: availability.conflict.status,
          startTime: availability.conflict.startTime,
          endTime: availability.conflict.endTime,
        },
      });
    }

    return availability;
  }

  async inSerializableTransaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await runSerializableWithRetry(() =>
        this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }),
      );
    } catch (error) {
      if (error instanceof SchedulingBusyError) {
        throw new ServiceUnavailableException({
          code: error.code,
          message: 'Sistem penjadwalan sedang sibuk. Silakan coba lagi.',
        });
      }
      throw error;
    }
  }

  private assertValidInterval(startTime: Date, endTime: Date) {
    if (
      Number.isNaN(startTime?.getTime()) ||
      Number.isNaN(endTime?.getTime()) ||
      startTime >= endTime
    ) {
      throw new BadRequestException('Waktu mulai harus sebelum waktu selesai.');
    }
  }
}
