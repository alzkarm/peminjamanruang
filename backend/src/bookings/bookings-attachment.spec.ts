import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

describe('BookingsService attachment authorization', () => {
  const getAttachment = (booking: unknown, user: { id: string; role: string }) =>
    BookingsService.prototype.getAttachmentForUser.call(
      { prisma: { booking: { findUnique: jest.fn().mockResolvedValue(booking) } } },
      'booking-1',
      user,
    );

  it('allows the booking owner and authorized admins', async () => {
    const booking = { userId: 'owner', attachmentUrl: '/attachments/file.pdf', dokumenUrl: null };
    await expect(getAttachment(booking, { id: 'owner', role: 'USER' })).resolves.toBe('/attachments/file.pdf');
    await expect(getAttachment(booking, { id: 'admin', role: 'ADMIN_UNIV' })).resolves.toBe('/attachments/file.pdf');
  });

  it('rejects anonymous-equivalent and unrelated users', async () => {
    const booking = { userId: 'owner', attachmentUrl: '/attachments/file.pdf', dokumenUrl: null };
    await expect(getAttachment(booking, { id: '', role: 'GUEST' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(getAttachment(booking, { id: 'other', role: 'USER' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing bookings and attachments', async () => {
    await expect(getAttachment(null, { id: 'owner', role: 'USER' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(getAttachment({ userId: 'owner', attachmentUrl: null, dokumenUrl: null }, { id: 'owner', role: 'USER' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
