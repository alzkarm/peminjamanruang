'use client';

import { useCallback, useEffect, useState } from 'react';
import { roomsApi } from './api';
import { Booking, PublicScheduleEvent } from './types';

const JAKARTA_TIME_ZONE = 'Asia/Jakarta';
const REFRESH_INTERVAL_MS = 60_000;

export function addJakartaDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getJakartaScheduleRange(startDate: string, endDateExclusive: string) {
  return {
    startTime: `${startDate}T00:00:00+07:00`,
    endTime: `${endDateExclusive}T00:00:00+07:00`,
  };
}

export function formatJakartaTime(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

export function getJakartaDateFromIso(value: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function mapPublicEventToBooking(event: PublicScheduleEvent): Booking {
  return {
    id: event.id,
    bookingCode: 'PUBLIC',
    roomId: event.roomId,
    roomName: event.roomName,
    building: '',
    floor: 0,
    userId: '',
    userName: '',
    userEmail: '',
    userNimNidn: '',
    userRole: 'guest',
    userPhone: '',
    userOrganization: '',
    department: '',
    title: '',
    category: 'lainnya',
    description: '',
    estimatedAttendees: 0,
    date: getJakartaDateFromIso(event.startTime),
    startTime: formatJakartaTime(event.startTime),
    endTime: formatJakartaTime(event.endTime),
    status: 'APPROVED',
    requiresYayasanApproval: false,
    equipments: [],
    qrCodeToken: '',
    createdAt: event.startTime,
  };
}

interface PublicScheduleState {
  events: PublicScheduleEvent[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  retry: () => void;
}

export function usePublicSchedule(
  startDate: string,
  endDateExclusive: string,
): PublicScheduleState {
  const [events, setEvents] = useState<PublicScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const load = useCallback(async () => {
    const range = getJakartaScheduleRange(startDate, endDateExclusive);
    setIsLoading(true);
    setError(null);
    setEvents([]);

    try {
      const response = await roomsApi.getPublicSchedule(range.startTime, range.endTime);
      setEvents(response.events.filter((event) => event.status === 'APPROVED'));
      setLastUpdated(new Date());
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Jadwal ruangan tidak dapat dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [endDateExclusive, startDate]);

  useEffect(() => {
    setEvents([]);
    void load();
    const intervalId = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [load, retryToken]);

  return {
    events,
    isLoading,
    error,
    lastUpdated,
    retry: () => setRetryToken((token) => token + 1),
  };
}
