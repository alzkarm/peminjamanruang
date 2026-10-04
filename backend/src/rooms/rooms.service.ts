import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
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

  async update(id: string, dto: import('./dto/create-room.dto').UpdateRoomDto) {
    await this.findOne(id);

    return this.prisma.room.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.floorId !== undefined ? { floorId: dto.floorId } : {}),
        ...(dto.building !== undefined ? { building: dto.building.trim() } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.isSpecialRoom !== undefined ? { isSpecialRoom: dto.isSpecialRoom } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { floor: true },
    });
  }

  async remove(id: string) {
    const room = await this.findOne(id);
    
    // Check if room has active bookings
    const bookingsCount = await this.prisma.booking.count({
      where: { roomId: id },
    });

    if (bookingsCount > 0) {
      // Soft-delete to preserve booking history integrity
      await this.prisma.room.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: `Ruangan '${room.name}' memiliki riwayat booking, dinonaktifkan secara aman.` };
    }

    await this.prisma.room.delete({ where: { id } });
    return { message: `Ruangan '${room.name}' berhasil dihapus secara permanen.` };
  }

  async toggleStatus(id: string) {
    const room = await this.findOne(id);
    const updated = await this.prisma.room.update({
      where: { id },
      data: { isActive: !room.isActive },
      include: { floor: true },
    });
    return {
      message: `Status ruangan '${updated.name}' berhasil diubah menjadi ${updated.isActive ? 'Aktif' : 'Nonaktif'}.`,
      room: updated,
    };
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
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
          {
            status: {
              in: [
                BookingStatus.APPROVED,
                BookingStatus.RECOMMENDED,
                BookingStatus.PENDING,
              ],
            },
          },
        ],
      },
      include: {
        room: { include: { floor: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const maintenances = ((await (this.prisma as any).roomMaintenance?.findMany?.({
      where: {
        ...(roomId ? { roomId } : {}),
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
      include: {
        room: { include: { floor: true } },
      },
      orderBy: { startTime: 'asc' },
    })) || []) as any[];

    const bookingEvents = bookings.map((booking) => ({
      id: booking.id,
      roomId: booking.roomId,
      roomName: booking.room.name,
      floorName: booking.room.floor.name,
      title: booking.title,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
    }));

    const maintenanceEvents = maintenances.map((m: any) => ({
      id: m.id,
      roomId: m.roomId,
      roomName: m.room?.name || 'Ruangan',
      floorName: m.room?.floor?.name || 'Lantai Kampus',
      title: `[PEMELIHARAAN] ${m.title}`,
      startTime: m.startTime,
      endTime: m.endTime,
      status: 'MAINTENANCE',
      description: m.description,
    }));

    return {
      events: [...bookingEvents, ...maintenanceEvents],
    };
  }

  async getRecentSubmissions(limit = 5) {
    const bookings = await this.prisma.booking.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        room: {
          include: {
            floor: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            role: true,
            unitName: true,
          },
        },
      },
    });

    return bookings.map((b) => ({
      id: b.id,
      title: b.title,
      roomId: b.roomId,
      roomName: b.room?.name || 'Ruangan Kampus',
      roomCode: b.room?.code || '',
      floorLevel: b.room?.floor?.level ?? 1,
      floorName: b.room?.floor?.name || `Lantai ${b.room?.floor?.level ?? 1}`,
      capacity: b.room?.capacity || 0,
      status: b.status,
      startTime: b.startTime,
      endTime: b.endTime,
      activityType: b.activityType,
      applicantName: b.user?.fullName || 'Civitas YARSI',
      unitName: b.user?.unitName || '',
      createdAt: b.createdAt,
    }));
  }

  /**
   * Smart Room Finder (Task 1.5)
   */
  async smartSearch(dto: {
    date: string;
    startTime: string;
    endTime: string;
    minCapacity?: number;
    facilities?: string[];
    building?: string;
  }) {
    const { date, startTime, endTime, minCapacity, building } = dto;
    if (!date || !startTime || !endTime) {
      throw new BadRequestException('Parameter date, startTime, dan endTime wajib dicantumkan.');
    }

    const sessionStart = new Date(`${date}T${startTime}:00.000Z`);
    const sessionEnd = new Date(`${date}T${endTime}:00.000Z`);

    const rooms = await this.prisma.room.findMany({
      where: {
        isActive: true,
        ...(minCapacity ? { capacity: { gte: Number(minCapacity) } } : {}),
        ...(building ? { building: { contains: building, mode: 'insensitive' } } : {}),
      },
      include: {
        floor: true,
        bookings: {
          where: {
            status: { in: BLOCKING_BOOKING_STATUSES },
            AND: [
              { startTime: { lt: sessionEnd } },
              { endTime: { gt: sessionStart } },
            ],
          },
        },
      },
      orderBy: [{ floor: { level: 'asc' } }, { capacity: 'asc' }],
    });

    const availableRooms = rooms.filter((r) => r.bookings.length === 0);

    return availableRooms.map((r) => ({
      id: r.id,
      code: r.code || r.name,
      name: r.name,
      building: r.building || 'Menara YARSI',
      floorLevel: r.floor.level,
      floorName: r.floor.name,
      capacity: r.capacity || 40,
      isSpecialRoom: r.isSpecialRoom,
      availableSlot: {
        date,
        startTime,
        endTime,
      },
    }));
  }

  /**
   * Maintenance Downtime Scheduler (Task 2.3)
   */
  async getMaintenances() {
    return (this.prisma as any).roomMaintenance.findMany({
      include: {
        room: {
          include: { floor: true },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async createMaintenance(dto: {
    roomId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    createdBy: string;
  }) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Waktu mulai pemeliharaan harus lebih awal dari waktu selesai.');
    }

    const room = await this.findOne(dto.roomId);

    return (this.prisma as any).roomMaintenance.create({
      data: {
        roomId: dto.roomId,
        title: dto.title,
        description: dto.description,
        startTime: dto.startTime,
        endTime: dto.endTime,
        createdBy: dto.createdBy,
      },
      include: {
        room: { include: { floor: true } },
      },
    });
  }

  async removeMaintenance(id: string) {
    return (this.prisma as any).roomMaintenance.delete({
      where: { id },
    });
  }
}

