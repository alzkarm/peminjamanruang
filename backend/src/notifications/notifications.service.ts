import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  userId: string;
  bookingId?: string;
  title: string;
  message: string;
}

type PrismaTx = Prisma.TransactionClient;

const STATUS_COPY: Record<BookingStatus, { title: string; message: (bookingTitle: string, actor: string, notes?: string) => string }> = {
  PENDING: {
    title: 'Pengajuan Baru',
    message: (t, actor) => `Pengajuan "${t}" oleh ${actor} menunggu verifikasi admin.`,
  },
  VERIFIED: {
    title: 'Pengajuan Terverifikasi',
    message: (t, actor) => `Pengajuan "${t}" telah diverifikasi oleh ${actor}. Menunggu approval final Superadmin.`,
  },
  RECOMMENDED: {
    title: 'Pengajuan Direkomendasikan',
    message: (t, actor) => `Pengajuan "${t}" telah direkomendasikan oleh ${actor}.`,
  },
  APPROVED: {
    title: 'Pengajuan Disetujui',
    message: (t, actor) => `Pengajuan "${t}" telah disetujui final oleh ${actor}. E-Ticket Anda sudah terbit.`,
  },
  REJECTED: {
    title: 'Pengajuan Ditolak',
    message: (t, actor, notes) => `Pengajuan "${t}" ditolak oleh ${actor}.${notes ? ` Alasan: ${notes}` : ''}`,
  },
  RETURNED: {
    title: 'Pengajuan Dikembalikan',
    message: (t, actor, notes) => `Pengajuan "${t}" dikembalikan oleh ${actor} untuk revisi.${notes ? ` Catatan: ${notes}` : ''}`,
  },
  CANCELED: {
    title: 'Pengajuan Dibatalkan',
    message: (t, actor) => `Pengajuan "${t}" dibatalkan oleh ${actor}.`,
  },
  EXPIRED: {
    title: 'Pengajuan Kedaluwarsa',
    message: (t, actor) => `Pengajuan "${t}" kedaluwarsa dan jadwal dilepas.`,
  },
  RESCHEDULE_PENDING: {
    title: 'Permintaan Reschedule',
    message: (t, actor, notes) => `Permintaan reschedule "${t}" oleh ${actor} menunggu persetujuan.${notes ? ` Catatan: ${notes}` : ''}`,
  },
  NO_SHOW: {
    title: 'Tidak Hadir',
    message: (t, actor) => `Pengajuan "${t}" ditandai tidak hadir (no-show).`,
  },
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({ data: input });
  }

  async notifyBookingStatus(
    tx: PrismaTx,
    ownerId: string,
    bookingId: string,
    bookingTitle: string,
    toStatus: BookingStatus,
    actorName: string,
    notes?: string,
  ) {
    const copy = STATUS_COPY[toStatus];
    return tx.notification.create({
      data: { userId: ownerId, bookingId, title: copy.title, message: copy.message(bookingTitle, actorName, notes) },
    });
  }

  async notifyNewSubmission(
    tx: PrismaTx,
    bookingId: string,
    bookingTitle: string,
    requesterName: string,
  ) {
    const staff = await tx.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPERADMIN] } },
      select: { id: true },
    });
    if (staff.length === 0) return 0;
    await tx.notification.createMany({
      data: staff.map((s) => ({
        userId: s.id,
        bookingId,
        title: 'Pengajuan Baru Menunggu Verifikasi',
        message: `Pengajuan "${bookingTitle}" oleh ${requesterName} menunggu verifikasi admin.`,
      })),
    });
    return staff.length;
  }

  /** Notif antrean: booking VERIFIED → semua SUPERADMIN (menunggu approval final). */
  async notifyAwaitingApproval(
    tx: PrismaTx,
    bookingId: string,
    bookingTitle: string,
    verifierName: string,
  ) {
    const supers = await tx.user.findMany({
      where: { role: Role.SUPERADMIN },
      select: { id: true },
    });
    if (supers.length === 0) return 0;
    await tx.notification.createMany({
      data: supers.map((s) => ({
        userId: s.id,
        bookingId,
        title: 'Pengajuan Menunggu Approval Final',
        message: `Pengajuan "${bookingTitle}" sudah diverifikasi ${verifierName} dan menunggu approval final Anda.`,
      })),
    });
    return supers.length;
  }

  async listForUser(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async queueCounts(role: Role) {
    const pending = await this.prisma.booking.count({ where: { status: BookingStatus.PENDING } });
    if (role === Role.SUPERADMIN) {
      const awaitingApproval = await this.prisma.booking.count({ where: { status: BookingStatus.VERIFIED } });
      return { pending, awaitingApproval, total: pending + awaitingApproval };
    }
    return { pending, awaitingApproval: 0, total: pending };
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async markOneRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }
}
