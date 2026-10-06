import { BookingStatus } from '@prisma/client';

export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.VERIFIED,
  BookingStatus.RECOMMENDED,
  BookingStatus.APPROVED,
  BookingStatus.RESCHEDULE_PENDING,
];

export const SERIALIZABLE_MAX_ATTEMPTS = 3;
