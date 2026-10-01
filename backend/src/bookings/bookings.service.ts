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
    const cleanPrefix = cleanCode.replace(/^YARSI-BK-/i, '').toLowerCase();

    let booking: any = null;
    const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanPrefix);

    if (isFullUuid) {
      booking = await this.prisma.booking.findUnique({
        where: { id: cleanPrefix },
        include: {
          room: { include: { floor: true } },
          user: { select: { id: true, fullName: true, username: true, unitName: true, email: true, role: true } },
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

    if (!booking) {
      throw new NotFoundException(`Data peminjaman dengan kode '${code}' tidak ditemukan.`);
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
      approvedBy: approvalLog?.approver?.fullName || 'LPF / Yayasan YARSI',
      securityNotice:
        'Dokumen ini dikeluarkan resmi oleh Sistem Informasi Peminjaman Ruangan Terpadu Universitas YARSI.',
      createdAt: booking.createdAt,
    };
  }
}

