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

    // Cek sanksi penalti aktif (Task 2.2 Anti-Ghost Booking / Cooling-down)
    const activePenalty = await (this.prisma as any).userPenalty?.findFirst?.({
      where: {
        userId,
        isActive: true,
        coolingDownUntil: { gt: new Date() },
      },
    });
    if (activePenalty) {
      const untilDate = new Date(activePenalty.coolingDownUntil).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      throw new BadRequestException(
        `Akun Anda sedang dalam masa sanksi cooling-down akibat pelanggaran No-Show hingga ${untilDate}. Alasan: ${activePenalty.reason}`
      );
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
          finalNotes.toLowerCase().includes('pengulangan') ||
          finalNotes.toLowerCase().includes('multi-hari') ||
          finalNotes.toLowerCase().includes('pengulangan rutin')));
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
              ? `Permohonan peminjaman sesi (${dateStr}) berhasil diajukan.`
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

  isSpecialOrYayasanRoom(room?: { isSpecialRoom?: boolean; name?: string } | null): boolean {
    if (!room) return false;
    if (room.isSpecialRoom) return true;
    const n = (room.name || '').toLowerCase();
    return n.includes('auditorium') || n.includes('senat') || n.includes('workshop');
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

      const isYayasan = this.isSpecialOrYayasanRoom(booking.room);
      const userRole = currentUser.role as Role;

      // Access Isolation enforcement for status updates:
      if (userRole === Role.ADMIN_UMUM && isYayasan) {
        throw new ForbiddenException('Admin Umum tidak berwenang mengelola permohonan ruangan khusus Yayasan.');
      }
      if (
        (userRole === Role.ADMIN_LPF ||
          userRole === Role.YAYASAN ||
          userRole === Role.ADMIN_UNIV ||
          userRole === Role.ADMIN_YAYASAN) &&
        !isYayasan
      ) {
        throw new ForbiddenException('Admin LPF dan Yayasan tidak berwenang mengelola permohonan ruangan umum.');
      }

      // Validation for Catatan Wajib when returning or rejecting
      if (targetStatus === BookingStatus.REJECTED || targetStatus === BookingStatus.RETURNED) {
        if (!notes) {
          throw new BadRequestException('Catatan alasan wajib diisi ketika permohonan ditolak atau dikembalikan untuk revisi.');
        }
        const canReject =
          userRole === Role.SUPERADMIN ||
          (userRole === Role.ADMIN_UMUM && !isYayasan) ||
          ((userRole === Role.ADMIN_LPF ||
            userRole === Role.YAYASAN ||
            userRole === Role.ADMIN_UNIV ||
            userRole === Role.ADMIN_YAYASAN) &&
            isYayasan);
        if (!canReject) {
          throw new ForbiddenException('Anda tidak berwenang menolak atau mengembalikan permohonan ini.');
        }
      }

      // State Machine Transition Rules
      if (targetStatus === BookingStatus.CANCELED) {
        if (
          booking.userId !== currentUser.id &&
          userRole !== Role.SUPERADMIN &&
          userRole !== Role.ADMIN_UMUM &&
          userRole !== Role.ADMIN_LPF &&
          userRole !== Role.YAYASAN &&
          userRole !== Role.ADMIN_UNIV &&
          userRole !== Role.ADMIN_YAYASAN
        ) {
          throw new ForbiddenException('Hanya pemohon atau Admin yang dapat membatalkan permohonan.');
        }
        if (
          currentStatus === BookingStatus.APPROVED &&
          userRole !== Role.SUPERADMIN &&
          userRole !== Role.YAYASAN &&
          userRole !== Role.ADMIN_YAYASAN
        ) {
          throw new BadRequestException('Peminjaman yang telah disetujui hanya dapat dibatalkan oleh Superadmin atau Yayasan.');
        }
      } else if (!isYayasan) {
        // --- ALUR RUANG UMUM: Pending -> Verified (Admin Umum) -> Approved (Superadmin) ---
        if (targetStatus === BookingStatus.VERIFIED) {
          if (userRole !== Role.ADMIN_UMUM && userRole !== Role.SUPERADMIN) {
            throw new ForbiddenException('Hanya Admin Umum atau Superadmin yang berwenang memverifikasi ruangan umum.');
          }
        } else if (targetStatus === BookingStatus.APPROVED) {
          if (userRole === Role.ADMIN_UMUM) {
            targetStatus = BookingStatus.VERIFIED;
            this.logger.log(`Auto-routing general room booking ${booking.id} to VERIFIED for Superadmin final approval`);
          } else if (userRole !== Role.SUPERADMIN) {
            throw new ForbiddenException('Approval akhir ruangan umum memerlukan otorisasi dari Superadmin.');
          }
        }
      } else {
        // --- ALUR RUANG YAYASAN: Pending -> Recommended (Admin LPF) -> Approved (Yayasan) ---
        if (targetStatus === BookingStatus.RECOMMENDED) {
          if (userRole !== Role.ADMIN_LPF && userRole !== Role.ADMIN_UNIV && userRole !== Role.SUPERADMIN) {
            throw new ForbiddenException('Hanya Admin LPF yang dapat merekomendasikan ruangan khusus ke Yayasan.');
          }
        } else if (targetStatus === BookingStatus.APPROVED) {
          if (userRole === Role.ADMIN_LPF || userRole === Role.ADMIN_UNIV) {
            targetStatus = BookingStatus.RECOMMENDED;
            this.logger.log(`Auto-routing special room booking ${booking.id} to RECOMMENDED for Yayasan approval`);
          } else if (userRole !== Role.YAYASAN && userRole !== Role.ADMIN_YAYASAN && userRole !== Role.SUPERADMIN) {
            throw new ForbiddenException('Ruangan khusus Yayasan memerlukan otorisasi persetujuan final dari Pengurus Yayasan YARSI.');
          }
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
        if (targetStatus === BookingStatus.VERIFIED) {
          finalLogNote = `Diverifikasi oleh Admin Umum (${currentUser.fullName}). Menunggu approval akhir Superadmin.${shouldApplyToGroup ? ` (Seluruh ${targetBookings.length} sesi rutin)` : ''}`;
        } else if (targetStatus === BookingStatus.RECOMMENDED) {
          finalLogNote = `Diverifikasi & Direkomendasikan oleh Admin LPF (${currentUser.fullName}) ke Yayasan YARSI.${shouldApplyToGroup ? ` (Seluruh ${targetBookings.length} sesi rutin)` : ''}`;
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
        if (
          targetStatus === BookingStatus.APPROVED ||
          targetStatus === BookingStatus.RECOMMENDED ||
          targetStatus === BookingStatus.VERIFIED
        ) {
          await this.scheduling.assertAvailable(
            b.roomId,
            b.startTime,
            b.endTime,
            b.id,
            tx,
          );
        }

        const passToken = (b as any).passToken || (targetStatus === BookingStatus.APPROVED ? `PASS-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}` : undefined);

        const updated = await tx.booking.update({
          where: { id: b.id },
          data: {
            status: targetStatus as PrismaBookingStatus,
            ...(passToken ? { passToken } : {}),
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

        const isYayasan = this.isSpecialOrYayasanRoom(booking.room);

        // Access Isolation enforcement for batch updates:
        if (userRole === Role.ADMIN_UMUM && isYayasan) {
          throw new ForbiddenException('Admin Umum tidak berwenang mengelola permohonan ruangan khusus Yayasan.');
        }
        if (
          (userRole === Role.ADMIN_LPF ||
            userRole === Role.YAYASAN ||
            userRole === Role.ADMIN_UNIV ||
            userRole === Role.ADMIN_YAYASAN) &&
          !isYayasan
        ) {
          throw new ForbiddenException('Admin LPF dan Yayasan tidak berwenang mengelola permohonan ruangan umum.');
        }

        if (targetStatus === BookingStatus.REJECTED || targetStatus === BookingStatus.RETURNED) {
          if (!notes) {
            throw new BadRequestException('Catatan alasan wajib diisi ketika permohonan ditolak atau dikembalikan untuk revisi.');
          }
        }

        if (!isYayasan) {
          // --- ALUR RUANG UMUM ---
          if (targetStatus === BookingStatus.VERIFIED) {
            if (userRole !== Role.ADMIN_UMUM && userRole !== Role.SUPERADMIN) {
              throw new ForbiddenException('Hanya Admin Umum atau Superadmin yang berwenang memverifikasi ruangan umum.');
            }
          } else if (targetStatus === BookingStatus.APPROVED) {
            if (userRole === Role.ADMIN_UMUM) {
              targetStatus = BookingStatus.VERIFIED;
            } else if (userRole !== Role.SUPERADMIN) {
              throw new ForbiddenException('Approval akhir ruangan umum memerlukan otorisasi dari Superadmin.');
            }
          }
        } else {
          // --- ALUR RUANG YAYASAN ---
          if (targetStatus === BookingStatus.RECOMMENDED) {
            if (userRole !== Role.ADMIN_LPF && userRole !== Role.ADMIN_UNIV && userRole !== Role.SUPERADMIN) {
              throw new ForbiddenException('Hanya Admin LPF yang dapat merekomendasikan ruangan khusus ke Yayasan.');
            }
          } else if (targetStatus === BookingStatus.APPROVED) {
            if (userRole === Role.ADMIN_LPF || userRole === Role.ADMIN_UNIV) {
              targetStatus = BookingStatus.RECOMMENDED;
            } else if (userRole !== Role.YAYASAN && userRole !== Role.ADMIN_YAYASAN && userRole !== Role.SUPERADMIN) {
              throw new ForbiddenException('Ruangan khusus Yayasan memerlukan otorisasi persetujuan final dari Pengurus Yayasan YARSI.');
            }
          }
        }

        if (
          targetStatus === BookingStatus.APPROVED ||
          targetStatus === BookingStatus.RECOMMENDED ||
          targetStatus === BookingStatus.VERIFIED
        ) {
          await this.scheduling.assertAvailable(
            booking.roomId,
            booking.startTime,
            booking.endTime,
            booking.id,
            tx,
          );
        }

        const passToken = (booking as any).passToken || (targetStatus === BookingStatus.APPROVED ? `PASS-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}` : undefined);

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: targetStatus as PrismaBookingStatus,
            ...(passToken ? { passToken } : {}),
          },
          include: {
            room: { include: { floor: true } },
            user: true,
            logistik: true,
            approvalLogs: { orderBy: { createdAt: 'desc' } },
          },
        });

        let finalLogNote = notes;
        if (!finalLogNote) {
          if (targetStatus === BookingStatus.VERIFIED) {
            finalLogNote = `Diverifikasi oleh Admin Umum (${currentUser.fullName}). Menunggu approval akhir Superadmin.`;
          } else if (targetStatus === BookingStatus.RECOMMENDED) {
            finalLogNote = `Diverifikasi oleh Admin LPF (${currentUser.fullName}) & Direkomendasikan ke Yayasan YARSI.`;
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

  async findAll(query: QueryBookingDto, currentUser?: { id: string; role: Role }) {
    const { status, roomId, userId, startDate, endDate, isSpecialRoom } = query;

    let roleAccessCondition: any = {};

    if (currentUser) {
      const r = currentUser.role as Role;
      if (r === Role.ADMIN_UMUM) {
        // Admin Umum CANNOT see bookings for Yayasan rooms (auditorium, senat, workshop, isSpecialRoom)
        roleAccessCondition = {
          room: {
            isSpecialRoom: false,
            AND: [
              { name: { not: { contains: 'auditorium', mode: 'insensitive' } } },
              { name: { not: { contains: 'senat', mode: 'insensitive' } } },
              { name: { not: { contains: 'workshop', mode: 'insensitive' } } },
            ],
          },
        };
      } else if (
        r === Role.ADMIN_LPF ||
        r === Role.YAYASAN ||
        r === Role.ADMIN_UNIV ||
        r === Role.ADMIN_YAYASAN
      ) {
        // Admin LPF and Yayasan CANNOT see bookings for General rooms
        roleAccessCondition = {
          room: {
            OR: [
              { isSpecialRoom: true },
              { name: { contains: 'auditorium', mode: 'insensitive' } },
              { name: { contains: 'senat', mode: 'insensitive' } },
              { name: { contains: 'workshop', mode: 'insensitive' } },
            ],
          },
        };
      }
    }

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
        ...(isSpecialRoom !== undefined ? { room: { isSpecialRoom } } : {}),
        ...roleAccessCondition,
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

  async findOne(id: string, currentUser?: { id: string; role: Role }) {
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

    if (currentUser) {
      const isYayasan = this.isSpecialOrYayasanRoom(booking.room);
      const r = currentUser.role as Role;
      if (r === Role.ADMIN_UMUM && isYayasan) {
        throw new ForbiddenException('Admin Umum tidak memiliki akses ke peminjaman ruangan khusus Yayasan.');
      }
      if (
        (r === Role.ADMIN_LPF ||
          r === Role.YAYASAN ||
          r === Role.ADMIN_UNIV ||
          r === Role.ADMIN_YAYASAN) &&
        !isYayasan
      ) {
        throw new ForbiddenException('Admin LPF dan Yayasan tidak memiliki akses ke peminjaman ruangan umum.');
      }
    }

    return booking;
  }

  async getAttachmentForUser(
    bookingId: string,
    currentUser: { id: string; role: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });
    if (!booking) throw new NotFoundException('Peminjaman tidak ditemukan.');

    const userRole = currentUser.role as Role;
    const isYayasan = this.isSpecialOrYayasanRoom(booking.room);

    if (booking.userId !== currentUser.id && userRole !== Role.SUPERADMIN) {
      if (userRole === Role.ADMIN_UMUM && isYayasan) {
        throw new ForbiddenException('Anda tidak berhak mengakses lampiran ruangan Yayasan.');
      }
      if (
        (userRole === Role.ADMIN_LPF ||
          userRole === Role.YAYASAN ||
          userRole === Role.ADMIN_UNIV ||
          userRole === Role.ADMIN_YAYASAN) &&
        !isYayasan
      ) {
        throw new ForbiddenException('Anda tidak berhak mengakses lampiran ruangan umum.');
      }
      if (
        userRole !== Role.ADMIN_UMUM &&
        userRole !== Role.ADMIN_LPF &&
        userRole !== Role.YAYASAN &&
        userRole !== Role.ADMIN_UNIV &&
        userRole !== Role.ADMIN_YAYASAN
      ) {
        throw new ForbiddenException('Anda tidak berhak mengakses lampiran ini.');
      }
    }

    const storedPath = booking.attachmentUrl || booking.dokumenUrl;
    if (!storedPath) throw new NotFoundException('Lampiran tidak tersedia.');
    return storedPath;
  }

  async verifyByCode(code: string) {
    if (!code) {
      throw new NotFoundException('Kode booking tidak valid.');
    }

    const cleanCode = code.trim();
    const cleanUpper = cleanCode.toUpperCase();
    const cleanPrefix = cleanUpper.replace(/^YARSI-BK-/i, '').toLowerCase();

    let booking: any = null;

    // 1. Cek pencarian berdasarkan passToken
    booking = await (this.prisma.booking as any).findFirst({
      where: {
        OR: [
          { passToken: cleanUpper },
          { passToken: cleanCode },
        ],
      },
      include: {
        room: { include: { floor: true } },
        user: { select: { id: true, fullName: true, username: true, unitName: true, email: true, role: true } },
        logistik: true,
        approvalLogs: {
          include: { approver: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // 2. Jika tidak ditemukan via passToken, cari via UUID / kode awalan
    if (!booking) {
      const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanPrefix);

      if (isFullUuid) {
        booking = await this.prisma.booking.findUnique({
          where: { id: cleanPrefix },
          include: {
            room: { include: { floor: true } },
            user: { select: { id: true, fullName: true, username: true, unitName: true, email: true, role: true } },
            logistik: true,
            approvalLogs: {
              include: { approver: { select: { fullName: true, role: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      } else {
        try {
          const matchedRows: any[] = await this.prisma.$queryRaw`
            SELECT id FROM bookings WHERE id::text ILIKE ${cleanPrefix + '%'} ORDER BY "createdAt" DESC LIMIT 1
          `;
          if (matchedRows && matchedRows.length > 0) {
            booking = await this.prisma.booking.findUnique({
              where: { id: matchedRows[0].id },
              include: {
                room: { include: { floor: true } },
                user: { select: { id: true, fullName: true, username: true, unitName: true, email: true, role: true } },
                logistik: true,
                approvalLogs: {
                  include: { approver: { select: { fullName: true, role: true } } },
                  orderBy: { createdAt: 'desc' },
                },
              },
            });
          }
        } catch (err: any) {
          this.logger.warn(`Failed raw query search for booking code ${cleanPrefix}: ${err.message}`);
        }
      }
    }

    if (!booking) {
      throw new NotFoundException(`Data peminjaman dengan kode/token '${code}' tidak ditemukan.`);
    }

    // Buat passToken otomatis jika booking sudah APPROVED namun belum memiliki token
    if (booking.status === 'APPROVED' && !booking.passToken) {
      const generatedToken = `PASS-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      await (this.prisma.booking as any).update({
        where: { id: booking.id },
        data: { passToken: generatedToken },
      }).catch(() => undefined);
      booking.passToken = generatedToken;
    }

    const approvalLog = booking.approvalLogs?.find(
      (log: any) => log.toStatus === 'APPROVED',
    );

    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const startHH = String(startDate.getHours()).padStart(2, '0');
    const startMM = String(startDate.getMinutes()).padStart(2, '0');
    const endHH = String(endDate.getHours()).padStart(2, '0');
    const endMM = String(endDate.getMinutes()).padStart(2, '0');

    const bookingCode = `YARSI-BK-${booking.id.slice(0, 8).toUpperCase()}`;

    return {
      id: booking.id,
      bookingCode,
      passToken: booking.passToken || bookingCode,
      title: booking.title,
      activityType: booking.activityType,
      roomName: booking.room?.name || 'Ruangan Kampus',
      building: booking.room?.building || 'Gedung Universitas YARSI',
      floor: booking.room?.floor?.level ?? 1,
      userName: booking.user?.fullName || 'Pemohon',
      userNimNidn: booking.user?.username || '-',
      userUnit: booking.user?.unitName || 'Universitas YARSI',
      userRole: booking.user?.role || 'CIVITAS',
      date: dateStr,
      startTime: `${startHH}:${startMM}`,
      endTime: `${endHH}:${endMM}`,
      status: booking.status,
      isValid: booking.status === 'APPROVED',
      approvedAt: approvalLog?.createdAt || (booking.status === 'APPROVED' ? booking.updatedAt : null),
      approvedBy: approvalLog?.approver?.fullName || 'Biro LPF & Pimpinan Universitas YARSI',
      additionalFacilities: booking.additionalFacilities || [],
      logistik: booking.logistik || [],
      notes: booking.notes,
      estimatedAttendees: booking.estimatedAttendees,
      isLeaderApproved: booking.isLeaderApproved,
      securityNotice:
        'Dokumen ini dikeluarkan resmi oleh Sistem Informasi Peminjaman Ruangan Terpadu Universitas YARSI.',
      digitalStamp: {
        issuer: 'Biro Pengelolaan Fasilitas & Logistik (LPF) Universitas YARSI',
        status: booking.status === 'APPROVED' ? 'SAH & TERVERIFIKASI' : 'BELUM FINAL',
        verificationUrl: `https://siperu.yarsi.ac.id/verify/${booking.passToken || bookingCode}`,
        algorithm: 'SHA256-DIGITAL-TOKEN-VERIFIED',
      },
      createdAt: booking.createdAt,
    };
  }

  /**
   * Daily Run-Sheet: Agenda Harian & Checklist Kesiapan Sarpras (Task 1.2)
   */
  async getDailyRunsheet(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

    const bookings = await (this.prisma.booking as any).findMany({
      where: {
        status: { in: [PrismaBookingStatus.APPROVED, PrismaBookingStatus.RECOMMENDED, PrismaBookingStatus.VERIFIED] },
        startTime: {
          gte: new Date(startOfDay.getTime() - 24 * 3600 * 1000), // Rentang lebar untuk time zone safety
          lte: new Date(endOfDay.getTime() + 24 * 3600 * 1000),
        },
      },
      include: {
        room: { include: { floor: true } },
        user: { select: { id: true, fullName: true, username: true, unitName: true, role: true } },
        logistik: true,
        readinessChecklist: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Filter tanggal presisi berbasis WIB
    const filtered = bookings.filter((b) => {
      const bDate = new Date(b.startTime);
      const bDateStr = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
      const searchDateStr = dateStr || `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return bDateStr === searchDateStr;
    });

    return filtered.map((b: any) => {
      const chk = b.readinessChecklist;
      const isAcReady = chk?.isAcReady ?? false;
      const isAudioReady = chk?.isAudioReady ?? false;
      const isLogisticsReady = chk?.isLogisticsReady ?? false;
      const isCleanlinessReady = chk?.isCleanlinessReady ?? false;
      const isFullyReady = isAcReady && isAudioReady && isLogisticsReady && isCleanlinessReady;

      return {
        ...b,
        bookingCode: `YARSI-BK-${b.id.slice(0, 8).toUpperCase()}`,
        readiness: {
          isAcReady,
          isAudioReady,
          isLogisticsReady,
          isCleanlinessReady,
          isFullyReady,
          checkedBy: chk?.checkedBy || null,
          notes: chk?.notes || null,
          updatedAt: chk?.updatedAt || null,
        },
      };
    });
  }

  /**
   * Toggle Checklist Kesiapan Ruangan Operasional (Task 1.2)
   */
  async toggleRunsheetCheck(
    bookingId: string,
    currentUser: { fullName?: string },
    item: 'ac' | 'audio' | 'logistics' | 'cleanliness',
    value: boolean,
    notes?: string,
  ) {
    const fieldMap: Record<string, string> = {
      ac: 'isAcReady',
      audio: 'isAudioReady',
      logistics: 'isLogisticsReady',
      cleanliness: 'isCleanlinessReady',
    };

    const targetField = fieldMap[item];
    if (!targetField) {
      throw new BadRequestException(`Item checklist '${item}' tidak dikenali.`);
    }

    const existing = await (this.prisma as any).roomReadinessChecklist.findUnique({
      where: { bookingId },
    });

    let updated: any;
    if (existing) {
      updated = await (this.prisma as any).roomReadinessChecklist.update({
        where: { bookingId },
        data: {
          [targetField]: value,
          checkedBy: currentUser?.fullName || 'Petugas Lapangan',
          ...(notes ? { notes } : {}),
        },
      });
    } else {
      updated = await (this.prisma as any).roomReadinessChecklist.create({
        data: {
          bookingId,
          [targetField]: value,
          checkedBy: currentUser?.fullName || 'Petugas Lapangan',
          notes,
        },
      });
    }

    const isFullyReady =
      updated.isAcReady &&
      updated.isAudioReady &&
      updated.isLogisticsReady &&
      updated.isCleanlinessReady;

    return {
      success: true,
      checklist: updated,
      isFullyReady,
    };
  }

  /**
   * Auto-Expired & System Release untuk Booking Menggantung (Task 1.3)
   */
  async cleanupExpiredBookings() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const pendingBookings = await this.prisma.booking.findMany({
      where: {
        status: { in: [PrismaBookingStatus.PENDING, PrismaBookingStatus.RETURNED] },
        OR: [
          { createdAt: { lte: twentyFourHoursAgo } },
          { startTime: { lte: now } },
        ],
      },
      include: { room: true },
    });

    if (pendingBookings.length === 0) {
      return { cleanedCount: 0, message: 'Tidak ada booking kadaluwarsa yang perlu dibersihkan.' };
    }

    let cleanedCount = 0;
    for (const b of pendingBookings) {
      try {
        await (this.prisma.booking as any).update({
          where: { id: b.id },
          data: { status: 'EXPIRED' },
        });

        await (this.prisma.approvalLog as any).create({
          data: {
            bookingId: b.id,
            approverId: b.userId,
            fromStatus: b.status,
            toStatus: 'EXPIRED',
            notes: 'Status otomatis diubah menjadi KADALUWARSA (Expired) oleh sistem karena melewati batas toleransi waktu tanpa tindak lanjut.',
          },
        });
        cleanedCount++;
      } catch (err: any) {
        this.logger.warn(`Failed to expire booking ${b.id}: ${err.message}`);
      }
    }

    this.logger.log(`Cleaned up ${cleanedCount} expired booking(s).`);
    return {
      cleanedCount,
      message: `Berhasil melepaskan ${cleanedCount} jadwal booking yang kadaluwarsa.`,
    };
  }

  /**
   * Tokenized Signed Link for 1-Click Executive Approval (Task 1.4)
   */
  generateQuickActionToken(bookingId: string, action: 'APPROVE' | 'REJECT'): string {
    const payload = {
      bookingId,
      action,
      exp: Date.now() + 48 * 3600 * 1000, // 48 jam
    };
    const jsonStr = JSON.stringify(payload);
    const b64Payload = Buffer.from(jsonStr).toString('base64url');
    const secret = process.env.JWT_SECRET || 'siperu-yarsi-secret-2026';
    const hmac = require('crypto').createHmac('sha256', secret);
    hmac.update(b64Payload);
    const sig = hmac.digest('base64url');
    return `${b64Payload}.${sig}`;
  }

  async verifyAndExecuteQuickAction(token: string) {
    if (!token || !token.includes('.')) {
      throw new BadRequestException('Format token persetujuan cepat tidak valid.');
    }

    const [b64Payload, sig] = token.split('.');
    const secret = process.env.JWT_SECRET || 'siperu-yarsi-secret-2026';
    const hmac = require('crypto').createHmac('sha256', secret);
    hmac.update(b64Payload);
    const expectedSig = hmac.digest('base64url');

    if (sig !== expectedSig) {
      throw new ForbiddenException('Tanda tangan digital token tidak cocok atau telah dimanipulasi.');
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      throw new BadRequestException('Tautan persetujuan cepat telah kadaluarsa (melebihi 48 jam).');
    }

    const { bookingId, action } = payload;
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('Data peminjaman tidak ditemukan.');
    }

    if (booking.status === PrismaBookingStatus.APPROVED) {
      return {
        alreadyProcessed: true,
        status: 'APPROVED',
        message: 'Permohonan ini telah disetujui sebelumnya.',
        booking,
      };
    }

    if (booking.status === PrismaBookingStatus.REJECTED || booking.status === PrismaBookingStatus.CANCELED) {
      return {
        alreadyProcessed: true,
        status: booking.status,
        message: `Permohonan ini berstatus ${booking.status} dan tidak dapat diubah lagi.`,
        booking,
      };
    }

    const targetStatus = action === 'APPROVE' ? PrismaBookingStatus.APPROVED : PrismaBookingStatus.REJECTED;
    const passToken = (booking as any).passToken || (targetStatus === PrismaBookingStatus.APPROVED ? `PASS-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}` : undefined);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: targetStatus,
        ...(passToken ? { passToken } : {}),
      },
    });

    await this.prisma.approvalLog.create({
      data: {
        bookingId: booking.id,
        approverId: booking.userId,
        fromStatus: booking.status,
        toStatus: targetStatus,
        notes: `Tindakan dieksekusi secara instan melalui Tautan Resmi Persetujuan Cepat Pimpinan Yayasan YARSI (${action === 'APPROVE' ? 'Disetujui' : 'Ditolak'}).`,
      },
    });

    return {
      success: true,
      action,
      bookingCode: `YARSI-BK-${booking.id.slice(0, 8).toUpperCase()}`,
      roomName: booking.room.name,
      applicantName: booking.user.fullName,
      status: targetStatus,
      passToken: passToken || (booking as any).passToken,
      message: action === 'APPROVE'
        ? 'Permohonan peminjaman berhasil DISETUJUI secara resmi oleh Pimpinan Yayasan.'
        : 'Permohonan peminjaman berhasil DITOLAK.',
    };
  }

  /**
   * Reschedule Mandiri (Task 2.1)
   */
  async requestReschedule(
    bookingId: string,
    currentUser: { id: string; role: string; fullName: string },
    dto: {
      newDate: string;
      newStartTime: string;
      newEndTime: string;
      reason: string;
      newRoomId?: string;
    },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('Data peminjaman tidak ditemukan.');
    }

    const isAdmin = ['SUPERADMIN', 'ADMIN_LPF', 'ADMIN_UNIV', 'ADMIN_YAYASAN'].includes(currentUser.role);
    if (!isAdmin && booking.userId !== currentUser.id) {
      throw new ForbiddenException('Anda tidak berhak mereschedule peminjaman ini.');
    }

    const allowedStatuses: string[] = ['PENDING', 'VERIFIED', 'RECOMMENDED', 'APPROVED', 'RESCHEDULE_PENDING'];
    if (!allowedStatuses.includes(booking.status as string)) {
      throw new BadRequestException(
        `Jadwal peminjaman dengan status ${booking.status} tidak dapat diajukan pindah jadwal.`
      );
    }

    const [startH, startM] = dto.newStartTime.split(':').map(Number);
    const [endH, endM] = dto.newEndTime.split(':').map(Number);
    const [y, m, d] = dto.newDate.split('-').map(Number);

    const newStart = new Date(y, m - 1, d, startH, startM, 0);
    const newEnd = new Date(y, m - 1, d, endH, endM, 0);

    if (newStart >= newEnd) {
      throw new BadRequestException('Jam mulai baru harus lebih awal dari jam selesai.');
    }

    if (newStart <= new Date()) {
      throw new BadRequestException('Jadwal baru harus berada di masa mendatang.');
    }

    const targetRoomId = dto.newRoomId || booking.roomId;

    // Check availability on target room
    const availability = await this.scheduling.checkAvailability(
      targetRoomId,
      newStart,
      newEnd,
      booking.id,
    );

    if (!availability.isAvailable) {
      throw new ConflictException(
        'Ruangan pada jadwal baru yang Anda pilih telah terisi atau sedang dalam pemeliharaan. Silakan pilih waktu atau ruangan lain.'
      );
    }

    const oldDateStr = booking.startTime.toISOString().split('T')[0];
    const oldScheduleStr = `${oldDateStr} (${booking.startTime.toTimeString().slice(0, 5)} - ${booking.endTime.toTimeString().slice(0, 5)} WIB)`;

    const updated = await (this.prisma.booking as any).update({
      where: { id: booking.id },
      data: {
        status: 'RESCHEDULE_PENDING',
        roomId: targetRoomId,
        startTime: newStart,
        endTime: newEnd,
        rescheduleReason: dto.reason,
        originalSchedule: oldScheduleStr,
      },
      include: {
        room: { include: { floor: true } },
        user: true,
      },
    });

    await this.prisma.approvalLog.create({
      data: {
        bookingId: booking.id,
        approverId: currentUser.id,
        fromStatus: booking.status,
        toStatus: 'RESCHEDULE_PENDING' as any,
        notes: `Pengajuan Pindah Jadwal: Dari [${oldScheduleStr}] menjadi [${dto.newDate} ${dto.newStartTime}-${dto.newEndTime} WIB]. Alasan: ${dto.reason}`,
      },
    });

    return {
      success: true,
      message: 'Pengajuan pindah jadwal berhasil diajukan. Menunggu verifikasi tim LPF.',
      booking: updated,
    };
  }

  /**
   * Check-in Peminjaman (Task 2.2)
   */
  async checkInBooking(
    bookingCodeOrId: string,
    currentUser: { id: string; fullName: string; role: string },
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingCodeOrId);
    let booking: any = null;

    if (isUuid) {
      booking = await this.prisma.booking.findUnique({
        where: { id: bookingCodeOrId },
        include: { room: true, user: true },
      });
    }

    if (!booking) {
      booking = await this.prisma.booking.findFirst({
        where: {
          passToken: bookingCodeOrId,
        },
        include: { room: true, user: true },
      });
    }

    if (!booking) {
      throw new NotFoundException('Data peminjaman tidak ditemukan.');
    }

    if (booking.status !== PrismaBookingStatus.APPROVED) {
      throw new BadRequestException(
        `Check-in hanya dapat dilakukan untuk peminjaman berstatus Disetujui (APPROVED). Status saat ini: ${booking.status}`
      );
    }

    await this.prisma.approvalLog.create({
      data: {
        bookingId: booking.id,
        approverId: currentUser.id,
        fromStatus: booking.status,
        toStatus: booking.status,
        notes: `Check-in Kehadiran Berhasil: Petugas (${currentUser.fullName}) mengonfirmasi kehadiran peminjam di ruangan.`,
      },
    });

    return {
      success: true,
      message: `Check-in berhasil dikonfirmasi untuk kegiatan "${booking.title}".`,
      booking,
    };
  }

  /**
   * Deteksi No-Show & Sanksi Otomatis (Task 2.2)
   */
  async detectNoShowBookings() {
    const now = new Date();
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeApproved = await this.prisma.booking.findMany({
      where: {
        status: PrismaBookingStatus.APPROVED,
        startTime: {
          gte: startOfToday,
          lte: fortyFiveMinutesAgo,
        },
      },
      include: {
        approvalLogs: true,
        user: true,
        room: true,
      },
    });

    let detectedCount = 0;
    const penalizedUsers: string[] = [];

    for (const b of activeApproved) {
      const hasCheckedIn = b.approvalLogs.some(
        (log) => log.notes && log.notes.toLowerCase().includes('check-in'),
      );

      if (!hasCheckedIn) {
        try {
          await (this.prisma.booking as any).update({
            where: { id: b.id },
            data: { status: 'NO_SHOW' },
          });

          await this.prisma.approvalLog.create({
            data: {
              bookingId: b.id,
              approverId: b.userId,
              fromStatus: b.status,
              toStatus: 'NO_SHOW' as any,
              notes: 'Status otomatis diubah menjadi NO_SHOW karena tidak melakukan check-in setelah 45 menit jadwal dimulai.',
            },
          });
          detectedCount++;

          const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          const totalNoShow = await this.prisma.booking.count({
            where: {
              userId: b.userId,
              status: 'NO_SHOW' as any,
              createdAt: { gte: sixMonthsAgo },
            },
          });

          if (totalNoShow >= 2) {
            const coolingDownUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            await (this.prisma as any).userPenalty.create({
              data: {
                userId: b.userId,
                bookingId: b.id,
                reason: `Terakumulasi ${totalNoShow}x pelanggaran No-Show (reservasi ruangan tidak digunakan dan tidak dibatalkan).`,
                coolingDownUntil,
                isActive: true,
              },
            });
            penalizedUsers.push(b.user?.fullName || b.userId);
          }
        } catch (err: any) {
          this.logger.warn(`Failed to process no-show for booking ${b.id}: ${err.message}`);
        }
      }
    }

    return {
      detectedCount,
      penalizedUsersCount: penalizedUsers.length,
      penalizedUsers,
      message: `Deteksi selesai: ${detectedCount} peminjaman ditandai NO-SHOW, ${penalizedUsers.length} pengguna dikenai sanksi cooling-down.`,
    };
  }

  async getMyPenalties(userId: string) {
    return (this.prisma as any).userPenalty.findMany({
      where: { userId },
      include: { booking: { select: { id: true, title: true, startTime: true, room: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllPenalties() {
    return (this.prisma as any).userPenalty.findMany({
      include: {
        user: { select: { id: true, fullName: true, username: true, unitName: true, role: true } },
        booking: { select: { id: true, title: true, startTime: true, room: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokePenalty(penaltyId: string) {
    return (this.prisma as any).userPenalty.update({
      where: { id: penaltyId },
      data: { isActive: false },
    });
  }
}


