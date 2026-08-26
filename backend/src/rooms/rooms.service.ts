import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoomDto, QueryRoomDto } from './dto/create-room.dto';
import { BLOCKING_BOOKING_STATUSES } from '../scheduling/scheduling.constants';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduling: SchedulingService,
  ) {}

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
            status: { in: BLOCKING_BOOKING_STATUSES },
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

  async checkAvailability(roomId: string, startTime: Date, endTime: Date, excludeBookingId?: string) {
    const availability = await this.scheduling.checkAvailability(
      roomId,
      startTime,
      endTime,
      excludeBookingId,
    );

    return {
      isAvailable: availability.isAvailable,
      conflicts: availability.conflict
        ? [{
            startTime: availability.conflict.startTime,
            endTime: availability.conflict.endTime,
            status: availability.conflict.status,
          }]
        : [],
    };
  }

  async findPublicSchedule(startTime: Date, endTime: Date, roomId?: string) {
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || startTime >= endTime) {
      throw new BadRequestException('Rentang waktu jadwal tidak valid.');
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        ...(roomId ? { roomId } : {}),
        status: { in: BLOCKING_BOOKING_STATUSES },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
      include: {
        room: { include: { floor: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      events: bookings.map((booking) => ({
        id: booking.id,
        roomId: booking.roomId,
        roomName: booking.room.name,
        floorName: booking.room.floor.name,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
      })),
    };
  }
}
