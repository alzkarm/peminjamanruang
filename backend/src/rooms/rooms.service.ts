import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoomDto, QueryRoomDto } from './dto/create-room.dto';
import { BookingStatus } from '@/common/types';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryRoomDto) {
    const { floorId, isSpecialRoom, search } = query;

    return this.prisma.room.findMany({
      where: {
        isActive: true,
        ...(floorId !== undefined ? { floorId } : {}),
        ...(isSpecialRoom !== undefined ? { isSpecialRoom } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { floor: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        floor: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: [{ floor: { level: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        floor: true,
        bookings: {
          where: {
            status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING, BookingStatus.RECOMMENDED] },
            endTime: { gte: new Date() },
          },
          orderBy: { startTime: 'asc' },
          take: 10,
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Ruangan dengan ID '${id}' tidak ditemukan.`);
    }

    return room;
  }

  async getFloors() {
    return this.prisma.floor.findMany({
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { level: 'asc' },
    });
  }

  async create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        name: dto.name,
        floorId: dto.floorId,
        capacity: dto.capacity,
        isSpecialRoom: dto.isSpecialRoom ?? false,
        isActive: dto.isActive ?? true,
      },
      include: { floor: true },
    });
  }

  /**
   * Check slot availability for a room
   */
  async checkAvailability(roomId: string, startTime: Date, endTime: Date, excludeBookingId?: string) {
    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        roomId,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING, BookingStatus.RECOMMENDED] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
      include: {
        user: { select: { fullName: true, unitName: true } },
      },
    });

    return {
      isAvailable: conflictingBookings.length === 0,
      conflicts: conflictingBookings,
    };
  }
}
