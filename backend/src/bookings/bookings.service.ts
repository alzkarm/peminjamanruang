import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  UpdateBatchStatusDto,
  QueryBookingDto,
} from './dto/create-booking.dto';
import { BookingStatus, Role } from '@/common/types';
import { BookingStatus as PrismaBookingStatus } from '@prisma/client';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduling: SchedulingService,
  ) {}

  /**
   * Collision-Proof Atomic Booking Creator (Supports Single & Recurring Semester Bookings)
   */
  async create(userId: string, dto: CreateBookingDto, uploadedAttachmentUrl?: string) {
    const baseStart = new Date(dto.startTime);
    const baseEnd = new Date(dto.endTime);

    if (baseStart >= baseEnd) {
      throw new BadRequestException('Waktu mulai harus lebih awal dari waktu selesai.');
    }

    const finalAttachmentUrl = dto.dokumenUrl || uploadedAttachmentUrl;
    const finalNotes = dto.notes || dto.catatan;

    const dates = dto.dates && dto.dates.length > 0 ? dto.dates : [null];
    const isMultiple = dates.length > 1;
    const isRecurring =
      isMultiple ||
      (finalNotes &&
        (finalNotes.toLowerCase().includes('rutin semester') ||
          finalNotes.toLowerCase().includes('peminjaman rutin') ||
          finalNotes.toLowerCase().includes('pengulangan')));
    const bulkGroupId = isRecurring ? `bulk-recur-${Date.now()}-${randomUUID().slice(0, 8)}` : null;

    return this.scheduling.inSerializableTransaction(async (tx) => {
      let firstBooking: any = null;

      for (const dateStr of dates) {
        let sessionStart: Date;
        let sessionEnd: Date;

        if (dateStr) {
          const [year, month, day] = dateStr.split('-').map(Number);
          sessionStart = new Date(baseStart);
          sessionStart.setFullYear(year, month - 1, day);

          sessionEnd = new Date(baseEnd);
          sessionEnd.setFullYear(year, month - 1, day);
        } else {
          sessionStart = baseStart;
          sessionEnd = baseEnd;
        }

        const { room } = await this.scheduling.assertAvailable(
          dto.roomId,
          sessionStart,
          sessionEnd,
          undefined,
          tx,
        );

        const newBooking = await tx.booking.create({
          data: {
            userId,
            roomId: dto.roomId,
            title: dto.title,
            activityType: dto.activityType,
            startTime: sessionStart,
            endTime: sessionEnd,
            status: BookingStatus.PENDING,
            additionalFacilities: dto.additionalFacilities ?? [],
            notes: finalNotes,
            attachmentUrl: finalAttachmentUrl,
            dokumenUrl: finalAttachmentUrl,
            isLeaderApproved: dto.isLeaderApproved ?? false,
            bulkGroupId,
            logistik: dto.logistik && dto.logistik.length > 0 ? {
              create: dto.logistik.map((item) => ({
                jenisItem: item.jenisItem,
                jumlah: item.jumlah,
                catatan: item.catatan,
              })),
            } : undefined,
          },
          include: {
            room: { include: { floor: true } },
            user: { select: { id: true, fullName: true, username: true, unitName: true, role: true } },
            logistik: true,
          },
        });

        await tx.approvalLog.create({
          data: {
            bookingId: newBooking.id,
            approverId: userId,
            fromStatus: PrismaBookingStatus.PENDING,
            toStatus: PrismaBookingStatus.PENDING,
            notes: isMultiple
              ? `Permohonan peminjaman rutin per semester (${dateStr}) berhasil diajukan.`
              : 'Permohonan peminjaman berhasil diajukan oleh pemohon.',
          },
        });

        if (!firstBooking) {
          firstBooking = newBooking;
        }
      }

      this.logger.log(`Created atomic booking(s) in room ${dto.roomId} by user ${userId} (${dates.length} session(s))`);
      return firstBooking;
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
    return this.scheduling.inSerializableTransaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { room: true, user: true },
      });

      if (!booking) {
        throw new NotFoundException('Peminjaman tidak ditemukan.');
      }

      const currentStatus = booking.status as BookingStatus;
      let targetStatus = dto.status;
      const notes = (dto.notes || dto.catatan || '').trim();

      // Check if room requires Yayasan approval (Auditorium, Workshop, Senat, or isSpecialRoom)
      const isAuditoriumOrWorkshop =
        booking.room.isSpecialRoom ||
        booking.room.name.toLowerCase().includes('auditorium') ||
        booking.room.name.toLowerCase().includes('senat') ||
        booking.room.name.toLowerCase().includes('workshop');

      const userRole = currentUser.role as Role;

      // Validation for Catatan Wajib when returning or rejecting
      if (targetStatus === BookingStatus.REJECTED || targetStatus === BookingStatus.RETURNED) {
        if (!notes) {
          throw new BadRequestException('Catatan alasan wajib diisi ketika permohonan ditolak atau dikembalikan untuk revisi.');
        }
        if (userRole !== Role.ADMIN_UNIV && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Hanya Admin yang berwenang menolak atau mengembalikan permohonan.');
        }
      }

      // State Machine Transition Rules
      if (targetStatus === BookingStatus.CANCELED) {
        // Only owner or admin can cancel
        if (booking.userId !== currentUser.id && userRole !== Role.ADMIN_UNIV && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Hanya pemohon atau Admin yang dapat membatalkan permohonan.');
        }
        if (currentStatus === BookingStatus.APPROVED && userRole !== Role.ADMIN_UNIV && userRole !== Role.ADMIN_YAYASAN) {
          throw new BadRequestException('Peminjaman yang telah disetujui hanya dapat dibatalkan oleh Admin LPF / Yayasan.');
        }
      } else if (targetStatus === BookingStatus.RECOMMENDED) {
        // Only Admin Univ can recommend special room to Yayasan
        if (userRole !== Role.ADMIN_UNIV && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Hanya Admin Universitas (LPF) yang dapat merekomendasikan ke Yayasan.');
        }
      } else if (targetStatus === BookingStatus.APPROVED) {
        // Business Rule (Prioritas 2): For Auditorium & Workshop, Admin LPF cannot directly approve;
        // system automatically routes to RECOMMENDED (Direkomendasikan) for Yayasan final approval.
        if (isAuditoriumOrWorkshop && userRole === Role.ADMIN_UNIV) {
          targetStatus = BookingStatus.RECOMMENDED;
          this.logger.log(`Auto-routing special room booking ${booking.id} to RECOMMENDED for Yayasan approval`);
        } else if (isAuditoriumOrWorkshop && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Ruangan khusus (Auditorium/Workshop/Senat) memerlukan otorisasi persetujuan final dari Yayasan YARSI.');
        } else if (!isAuditoriumOrWorkshop && userRole !== Role.ADMIN_UNIV && userRole !== Role.ADMIN_YAYASAN) {
          throw new ForbiddenException('Hanya Admin Universitas yang berwenang menyetujui ruangan reguler.');
        }

      }

      // Determine if we should update all sessions in recurring series
      const shouldApplyToGroup = dto.applyToRecurringGroup && !!booking.bulkGroupId;
      const targetBookings = shouldApplyToGroup
        ? await tx.booking.findMany({
            where: {
              bulkGroupId: booking.bulkGroupId,
              status: currentStatus as PrismaBookingStatus,
            },
            include: { room: true, user: true },
          })
        : [booking];

      // Default notes formatting
      let finalLogNote = notes;
      if (!finalLogNote) {
        if (targetStatus === BookingStatus.RECOMMENDED) {
          finalLogNote = `Diverifikasi oleh LPF (${currentUser.fullName}) & Direkomendasikan ke Sekretariat Yayasan YARSI.${shouldApplyToGroup ? ` (Seluruh ${targetBookings.length} sesi rutin)` : ''}`;
        } else if (targetStatus === BookingStatus.APPROVED) {
          finalLogNote = `Permohonan disetujui secara resmi oleh ${currentUser.fullName} (${userRole}).${shouldApplyToGroup ? ` (Seluruh ${targetBookings.length} sesi rutin)` : ''}`;
        } else if (targetStatus === BookingStatus.CANCELED) {
          finalLogNote = `Peminjaman dibatalkan oleh ${currentUser.fullName}.${shouldApplyToGroup ? ` (Seluruh ${targetBookings.length} sesi rutin)` : ''}`;
        } else {
          finalLogNote = `Status diubah menjadi ${targetStatus} oleh ${currentUser.fullName}.${shouldApplyToGroup ? ` (Seluruh ${targetBookings.length} sesi rutin)` : ''}`;
        }
      }

      let primaryUpdated: any = null;

      for (const b of targetBookings) {
        if (targetStatus === BookingStatus.APPROVED || targetStatus === BookingStatus.RECOMMENDED) {
          await this.scheduling.assertAvailable(
            b.roomId,
            b.startTime,
            b.endTime,
            b.id,
            tx,
          );
        }

        const updated = await tx.booking.update({
          where: { id: b.id },
          data: {
            status: targetStatus as PrismaBookingStatus,
          },
          include: {
            room: { include: { floor: true } },
            user: true,
            logistik: true,
            approvalLogs: { orderBy: { createdAt: 'desc' } },
          },
        });

        await tx.approvalLog.create({
          data: {
            bookingId: b.id,
            approverId: currentUser.id,
            fromStatus: currentStatus as PrismaBookingStatus,
            toStatus: targetStatus as PrismaBookingStatus,
            notes: finalLogNote,
          },
        });

        if (b.id === booking.id || !primaryUpdated) {
          primaryUpdated = updated;
        }
      }

      this.logger.log(`Booking ${booking.id} (${targetBookings.length} session(s)) transitioned from ${currentStatus} -> ${targetStatus} by ${currentUser.fullName} (${userRole})`);
      return primaryUpdated;
    });
  }

  /**
   * Batch Status Transition Handler (Supports Bulk Approval / Rejection)
   */
  async updateBatchStatus(
    currentUser: { id: string; role: string; fullName: string },
    dto: UpdateBatchStatusDto,
  ) {
    return this.scheduling.inSerializableTransaction(async (tx) => {
      const results: any[] = [];
      const userRole = currentUser.role as Role;

      for (const bookingId of dto.bookingIds) {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { room: true, user: true },
        });

        if (!booking) continue;

        const currentStatus = booking.status as BookingStatus;
        let targetStatus = dto.status;
        const notes = (dto.notes || dto.catatan || '').trim();

        const isAuditoriumOrWorkshop =
          booking.room.isSpecialRoom ||
          booking.room.name.toLowerCase().includes('auditorium') ||
          booking.room.name.toLowerCase().includes('senat') ||
          booking.room.name.toLowerCase().includes('workshop');

        if (targetStatus === BookingStatus.APPROVED && isAuditoriumOrWorkshop && userRole === Role.ADMIN_UNIV) {
          targetStatus = BookingStatus.RECOMMENDED;
        }

        if (targetStatus === BookingStatus.APPROVED || targetStatus === BookingStatus.RECOMMENDED) {
          await this.scheduling.assertAvailable(
            booking.roomId,
            booking.startTime,
            booking.endTime,
            booking.id,
            tx,
          );
        }

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: { status: targetStatus as PrismaBookingStatus },
          include: {
            room: { include: { floor: true } },
            user: true,
            logistik: true,
            approvalLogs: { orderBy: { createdAt: 'desc' } },
          },
        });

        let finalLogNote = notes;
        if (!finalLogNote) {
          if (targetStatus === BookingStatus.RECOMMENDED) {
            finalLogNote = `Diverifikasi oleh LPF (${currentUser.fullName}) & Direkomendasikan ke Sekretariat Yayasan YARSI.`;
          } else if (targetStatus === BookingStatus.APPROVED) {
            finalLogNote = `Permohonan disetujui secara resmi oleh ${currentUser.fullName} (${userRole}).`;
          } else if (targetStatus === BookingStatus.CANCELED) {
            finalLogNote = `Peminjaman dibatalkan oleh ${currentUser.fullName}.`;
          } else {
            finalLogNote = `Status diubah menjadi ${targetStatus} oleh ${currentUser.fullName}.`;
          }
        }

        await tx.approvalLog.create({
          data: {
            bookingId: booking.id,
            approverId: currentUser.id,
            fromStatus: currentStatus as PrismaBookingStatus,
            toStatus: targetStatus as PrismaBookingStatus,
            notes: finalLogNote,
          },
        });

        results.push(updated);
      }

      this.logger.log(`Batch updated ${results.length} booking(s) to ${dto.status} by ${currentUser.fullName}`);
      return results;
    });
  }

  /**
   * Dedicated Cancel Booking Handler (Prioritas 6)
   */
  async cancelBooking(
    bookingId: string,
    currentUser: { id: string; role: string; fullName: string },
    reason?: string,
  ) {
    return this.updateStatus(bookingId, currentUser, {
      status: BookingStatus.CANCELED,
      notes: reason || `Dibatalkan oleh pemohon/admin (${currentUser.fullName})`,
    });
  }

  async findAll(query: QueryBookingDto) {
    const { status, roomId, userId, startDate, endDate, isSpecialRoom } = query;

    return this.prisma.booking.findMany({
      where: {
        ...(status ? { status: status as PrismaBookingStatus } : {}),
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
        logistik: true,
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
        logistik: true,
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

  async getAttachmentForUser(
    bookingId: string,
    currentUser: { id: string; role: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, attachmentUrl: true, dokumenUrl: true },
    });
    if (!booking) throw new NotFoundException('Peminjaman tidak ditemukan.');
    if (
      booking.userId !== currentUser.id &&
      currentUser.role !== Role.ADMIN_UNIV &&
      currentUser.role !== Role.ADMIN_YAYASAN
    ) {
      throw new ForbiddenException('Anda tidak berhak mengakses lampiran ini.');
    }
    const storedPath = booking.attachmentUrl || booking.dokumenUrl;
    if (!storedPath) throw new NotFoundException('Lampiran tidak tersedia.');
    return storedPath;
  }
}
