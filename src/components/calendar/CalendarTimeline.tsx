'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Room, Booking, AcademicBlock, BookingStatus } from '@/lib/types';
import {
  formatDateIndo,
  formatShortDateIndo,
  checkTimeOverlap,
  getDayOfWeekNumber,
} from '@/lib/utils';
import { mapBackendStatusToFrontend, roomsApi } from '@/lib/api';
import { EventDetailModal } from './EventDetailModal';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Info,
  LoaderCircle,
  RefreshCcw,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

interface CalendarTimelineProps {
  rooms: Room[];
  bookings: Booking[];
  academicBlocks: AcademicBlock[];
  initialDate?: string;
  selectedRoomId?: string;
  usePublicSchedule?: boolean;
}

const OPENING_MINUTES = 7 * 60;
const CLOSING_MINUTES = 21 * 60;
const SLOT_MINUTES = 30;
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'APPROVED',
  'PENDING_LPF',
  'RECOMMENDED_YAYASAN',
];

function formatSlot(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

const TIME_SLOTS = Array.from(
  { length: (CLOSING_MINUTES - OPENING_MINUTES) / SLOT_MINUTES },
  (_, index) => formatSlot(OPENING_MINUTES + index * SLOT_MINUTES),
);

function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getSlotPlacement(startTime: string, endTime: string) {
  const rawStart = Math.floor((minutesFromTime(startTime) - OPENING_MINUTES) / SLOT_MINUTES);
  const rawEnd = Math.ceil((minutesFromTime(endTime) - OPENING_MINUTES) / SLOT_MINUTES);
  const start = Math.max(0, Math.min(TIME_SLOTS.length - 1, rawStart));
  const end = Math.max(start + 1, Math.min(TIME_SLOTS.length, rawEnd));
  return { row: start + 1, span: end - start };
}

function addDays(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function jakartaDateString(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getWeekDates(dateStr: string) {
  const [year, month, dayOfMonth] = dateStr.split('-').map(Number);
  const current = new Date(Date.UTC(year, month - 1, dayOfMonth));
  const day = current.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(dateStr, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function toPrivacySafeBooking(event: {
  id: string;
  roomId: string;
  roomName: string;
  startTime: string;
  endTime: string;
  status: string;
}): Booking {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const formatTime = (value: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value);

  return {
    id: event.id,
    bookingCode: event.id,
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
    title: 'Waktu telah terjadwal',
    category: 'lainnya',
    jenisKegiatan: '',
    description: '',
    estimatedAttendees: 0,
    date: jakartaDateString(start),
    startTime: formatTime(start),
    endTime: formatTime(end),
    status: mapBackendStatusToFrontend(event.status),
    requiresYayasanApproval: false,
    isLeaderApproved: false,
    equipments: [],
    logistik: [],
    approvalLogs: [],
    qrCodeToken: '',
    createdAt: '',
    feedbackSubmitted: false,
  };
}

function bookingTone(status: BookingStatus) {
  if (status === 'APPROVED') {
    return {
      surface: 'bg-emerald-100/95 border-emerald-300 text-emerald-950 hover:bg-emerald-200',
      marker: 'bg-emerald-600',
      label: 'Disetujui',
    };
  }
  if (status === 'RECOMMENDED_YAYASAN') {
    return {
      surface: 'bg-sky-100/95 border-sky-300 text-sky-950 hover:bg-sky-200',
      marker: 'bg-sky-600',
      label: 'Menunggu Yayasan',
    };
  }
  return {
    surface: 'bg-amber-100/95 border-amber-300 text-amber-950 hover:bg-amber-200',
    marker: 'bg-amber-600',
    label: 'Menunggu LPF',
  };
}

export function CalendarTimeline({
  rooms,
  bookings,
  academicBlocks,
  initialDate,
  selectedRoomId,
  usePublicSchedule = false,
}: CalendarTimelineProps) {
  const todayDate = jakartaDateString(new Date());
  const [currentDateStr, setCurrentDateStr] = useState(initialDate || todayDate);
  const [viewMode, setViewMode] = useState<'day_rooms' | 'week_room'>('day_rooms');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterRoomType, setFilterRoomType] = useState('all');
  const [activeRoomId, setActiveRoomId] = useState(selectedRoomId || rooms[0]?.id || '');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedAcademic, setSelectedAcademic] = useState<AcademicBlock | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [publicBookings, setPublicBookings] = useState<Booking[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(usePublicSchedule);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const activeBookings = usePublicSchedule ? publicBookings : bookings;
  const weekDates = useMemo(() => getWeekDates(currentDateStr), [currentDateStr]);
  const buildings = useMemo(
    () => Array.from(new Set(rooms.map((room) => room.building))),
    [rooms],
  );
  const filteredRooms = useMemo(
    () => rooms.filter((room) => {
      if (filterBuilding !== 'all' && room.building !== filterBuilding) return false;
      if (filterRoomType !== 'all' && room.type !== filterRoomType) return false;
      return true;
    }),
    [filterBuilding, filterRoomType, rooms],
  );
  const activeRoom = filteredRooms.find((room) => room.id === activeRoomId) || filteredRooms[0] || null;
  const resolvedActiveRoomId = activeRoom?.id || '';

  useEffect(() => {
    if (resolvedActiveRoomId && resolvedActiveRoomId !== activeRoomId) {
      setActiveRoomId(resolvedActiveRoomId);
    }
  }, [activeRoomId, resolvedActiveRoomId]);

  useEffect(() => {
    if (!usePublicSchedule) return;
    let cancelled = false;
    const rangeStart = viewMode === 'week_room' ? weekDates[0] : currentDateStr;
    const rangeEnd = addDays(rangeStart, viewMode === 'week_room' ? 7 : 1);

    setScheduleLoading(true);
    setScheduleError(null);
    roomsApi
      .getPublicSchedule(
        `${rangeStart}T00:00:00+07:00`,
        `${rangeEnd}T00:00:00+07:00`,
        viewMode === 'week_room' ? resolvedActiveRoomId || undefined : undefined,
      )
      .then(({ events }) => {
        if (!cancelled) setPublicBookings(events.map(toPrivacySafeBooking));
      })
      .catch(() => {
        if (!cancelled) setScheduleError('Jadwal belum dapat dimuat. Periksa koneksi lalu coba lagi.');
      })
      .finally(() => {
        if (!cancelled) setScheduleLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentDateStr, reloadKey, resolvedActiveRoomId, usePublicSchedule, viewMode, weekDates]);

  const navigate = (direction: -1 | 1) => {
    setCurrentDateStr(addDays(currentDateStr, direction * (viewMode === 'week_room' ? 7 : 1)));
  };

  const openBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedAcademic(null);
    setModalOpen(true);
  };

  const openAcademic = (academicBlock: AcademicBlock) => {
    setSelectedAcademic(academicBlock);
    setSelectedBooking(null);
    setModalOpen(true);
  };

  const currentDayNumber = getDayOfWeekNumber(currentDateStr);
  const mobileDates = viewMode === 'week_room' ? weekDates : [currentDateStr];
  const mobileRooms = viewMode === 'week_room' ? (activeRoom ? [activeRoom] : []) : filteredRooms;
  const gridTemplateColumns = `84px repeat(${Math.max(filteredRooms.length, 1)}, minmax(184px, 1fr))`;
  const nowMinutes = minutesFromTime(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date()));

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_35px_-28px_rgba(0,106,78,0.7)]">
        <div className="h-1 bg-gradient-to-r from-yarsi-primary via-emerald-500 to-amber-400" />
        <div className="flex flex-col gap-5 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid w-full grid-cols-[44px_1fr_44px] items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 sm:w-auto">
              <button type="button" onClick={() => navigate(-1)} aria-label={viewMode === 'week_room' ? 'Minggu sebelumnya' : 'Hari sebelumnya'} className="flex min-h-11 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-yarsi-primary hover:shadow-sm active:bg-slate-50">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setCurrentDateStr(todayDate)} className="min-h-11 rounded-lg px-4 text-sm font-bold text-yarsi-primary hover:bg-white hover:shadow-sm disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent disabled:hover:shadow-none" disabled={currentDateStr === todayDate}>
                Hari ini
              </button>
              <button type="button" onClick={() => navigate(1)} aria-label={viewMode === 'week_room' ? 'Minggu berikutnya' : 'Hari berikutnya'} className="flex min-h-11 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-yarsi-primary hover:shadow-sm active:bg-slate-50">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 shrink-0 text-yarsi-primary" aria-hidden="true" />
                <h2 className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                  {viewMode === 'day_rooms' ? formatDateIndo(currentDateStr) : `${formatShortDateIndo(weekDates[0])} – ${formatShortDateIndo(weekDates[6])}`}
                </h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                {viewMode === 'day_rooms' ? `${filteredRooms.length} ruang · tiap baris mewakili 30 menit` : `Jadwal mingguan ${activeRoom?.name || 'ruangan terpilih'} · WIB`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
            <label className="relative">
              <span className="sr-only">Filter gedung</span>
              <Building2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <select value={filterBuilding} onChange={(event) => setFilterBuilding(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-slate-700 shadow-sm outline-none hover:border-slate-400 focus:border-yarsi-primary focus:ring-4 focus:ring-emerald-100 xl:w-44">
                <option value="all">Semua gedung</option>
                {buildings.map((building) => <option key={building} value={building}>{building}</option>)}
              </select>
            </label>

            <label className="relative">
              <span className="sr-only">Filter tipe ruang</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <select value={filterRoomType} onChange={(event) => setFilterRoomType(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-slate-700 shadow-sm outline-none hover:border-slate-400 focus:border-yarsi-primary focus:ring-4 focus:ring-emerald-100 xl:w-48">
                <option value="all">Semua tipe ruang</option>
                <option value="auditorium">Auditorium</option>
                <option value="classroom">Smart Classroom</option>
                <option value="lab">Lab Komputer & AI</option>
                <option value="meeting">Ruang Rapat</option>
                <option value="studio">Studio Broadcast</option>
                <option value="hall">Aula</option>
              </select>
            </label>

            <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100/80 p-1 text-xs font-bold sm:col-span-2 xl:min-w-[292px]">
              <button type="button" onClick={() => setViewMode('day_rooms')} aria-pressed={viewMode === 'day_rooms'} className={`min-h-10 rounded-lg px-3 ${viewMode === 'day_rooms' ? 'bg-white text-yarsi-primary shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}>Semua ruang</button>
              <button type="button" onClick={() => setViewMode('week_room')} aria-pressed={viewMode === 'week_room'} className={`min-h-10 rounded-lg px-3 ${viewMode === 'week_room' ? 'bg-white text-yarsi-primary shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}>Per ruang</button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600" aria-label="Keterangan status jadwal">
          <span className="font-bold text-slate-900">Keterangan</span>
          {[
            ['bg-emerald-600', 'Disetujui'],
            ['bg-amber-500', 'Menunggu LPF'],
            ['bg-sky-600', 'Menunggu Yayasan'],
            ['bg-violet-600', 'Jadwal kuliah'],
          ].map(([tone, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className={`h-2.5 w-2.5 rounded-sm ${tone}`} aria-hidden="true" />{label}</span>
          ))}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-emerald-500 bg-emerald-50" aria-hidden="true" />Bisa dipinjam</span>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Info className="h-3.5 w-3.5 shrink-0 text-yarsi-primary" aria-hidden="true" />Pilih slot kosong untuk mulai meminjam</p>
      </div>

      {scheduleLoading && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          <LoaderCircle className="h-5 w-5 animate-spin text-yarsi-primary" aria-hidden="true" />
          <div><p className="font-bold">Memperbarui jadwal ruangan</p><p className="text-xs text-emerald-700">Mencocokkan agenda terbaru dan ketersediaan slot…</p></div>
        </div>
      )}

      {scheduleError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-rose-950">Jadwal gagal diperbarui</p><p className="mt-0.5 text-xs text-rose-800">{scheduleError}</p></div>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 text-xs font-bold text-rose-800 shadow-sm hover:bg-rose-100"><RefreshCcw className="h-4 w-4" aria-hidden="true" />Coba lagi</button>
        </div>
      )}

      <div className="md:hidden">
        {mobileRooms.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><SlidersHorizontal className="h-5 w-5" aria-hidden="true" /></div>
            <h3 className="mt-3 font-bold text-slate-900">Tidak ada ruang yang cocok</h3>
            <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-slate-500">Ubah filter gedung atau tipe ruang untuk melihat pilihan lain.</p>
            <button type="button" onClick={() => { setFilterBuilding('all'); setFilterRoomType('all'); }} className="mt-4 min-h-11 rounded-lg bg-yarsi-primary px-5 text-sm font-bold text-white hover:bg-yarsi-dark">Hapus filter</button>
          </div>
        ) : (
          <div className="space-y-4">
            {mobileDates.map((date) => (
              <section key={date} aria-labelledby={`agenda-${date}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yarsi-primary">Agenda ruang</p><h3 id={`agenda-${date}`} className="mt-0.5 text-sm font-extrabold text-slate-900">{formatDateIndo(date)}</h3></div>
                  {date === todayDate && <span className="rounded-md bg-yarsi-primary px-2 py-1 text-[10px] font-bold text-white">Hari ini</span>}
                </div>

                <div className="divide-y divide-slate-100">
                  {mobileRooms.map((room) => {
                    const dayNumber = getDayOfWeekNumber(date);
                    const roomBookings = activeBookings.filter((booking) => booking.roomId === room.id && booking.date === date && ACTIVE_BOOKING_STATUSES.includes(booking.status)).sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const roomAcademics = academicBlocks.filter((academic) => academic.isActive && academic.roomId === room.id && academic.dayOfWeek === dayNumber).sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const agendaCount = roomBookings.length + roomAcademics.length;

                    return (
                      <article key={`${date}-${room.id}`} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2"><span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-yarsi-primary ring-1 ring-emerald-200">{room.code}</span><h4 className="truncate font-bold text-slate-950">{room.name}</h4></div>
                            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><span>{room.building}</span><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" aria-hidden="true" />{room.capacity} orang</span></p>
                          </div>
                          <span className={`shrink-0 text-xs font-bold ${agendaCount === 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{agendaCount === 0 ? 'Tersedia' : `${agendaCount} agenda`}</span>
                        </div>

                        {agendaCount > 0 ? (
                          <div className="mt-3 space-y-2">
                            {[
                              ...roomAcademics.map((academic) => ({ kind: 'academic' as const, startTime: academic.startTime, academic })),
                              ...roomBookings.map((booking) => ({ kind: 'booking' as const, startTime: booking.startTime, booking })),
                            ].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((item) => {
                              if (item.kind === 'academic') {
                                return (
                                  <button key={`academic-${item.academic.id}`} type="button" onClick={() => openAcademic(item.academic)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-left hover:border-violet-300 hover:bg-violet-100">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white"><GraduationCap className="h-4 w-4" aria-hidden="true" /></span>
                                    <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-violet-950">{item.academic.startTime}–{item.academic.endTime}</span><span className="block truncate text-xs text-violet-700">{item.academic.courseCode} · {item.academic.title}</span></span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />
                                  </button>
                                );
                              }

                              const tone = bookingTone(item.booking.status);
                              return (
                                <button key={`booking-${item.booking.id}`} type="button" onClick={() => openBooking(item.booking)} className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${tone.surface}`}>
                                  <span className={`h-9 w-1 shrink-0 rounded-full ${tone.marker}`} aria-hidden="true" />
                                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.booking.startTime}–{item.booking.endTime}</span><span className="block truncate text-xs opacity-75">{item.booking.roomName || room.name} · {tone.label}</span></span>
                                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-xs text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />Belum ada agenda terjadwal pada hari ini.</div>
                        )}

                        <Link href={`/dashboard/booking/new?roomId=${room.id}&date=${date}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-yarsi-primary px-4 text-sm font-bold text-white shadow-sm hover:bg-yarsi-dark active:bg-yarsi-darker">Pilih waktu tersedia<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'day_rooms' && (
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          {filteredRooms.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <SlidersHorizontal className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-slate-900">Tidak ada ruang yang sesuai filter</h3>
              <p className="mt-1 text-sm text-slate-500">Hapus atau ubah filter untuk menampilkan matriks jadwal.</p>
              <button type="button" onClick={() => { setFilterBuilding('all'); setFilterRoomType('all'); }} className="mt-4 min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-emerald-300 hover:text-yarsi-primary">Hapus filter</button>
            </div>
          ) : (
            <div className="max-h-[72vh] overflow-auto overscroll-contain">
              <div style={{ minWidth: `${84 + filteredRooms.length * 184}px` }}>
                <div className="sticky top-0 z-30 grid border-b border-slate-200 bg-slate-50/95 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur" style={{ gridTemplateColumns }}>
                  <div className="sticky left-0 z-40 flex items-center justify-center border-r border-slate-200 bg-slate-100 px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">WIB</div>
                  {filteredRooms.map((room) => {
                    const roomBookings = activeBookings.filter((booking) => booking.roomId === room.id && booking.date === currentDateStr && ACTIVE_BOOKING_STATUSES.includes(booking.status));
                    const roomAcademics = academicBlocks.filter((academic) => academic.isActive && academic.roomId === room.id && academic.dayOfWeek === currentDayNumber);
                    const busyNow = currentDateStr === todayDate && (
                      roomBookings.some((booking) => checkTimeOverlap(formatSlot(nowMinutes), formatSlot(nowMinutes + 1), booking.startTime, booking.endTime)) ||
                      roomAcademics.some((academic) => checkTimeOverlap(formatSlot(nowMinutes), formatSlot(nowMinutes + 1), academic.startTime, academic.endTime))
                    );

                    return (
                      <div key={room.id} className="min-w-0 border-r border-slate-200 px-3 py-2.5 last:border-r-0">
                        <div className="flex items-center justify-between gap-2"><span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-yarsi-primary ring-1 ring-emerald-200">{room.code}</span><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Users className="h-3 w-3" aria-hidden="true" />{room.capacity}</span></div>
                        <h3 className="mt-1.5 truncate text-xs font-extrabold text-slate-950" title={room.name}>{room.name}</h3>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] text-slate-500">{room.building}</span>
                          {currentDateStr === todayDate && nowMinutes >= OPENING_MINUTES && nowMinutes < CLOSING_MINUTES ? (
                            <span className={`inline-flex shrink-0 items-center gap-1 text-[9px] font-bold ${busyNow ? 'text-rose-700' : 'text-emerald-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${busyNow ? 'bg-rose-500' : 'bg-emerald-500'}`} aria-hidden="true" />{busyNow ? 'Terisi' : 'Tersedia'}</span>
                          ) : <span className="shrink-0 text-[9px] font-semibold text-slate-400">{roomBookings.length + roomAcademics.length} agenda</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="relative grid bg-white" style={{ gridTemplateColumns, gridTemplateRows: `repeat(${TIME_SLOTS.length}, 52px)` }}>
                  {TIME_SLOTS.map((slot, slotIndex) => {
                    const nextSlot = formatSlot(OPENING_MINUTES + (slotIndex + 1) * SLOT_MINUTES);
                    const isHour = slot.endsWith(':00');
                    return (
                      <React.Fragment key={slot}>
                        <div className={`sticky left-0 z-20 flex flex-col items-center justify-start border-r border-slate-200 bg-slate-50/95 pt-2 text-xs font-bold ${isHour ? 'text-slate-700' : 'text-slate-400'}`} style={{ gridColumn: 1, gridRow: slotIndex + 1 }}>{slot}</div>
                        {filteredRooms.map((room, roomIndex) => (
                          <Link key={`${room.id}-${slot}`} href={`/dashboard/booking/new?roomId=${room.id}&date=${currentDateStr}&startTime=${slot}&endTime=${nextSlot}`} aria-label={`Pinjam ${room.name}, ${formatDateIndo(currentDateStr)}, ${slot} sampai ${nextSlot}`} className={`group flex items-center justify-center border-r border-slate-100 transition-colors hover:bg-emerald-50/70 focus-visible:z-10 focus-visible:bg-emerald-50 ${isHour ? 'border-t border-t-slate-200' : 'border-t border-dashed border-t-slate-100'}`} style={{ gridColumn: roomIndex + 2, gridRow: slotIndex + 1 }}>
                            <span className="rounded-md border border-emerald-200 bg-white/90 px-2 py-1 text-[10px] font-bold text-emerald-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">+ Pinjam</span>
                          </Link>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {filteredRooms.flatMap((room, roomIndex) => {
                    const academics = academicBlocks.filter((academic) => academic.isActive && academic.roomId === room.id && academic.dayOfWeek === currentDayNumber);
                    const roomBookings = activeBookings.filter((booking) => booking.roomId === room.id && booking.date === currentDateStr && ACTIVE_BOOKING_STATUSES.includes(booking.status));
                    return [
                      ...academics.map((academic) => {
                        const placement = getSlotPlacement(academic.startTime, academic.endTime);
                        return (
                          <button key={`academic-${room.id}-${academic.id}`} type="button" onClick={() => openAcademic(academic)} className="z-10 m-1 overflow-hidden rounded-lg border border-violet-300 bg-violet-100/95 p-2 text-left text-violet-950 shadow-sm hover:border-violet-400 hover:bg-violet-200 hover:shadow-md" style={{ gridColumn: roomIndex + 2, gridRow: `${placement.row} / span ${placement.span}` }}>
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-violet-800"><GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{academic.courseCode}</span></span>
                            <span className="mt-0.5 block truncate text-[11px] font-bold">{academic.title}</span><span className="mt-1 block truncate text-[10px] font-medium text-violet-700">{academic.startTime}–{academic.endTime}</span>
                          </button>
                        );
                      }),
                      ...roomBookings.map((booking) => {
                        const placement = getSlotPlacement(booking.startTime, booking.endTime);
                        const tone = bookingTone(booking.status);
                        return (
                          <button key={`booking-${room.id}-${booking.id}`} type="button" onClick={() => openBooking(booking)} className={`z-10 m-1 overflow-hidden rounded-lg border p-2 text-left shadow-sm hover:shadow-md ${tone.surface}`} style={{ gridColumn: roomIndex + 2, gridRow: `${placement.row} / span ${placement.span}` }}>
                            <span className="flex items-center justify-between gap-2 text-[9px] font-extrabold uppercase tracking-wide"><span className="truncate">{booking.roomName || room.name}</span><span className={`h-2 w-2 shrink-0 rounded-full ${tone.marker}`} aria-hidden="true" /></span>
                            <span className="mt-1 block truncate text-[11px] font-bold">{booking.startTime}–{booking.endTime}</span>{placement.span > 1 && <span className="mt-0.5 block truncate text-[10px] opacity-75">{tone.label}</span>}
                          </button>
                        );
                      }),
                    ];
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'week_room' && (
        <div className="hidden space-y-3 md:block">
          {filteredRooms.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Pilih ruangan">
              {filteredRooms.map((room) => (
                <button key={room.id} type="button" onClick={() => setActiveRoomId(room.id)} aria-pressed={resolvedActiveRoomId === room.id} className={`min-h-10 whitespace-nowrap rounded-xl border px-3.5 text-xs font-bold ${resolvedActiveRoomId === room.id ? 'border-yarsi-primary bg-yarsi-primary text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-yarsi-primary'}`}>
                  {room.name} <span className={resolvedActiveRoomId === room.id ? 'text-emerald-100' : 'text-slate-400'}>· {room.code}</span>
                </button>
              ))}
            </div>
          )}

          {!activeRoom ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center"><p className="font-bold text-slate-900">Tidak ada ruang yang sesuai filter.</p><button type="button" onClick={() => { setFilterBuilding('all'); setFilterRoomType('all'); }} className="mt-3 min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:text-yarsi-primary">Hapus filter</button></div>
          ) : (
            <div className="max-h-[72vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="min-w-[940px]">
                <div className="sticky top-0 z-30 grid grid-cols-[84px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                  <div className="sticky left-0 z-40 flex items-center justify-center border-r border-slate-200 bg-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-500">WIB</div>
                  {weekDates.map((date) => (
                    <div key={date} className={`border-r border-slate-200 px-2 py-3 text-center last:border-r-0 ${date === todayDate ? 'bg-emerald-50' : ''}`}><p className={`text-xs font-extrabold ${date === todayDate ? 'text-yarsi-primary' : 'text-slate-800'}`}>{formatShortDateIndo(date)}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500">{date === todayDate ? 'Hari ini' : date.slice(-2)}</p></div>
                  ))}
                </div>

                <div className="relative grid grid-cols-[84px_repeat(7,1fr)] bg-white" style={{ gridTemplateRows: `repeat(${TIME_SLOTS.length}, 52px)` }}>
                  {TIME_SLOTS.map((slot, slotIndex) => {
                    const nextSlot = formatSlot(OPENING_MINUTES + (slotIndex + 1) * SLOT_MINUTES);
                    const isHour = slot.endsWith(':00');
                    return (
                      <React.Fragment key={slot}>
                        <div className={`sticky left-0 z-20 flex justify-center border-r border-slate-200 bg-slate-50/95 pt-2 text-xs font-bold ${isHour ? 'text-slate-700' : 'text-slate-400'}`} style={{ gridColumn: 1, gridRow: slotIndex + 1 }}>{slot}</div>
                        {weekDates.map((date, dateIndex) => (
                          <Link key={`${date}-${slot}`} href={`/dashboard/booking/new?roomId=${activeRoom.id}&date=${date}&startTime=${slot}&endTime=${nextSlot}`} aria-label={`Pinjam ${activeRoom.name}, ${formatDateIndo(date)}, ${slot} sampai ${nextSlot}`} className={`group flex items-center justify-center border-r border-slate-100 hover:bg-emerald-50/70 focus-visible:z-10 focus-visible:bg-emerald-50 ${isHour ? 'border-t border-t-slate-200' : 'border-t border-dashed border-t-slate-100'}`} style={{ gridColumn: dateIndex + 2, gridRow: slotIndex + 1 }}>
                            <span className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] font-bold text-emerald-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">+ Pilih</span>
                          </Link>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {weekDates.flatMap((date, dateIndex) => {
                    const dayNumber = getDayOfWeekNumber(date);
                    const academics = academicBlocks.filter((academic) => academic.isActive && academic.roomId === activeRoom.id && academic.dayOfWeek === dayNumber);
                    const roomBookings = activeBookings.filter((booking) => booking.roomId === activeRoom.id && booking.date === date && ACTIVE_BOOKING_STATUSES.includes(booking.status));
                    return [
                      ...academics.map((academic) => {
                        const placement = getSlotPlacement(academic.startTime, academic.endTime);
                        return <button key={`academic-${date}-${academic.id}`} type="button" onClick={() => openAcademic(academic)} className="z-10 m-1 overflow-hidden rounded-lg border border-violet-300 bg-violet-100/95 p-2 text-left text-violet-950 shadow-sm hover:bg-violet-200" style={{ gridColumn: dateIndex + 2, gridRow: `${placement.row} / span ${placement.span}` }}><span className="block truncate text-[10px] font-extrabold">{academic.courseCode}</span><span className="mt-0.5 block truncate text-[10px]">{academic.startTime}–{academic.endTime}</span></button>;
                      }),
                      ...roomBookings.map((booking) => {
                        const placement = getSlotPlacement(booking.startTime, booking.endTime);
                        const tone = bookingTone(booking.status);
                        return <button key={`booking-${date}-${booking.id}`} type="button" onClick={() => openBooking(booking)} className={`z-10 m-1 overflow-hidden rounded-lg border p-2 text-left shadow-sm ${tone.surface}`} style={{ gridColumn: dateIndex + 2, gridRow: `${placement.row} / span ${placement.span}` }}><span className="block truncate text-[10px] font-extrabold">{booking.roomName || activeRoom.name}</span><span className="mt-0.5 block truncate text-[10px] opacity-75">{booking.startTime}–{booking.endTime}</span></button>;
                      }),
                    ];
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <EventDetailModal isOpen={modalOpen} onClose={() => setModalOpen(false)} booking={selectedBooking} academicBlock={selectedAcademic} />
    </div>
  );
}
