import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  QueryBookingDto,
} from './dto/create-booking.dto';
import { BookingStatus, Role } from '@/common/types';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collision-Proof Atomic Booking Creator
   */
  async create(userId: string, dto: CreateBookingDto, attachmentUrl?: string) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (start >= end) {
      throw new BadRequestException('Waktu mulai harus lebih awal dari waktu selesai.');
    }

    // Atomic interactive Prisma transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify room exists and is active
      const room = await tx.room.findUnique({
        where: { id: dto.roomId },
        include: { floor: true },
      });

      if (!room || !room.isActive) {
        throw new NotFoundException('Ruangan tidak ditemukan atau sedang tidak aktif.');
      }

      // 2. Collision Check: Overlapping active bookings
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          roomId: dto.roomId,
          status: {
            in: [
              BookingStatus.PENDING,
              BookingStatus.RECOMMENDED,
              BookingStatus.APPROVED,
            ],
          },
          AND: [
            { startTime: { lt: end } },
            { endTime: { gt: start } },
          ],
        },
        include: {
          user: { select: { fullName: true, unitName: true } },
        },
      });

      if (conflictingBooking) {
        const conflictStatus =
          conflictingBooking.status === BookingStatus.APPROVED
            ? 'Telah Disetujui'
            : 'Sedang Dalam Review';

        throw new ConflictException({
          message: `Jadwal bentrok dengan peminjaman lain (${conflictStatus}): "${conflictingBooking.title}" oleh ${conflictingBooking.user.fullName} (${conflictingBooking.startTime.toISOString()} - ${conflictingBooking.endTime.toISOString()})`,
          conflictingBookingId: conflictingBooking.id,
          conflictingTitle: conflictingBooking.title,
        });
      }

      // 3. Create Booking
      const facilitiesStr = JSON.stringify(dto.additionalFacilities || []);

      const newBooking = await tx.booking.create({
        data: {
          userId,
          roomId: dto.roomId,
          title: dto.title,
          activityType: dto.activityType.toString(),
          startTime: start,
          endTime: end,
          status: BookingStatus.PENDING,
          additionalFacilities: facilitiesStr,
          notes: dto.notes,
          attachmentUrl,
          isLeaderApproved: dto.isLeaderApproved ?? false,
        },
        include: {
          room: { include: { floor: true } },
          user: { select: { id: true, fullName: true, username: true, unitName: true, role: true } },
        },
      });

      // 4. Create Initial Audit Trail Log
      await tx.approvalLog.create({
        data: {
          bookingId: newBooking.id,
          approverId: userId,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.PENDING,
          notes: 'Permohonan peminjaman berhasil diajukan oleh pemohon.',
        },
      });

      this.logger.log(`Created atomic booking ${newBooking.id} in room ${room.name} by user ${userId}`);
      return newBooking;
    });
  }

  /**
   * Dual-Tier State Machine Transition Handler
   */
  async updateStatus(
    bookingId: string,
    currentUser: { id: string; role: string; fullName: string },
    dto: UpdateBookingStatusDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { room: true, user: true },
      });

      if (!booking) {
        throw new NotFoundException('Peminjaman tidak ditemukan.');
      }

      const currentStatus = booking.status as BookingStatus;
      const targetStatus = dto.status;
      const isSpecialRoom = booking.room.isSpecialRoom;
      const userRole = currentUser.role as Role;

      // State Machine Transition Rules
      if (targetStatus === BookingStatus.CANCELED) {
        // Only owner or admin can cancel
        if (booking.userId !== currentUser.id && userRole !== Role.ADMIN_UNIV) {
          throw new ForbiddenException('Hanya pemohon atau Admin yang dapat membatalkan permohonan.');
        }
        if (currentStatus === BookingStatus.APPROVED || currentStatus === BookingStatus.REJECTED) {
          throw new BadRequestException('Peminjaman yang telah selesai diproses tidak dapat dibatalkan.');
        }
      } else if (targetStatus === BookingStatus.RECOMMENDED) {
        // Only Admin Univ can recommend special room to Yayasan
        if (userRole !== Role.ADMIN_UNIV && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Hanya Admin Universitas (LPF) yang dapat merekomendasikan ke Yayasan.');
        }
        if (!isSpecialRoom) {
          throw new BadRequestException('Ruangan reguler tidak memerlukan rekomendasi ke Yayasan.');
        }
      } else if (targetStatus === BookingStatus.APPROVED) {
        if (isSpecialRoom && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Ruangan khusus (Auditorium/Senat) memerlukan otorisasi persetujuan dari Yayasan YARSI.');
        }
        if (!isSpecialRoom && userRole !== Role.ADMIN_UNIV && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Hanya Admin Universitas yang berwenang menyetujui ruangan reguler.');
        }

        // Final atomic check for collision before approval
        const conflict = await tx.booking.findFirst({
          where: {
            roomId: booking.roomId,
            id: { not: booking.id },
            status: BookingStatus.APPROVED,
            AND: [
              { startTime: { lt: booking.endTime } },
              { endTime: { gt: booking.startTime } },
            ],
          },
        });

        if (conflict) {
          throw new ConflictException(`Tidak dapat menyetujui: ruangan telah disetujui untuk kegiatan lain ("${conflict.title}").`);
        }
      } else if (targetStatus === BookingStatus.REJECTED || targetStatus === BookingStatus.RETURNED) {
        if (userRole !== Role.ADMIN_UNIV && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Hanya Admin yang berwenang menolak atau mengembalikan permohonan.');
        }
      }

      // Update Booking Status
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: targetStatus.toString(),
        },
        include: {
          room: { include: { floor: true } },
          user: true,
          approvalLogs: { orderBy: { createdAt: 'desc' } },
        },
      });

      // Append Audit Log
      await tx.approvalLog.create({
        data: {
          bookingId: booking.id,
          approverId: currentUser.id,
          fromStatus: currentStatus.toString(),
          toStatus: targetStatus.toString(),
          notes: dto.notes || `Status diubah dari ${currentStatus} menjadi ${targetStatus} oleh ${currentUser.fullName}.`,
        },
      });

      this.logger.log(`Booking ${booking.id} transitioned from ${currentStatus} -> ${targetStatus} by ${currentUser.fullName} (${userRole})`);
      return updatedBooking;
    });
  }

  async findAll(query: QueryBookingDto) {
    const { status, roomId, userId, startDate, endDate, isSpecialRoom } = query;

    return this.prisma.booking.findMany({
      where: {
        ...(status ? { status: status.toString() } : {}),
        ...(roomId ? { roomId } : {}),
        ...(userId ? { userId } : {}),
        ...(startDate || endDate
          ? {
              startTime: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
              },
            }
          : {}),
        ...(isSpecialRoom !== undefined
          ? { room: { isSpecialRoom } }
          : {}),
      },
      include: {
        room: { include: { floor: true } },
        user: { select: { id: true, fullName: true, username: true, unitName: true, role: true } },
        approvalLogs: {
          include: { approver: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        feedback: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        room: { include: { floor: true } },
        user: { select: { id: true, fullName: true, username: true, unitName: true, email: true, role: true } },
        approvalLogs: {
          include: { approver: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        feedback: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Peminjaman dengan ID '${id}' tidak ditemukan.`);
    }

    return booking;
  }
}
