import { BookingStatus } from '@prisma/client';

export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.RECOMMENDED,
  BookingStatus.APPROVED,
];

export const SERIALIZABLE_MAX_ATTEMPTS = 3;
