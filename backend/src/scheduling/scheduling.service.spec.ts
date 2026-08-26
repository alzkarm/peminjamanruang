import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { SchedulingService } from './scheduling.service';

function createDatabase(bookings: any[] = [], room = { id: 'room-1', isActive: true }) {
  return {
    room: {
      findUnique: async ({ where }: any) => (where.id === room.id ? room : null),
    },
    booking: {
      findFirst: async ({ where }: any) =>
        bookings.find(
          (booking) =>
            booking.roomId === where.roomId &&
            where.status.in.includes(booking.status) &&
            (!where.id?.not || booking.id !== where.id.not) &&
            booking.startTime < where.AND[0].startTime.lt &&
            booking.endTime > where.AND[1].endTime.gt,
        ) ?? null,
    },
  };
}

describe('SchedulingService', () => {
  it('finds overlaps for established blocking statuses', async () => {
    const existing = {
      id: 'booking-1',
      roomId: 'room-1',
      status: BookingStatus.PENDING,
      title: 'Rapat fakultas',
      startTime: new Date('2026-08-26T02:00:00.000Z'),
      endTime: new Date('2026-08-26T03:00:00.000Z'),
    };
    const service = new SchedulingService(createDatabase([existing]) as any);

    const result = await service.checkAvailability(
      'room-1',
      new Date('2026-08-26T02:30:00.000Z'),
      new Date('2026-08-26T03:30:00.000Z'),
    );

    expect(result.isAvailable).toBe(false);
    expect(result.conflict?.id).toBe('booking-1');
  });

  it('allows an adjacent booking and ignores non-blocking statuses', async () => {
    const service = new SchedulingService(
      createDatabase([
        {
          id: 'returned', roomId: 'room-1', status: BookingStatus.RETURNED,
          startTime: new Date('2026-08-26T02:00:00.000Z'), endTime: new Date('2026-08-26T04:00:00.000Z'),
        },
        {
          id: 'approved', roomId: 'room-1', status: BookingStatus.APPROVED,
          startTime: new Date('2026-08-26T01:00:00.000Z'), endTime: new Date('2026-08-26T02:00:00.000Z'),
        },
      ]) as any,
    );

    const result = await service.checkAvailability(
      'room-1',
      new Date('2026-08-26T02:00:00.000Z'),
      new Date('2026-08-26T03:00:00.000Z'),
    );
    expect(result.isAvailable).toBe(true);
  });

  it('uses validation errors for invalid ranges and rooms', async () => {
    const service = new SchedulingService(createDatabase() as any);
    await expect(
      service.checkAvailability('room-1', new Date('2026-08-26T03:00:00Z'), new Date('2026-08-26T02:00:00Z')),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.checkAvailability('missing', new Date('2026-08-26T02:00:00Z'), new Date('2026-08-26T03:00:00Z')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns BOOKING_CONFLICT only when an overlap exists', async () => {
    const service = new SchedulingService(
      createDatabase([{ id: 'booking-1', roomId: 'room-1', status: BookingStatus.RECOMMENDED, title: 'Seminar', startTime: new Date('2026-08-26T02:00:00Z'), endTime: new Date('2026-08-26T04:00:00Z') }]) as any,
    );

    try {
      await service.assertAvailable('room-1', new Date('2026-08-26T03:00:00Z'), new Date('2026-08-26T05:00:00Z'));
      throw new Error('Expected conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({ code: 'BOOKING_CONFLICT' });
    }
  });
});
