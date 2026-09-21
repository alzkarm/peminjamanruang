import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCbtBookingDto, QueryCbtSeatsDto } from './dto/cbt-room.dto';

const CBT_MAX_SEATS = 200;

@Injectable()
export class CbtRoomService {
  private readonly logger = new Logger(CbtRoomService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all CBT seat bookings overlapping a given time slot.
   * Used by the frontend to render the seat map.
   */
  async getSeatsForTimeSlot(query: QueryCbtSeatsDto) {
    const startTime = new Date(query.startTime);
    const endTime = new Date(query.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Waktu mulai harus lebih awal dari waktu selesai.');
    }

    return this.prisma.cbtSeatBooking.findMany({
      where: {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
      orderBy: { seatStart: 'asc' },
      include: {
        user: {
          select: { id: true, fullName: true, unitName: true },
        },
      },
    });
  }

  /**
   * Atomic multi-tenant seat booking with overlap & capacity checks.
   * Uses SERIALIZABLE isolation to prevent race conditions.
   */
  async bookSeats(userId: string, dto: CreateCbtBookingDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Waktu mulai harus lebih awal dari waktu selesai.');
    }

    if (dto.seatStart > dto.seatEnd) {
      throw new BadRequestException(
        `Nomor kursi awal (${dto.seatStart}) tidak boleh lebih besar dari kursi akhir (${dto.seatEnd}).`,
      );
    }

    const requestedCount = dto.seatEnd - dto.seatStart + 1;

    return this.prisma.$transaction(
      async (tx) => {
        // Fetch all existing bookings overlapping this time slot
        const existingBookings = await tx.cbtSeatBooking.findMany({
          where: {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: startTime } },
            ],
          },
        });

        // Build a set of all booked seat numbers
        const bookedSeats = new Set<number>();
        for (const booking of existingBookings) {
          for (let s = booking.seatStart; s <= booking.seatEnd; s++) {
            bookedSeats.add(s);
          }
        }

        // Check for seat overlap — are any requested seats already booked?
        const conflictingSeats: number[] = [];
        for (let s = dto.seatStart; s <= dto.seatEnd; s++) {
          if (bookedSeats.has(s)) {
            conflictingSeats.push(s);
          }
        }

        if (conflictingSeats.length > 0) {
          const rangeText =
            conflictingSeats.length <= 10
              ? conflictingSeats.join(', ')
              : `${conflictingSeats.slice(0, 10).join(', ')} ... (${conflictingSeats.length} kursi)`;
          throw new ConflictException({
            code: 'SEAT_CONFLICT',
            message: `Kursi berikut sudah dipesan pada slot waktu ini: ${rangeText}`,
            conflictingSeats,
          });
        }

        // Check remaining capacity
        const totalBooked = bookedSeats.size;
        const remaining = CBT_MAX_SEATS - totalBooked;

        if (requestedCount > remaining) {
          throw new ConflictException({
            code: 'CAPACITY_EXCEEDED',
            message: `Kursi yang diminta (${requestedCount} kursi) melebihi sisa kapasitas. Hanya tersisa ${remaining} kursi dari total ${CBT_MAX_SEATS} kursi.`,
            requested: requestedCount,
            remaining,
            totalCapacity: CBT_MAX_SEATS,
          });
        }

        // All checks pass — create the booking
        const newBooking = await tx.cbtSeatBooking.create({
          data: {
            userId,
            faculty: dto.faculty,
            title: dto.title,
            seatStart: dto.seatStart,
            seatEnd: dto.seatEnd,
            startTime,
            endTime,
            notes: dto.notes,
          },
          include: {
            user: {
              select: { id: true, fullName: true, unitName: true },
            },
          },
        });

        this.logger.log(
          `CBT Booking created: ${dto.faculty} | seats ${dto.seatStart}-${dto.seatEnd} (${requestedCount} kursi) | ${dto.title}`,
        );

        return newBooking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  /**
   * Get all CBT bookings (admin/overview).
   */
  async getAllBookings() {
    return this.prisma.cbtSeatBooking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, unitName: true },
        },
      },
    });
  }
}
