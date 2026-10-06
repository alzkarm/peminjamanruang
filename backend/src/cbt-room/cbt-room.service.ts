import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCbtBookingDto, QueryCbtSeatsDto } from './dto/cbt-room.dto';

const CBT_ROOM_SEAT_RANGES = {
  A: { min: 1, max: 196 },
  B: { min: 197, max: 355 },
} as const;

@Injectable()
export class CbtRoomService {
  private readonly logger = new Logger(CbtRoomService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all CBT seat bookings overlapping a given time slot for a specific room.
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
        roomId: query.roomId,
        status: { not: 'REJECTED' },
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
   * Atomic multi-tenant seat booking with overlap & capacity checks per room.
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

    // Validate seat range against the physical numbering of each room
    // (Room A 1-196, Room B 197-355 — see CbtSeatMap.tsx).
    const { min, max } = CBT_ROOM_SEAT_RANGES[dto.roomId];
    if (dto.seatStart < min || dto.seatStart > max) {
      throw new BadRequestException(
        `Nomor kursi awal harus antara ${min} dan ${max} untuk Ruang CBT ${dto.roomId}.`,
      );
    }
    if (dto.seatEnd < min || dto.seatEnd > max) {
      throw new BadRequestException(
        `Nomor kursi akhir harus antara ${min} dan ${max} untuk Ruang CBT ${dto.roomId}.`,
      );
    }

    const requestedCount = dto.seatEnd - dto.seatStart + 1;

    return this.prisma.$transaction(
      async (tx) => {
        // Fetch all existing bookings overlapping this time slot for the specific room
        const existingBookings = await tx.cbtSeatBooking.findMany({
          where: {
            roomId: dto.roomId,
            status: { not: 'REJECTED' },
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
        // Check remaining capacity for this room (jumlah kursi fisik, bukan nomor max).
        const roomCapacity = max - min + 1;
        const totalBooked = bookedSeats.size;
        const remaining = roomCapacity - totalBooked;

        if (requestedCount > remaining) {
          throw new ConflictException({
            code: 'CAPACITY_EXCEEDED',
            message: `Kursi yang diminta (${requestedCount} kursi) melebihi sisa kapasitas Ruang CBT ${dto.roomId}. Hanya tersisa ${remaining} kursi dari total ${roomCapacity} kursi.`,
            requested: requestedCount,
            remaining,
            totalCapacity: roomCapacity,
            roomId: dto.roomId,
          });
        }

        // All checks pass — create the booking
        const newBooking = await tx.cbtSeatBooking.create({
          data: {
            userId,
            roomId: dto.roomId,
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
          `CBT Booking created: Ruang CBT ${dto.roomId} | ${dto.faculty} | seats ${dto.seatStart}-${dto.seatEnd} (${requestedCount} kursi) | ${dto.title}`,
        );

        return newBooking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  /**
   * Get all CBT bookings (admin/overview) with optional room filter.
   */
  async getAllBookings(roomId?: 'A' | 'B') {
    return this.prisma.cbtSeatBooking.findMany({
      where: roomId ? { roomId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, unitName: true },
        },
      },
    });
  }

  /**
   * Update CBT booking status (APPROVE / REJECT / PENDING).
   */
  async updateBookingStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') {
    const booking = await this.prisma.cbtSeatBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Pemesanan CBT dengan ID "${id}" tidak ditemukan.`);
    }

    const updated = await this.prisma.cbtSeatBooking.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, fullName: true, unitName: true },
        },
      },
    });

    this.logger.log(
      `CBT Booking ${id} status updated to ${status} (Ruang CBT ${updated.roomId}, seats ${updated.seatStart}-${updated.seatEnd})`,
    );

    return updated;
  }
}
