'use client';

import React, { useState, useEffect } from 'react';
import { Room, Booking, AcademicBlock } from '@/lib/types';
import {
  formatDateIndo,
  formatShortDateIndo,
  checkTimeOverlap,
  getDayOfWeekNumber,
  getJakartaDateString,
  formatLocalDateYMD,
  addDaysToDateStr,
  addMonthsToDateStr,
} from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { addJakartaDays, mapPublicEventToBooking, usePublicSchedule } from '@/lib/public-schedule';
import { EventDetailModal } from './EventDetailModal';
import { AuthGateModal } from '@/components/common/AuthGateModal';
import { CalendarGrid } from './CalendarGrid';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Building,
  Users,
  Info,
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  Lock,
  Eye,
  PlusCircle,
} from 'lucide-react';

interface CalendarTimelineProps {
  rooms: Room[];
  initialDate?: string;
  selectedRoomId?: string;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
}

const TIME_SLOTS = [
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
];

function getNextSlotTime(slot: string): string {
  const [hStr, mStr] = slot.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10) + 30;
  if (m >= 60) {
    h += 1;
    m -= 60;
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
function getWeekDates(dateStr: string): string[] {
  const curr = new Date(`${dateStr}T00:00:00Z`);
  const day = curr.getUTCDay();
  const diff = curr.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setUTCDate(diff));

  return Array.from({ length: 7 }, (_, index) => {
    const nextDay = new Date(monday);
    nextDay.setUTCDate(monday.getUTCDate() + index);
    return nextDay.toISOString().slice(0, 10);
  });
}

export function CalendarTimeline({
  rooms,
  initialDate,
  selectedRoomId,
  viewMode: controlledViewMode,
  onViewModeChange,
}: CalendarTimelineProps) {
  const { currentUser } = useAppStore();
  const isGuest = !currentUser || currentUser.role === 'guest';
  const todayDateStr = getJakartaDateString();

  // Current selected date (defaults to today)
  const [currentDateStr, setCurrentDateStr] = useState<string>(
    initialDate || todayDateStr
  );
  const [internalViewMode, setInternalViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  const activeViewMode = controlledViewMode || internalViewMode;

  const setViewMode = (mode: 'day' | 'week' | 'month') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  const [showOnlyUsedRooms, setShowOnlyUsedRooms] = useState<boolean>(false);
  const [activeRoomId, setActiveRoomId] = useState<string>(
    selectedRoomId || (rooms[0]?.id ?? '')
  );

  const weekDates = getWeekDates(currentDateStr);
  const monthStart = currentDateStr.slice(0, 7) + '-01';
  const scheduleStartDate = activeViewMode === 'week'
    ? weekDates[0]
    : activeViewMode === 'month'
      ? monthStart
      : currentDateStr;
  const scheduleEndDate = activeViewMode === 'week'
    ? addJakartaDays(weekDates[6], 1)
    : activeViewMode === 'month'
      ? addMonthsToDateStr(monthStart, 1)
      : addJakartaDays(currentDateStr, 1);
  const publicSchedule = usePublicSchedule(scheduleStartDate, scheduleEndDate);
  const bookings = publicSchedule.events.map(mapPublicEventToBooking);
  const academicBlocks: AcademicBlock[] = [];

  // Modal detail
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedAcademic, setSelectedAcademic] = useState<AcademicBlock | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Auth Gate for Guest slot click
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<{
    roomId: string;
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  const handleSlotClick = (
    e: React.MouseEvent,
    roomId: string,
    roomName: string,
    date: string,
    startTime: string,
    endTime: string
  ) => {
    if (isGuest) {
      e.preventDefault();
      setTargetSlot({ roomId, roomName, date, startTime, endTime });
      setAuthGateOpen(true);
    }
  };

  // Navigate Date (timezone-safe)
  const handlePrev = () => {
    if (activeViewMode === 'day') {
      setCurrentDateStr((prev) => addDaysToDateStr(prev, -1));
    } else if (activeViewMode === 'week') {
      setCurrentDateStr((prev) => addDaysToDateStr(prev, -7));
    } else if (activeViewMode === 'month') {
      setCurrentDateStr((prev) => addMonthsToDateStr(prev, -1));
    }
  };

  const handleNext = () => {
    if (activeViewMode === 'day') {
      setCurrentDateStr((prev) => addDaysToDateStr(prev, 1));
    } else if (activeViewMode === 'week') {
      setCurrentDateStr((prev) => addDaysToDateStr(prev, 7));
    } else if (activeViewMode === 'month') {
      setCurrentDateStr((prev) => addMonthsToDateStr(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDateStr(todayDateStr);
  };

  // Helper for room category
  const getRoomCategory = (r: Room) => {
    const name = (r.name || '').toLowerCase();
    const code = (r.code || '').toLowerCase();
    if (name.includes('pbl') || name.includes('tutorial')) return 'tutorial';
    if (name.includes('skills') || name.includes('skilss')) return 'skills';
    if (name.includes('cbt')) return 'cbt';
    if (name.includes('auditorium') || name.includes('ar-rahman') || name.includes('ar-razi')) return 'auditorium';
    if (name.includes('kuliah') || code.startsWith('uy') || code.startsWith('fk') || code.startsWith('fti')) return 'classroom';
    if (name.includes('senat') || name.includes('seminar') || name.includes('rapat') || name.includes('rektorat')) return 'meeting';
    if (name.includes('lab') || name.includes('anatomi') || name.includes('komputer')) return 'lab';
    return 'other';
  };

  // Distinct floors from rooms
  const floors = Array.from(
    new Set(
      rooms
        .map((r) => (r.floorName ? String(r.floorName) : r.floor !== undefined && r.floor !== null ? String(r.floor) : ''))
        .filter(Boolean)
    )
  );

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (filterFloor !== 'all') {
      const roomFloor = r.floorName ? String(r.floorName) : String(r.floor ?? '');
      if (roomFloor !== filterFloor) return false;
    }
    if (filterBuilding !== 'all' && r.building && r.building !== filterBuilding) return false;
    if (filterRoomType !== 'all') {
      const cat = getRoomCategory(r);
      if (cat !== filterRoomType) return false;
    }
    return true;
  });

  // Active room for selected room views
  const activeRoom = filteredRooms.find((r) => r.id === activeRoomId) || filteredRooms[0] || rooms[0];

  // Distinct buildings
  const buildings = Array.from(new Set(rooms.map((r) => r.building))).filter(Boolean);

  // Day number for academic block checks (1-7)
  const currentDayNum = getDayOfWeekNumber(currentDateStr);

  // Set of room IDs that have active booking or academic block on current date
  const usedRoomIds = new Set<string>();
  bookings.forEach((b) => {
    if (
      b.date === currentDateStr &&
      ['APPROVED', 'PENDING_LPF', 'RECOMMENDED_YAYASAN'].includes(b.status)
    ) {
      usedRoomIds.add(b.roomId);
    }
  });
  academicBlocks.forEach((ab) => {
    if (ab.isActive && ab.dayOfWeek === currentDayNum) {
      usedRoomIds.add(ab.roomId);
    }
  });

  const usedRooms = filteredRooms.filter((r) => usedRoomIds.has(r.id));
  const dayRooms = showOnlyUsedRooms ? usedRooms : filteredRooms;

  // Open modal handler
  const handleOpenBooking = (b: Booking) => {
    setSelectedBooking(b);
    setSelectedAcademic(null);
    setModalOpen(true);
  };

  const handleOpenAcademic = (ab: AcademicBlock) => {
    setSelectedAcademic(ab);
    setSelectedBooking(null);
    setModalOpen(true);
  };

  const currentMonthDate = new Date(currentDateStr + 'T00:00:00');

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Top Header & Controls */}
      <div className="w-full bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
              title={
                activeViewMode === 'day'
                  ? 'Hari Sebelumnya'
                  : activeViewMode === 'week'
                  ? 'Minggu Sebelumnya'
                  : 'Bulan Sebelumnya'
              }
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-yarsi-primary hover:bg-white rounded-lg transition-colors"
            >
              {activeViewMode === 'day'
                ? 'Hari Ini'
                : activeViewMode === 'week'
                ? 'Minggu Ini'
                : 'Bulan Ini'}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
              title={
                activeViewMode === 'day'
                  ? 'Hari Berikutnya'
                  : activeViewMode === 'week'
                  ? 'Minggu Berikutnya'
                  : 'Bulan Berikutnya'
              }
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              {activeViewMode === 'day' && <Calendar className="w-5 h-5 text-yarsi-primary" />}
              {activeViewMode === 'week' && <CalendarRange className="w-5 h-5 text-yarsi-primary" />}
              {activeViewMode === 'month' && <CalendarDays className="w-5 h-5 text-yarsi-primary" />}
              <span>
                {activeViewMode === 'day' && formatDateIndo(currentDateStr)}
                {activeViewMode === 'week' &&
                  weekDates.length > 0 &&
                  `${formatShortDateIndo(weekDates[0])} – ${formatShortDateIndo(weekDates[weekDates.length - 1])}`}
                {activeViewMode === 'month' &&
                  `${MONTH_NAMES[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Semua Ruangan Kampus YARSI ({filteredRooms.length} Ruang)
            </p>
          </div>
        </div>

        {/* Filters & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Building / Floor Filter */}
          <select
            value={floors.length > 0 && buildings.length === 0 ? filterFloor : filterBuilding}
            onChange={(e) => {
              if (floors.length > 0 && buildings.length === 0) {
                setFilterFloor(e.target.value);
              } else {
                setFilterBuilding(e.target.value);
              }
            }}
            aria-label="Filter gedung atau lantai"
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
          >
            <option value="all">Semua Gedung</option>
            {buildings.length > 0
              ? buildings.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))
              : floors.map((fl) => (
                  <option key={fl} value={fl}>
                    Lantai {fl}
                  </option>
                ))}
          </select>

          {/* Room Type Filter */}
          <select
            value={filterRoomType}
            onChange={(e) => setFilterRoomType(e.target.value)}
            aria-label="Filter tipe ruang"
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
          >
            <option value="all">Semua Tipe Ruang</option>
            <option value="tutorial">Ruang Tutorial (PBL)</option>
            <option value="skills">Ruang Skills Lab</option>
            <option value="classroom">Ruang Kuliah</option>
            <option value="cbt">Ruang CBT</option>
            <option value="auditorium">Auditorium</option>
            <option value="meeting">Ruang Rapat & Senat</option>
            <option value="lab">Laboratorium & AI</option>
            <option value="other">Lainnya</option>
          </select>

          {/* View Mode Toggle: Per Hari, Per Minggu, Per Bulan */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
                activeViewMode === 'day'
                  ? 'bg-yarsi-primary text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 ${activeViewMode === 'day' ? 'text-white' : 'text-slate-500'}`} />
              <span>Per Hari</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
                activeViewMode === 'week'
                  ? 'bg-yarsi-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <CalendarRange className={`w-3.5 h-3.5 ${activeViewMode === 'week' ? 'text-white' : 'text-slate-500'}`} />
              <span>Per Minggu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
                activeViewMode === 'month'
                  ? 'bg-yarsi-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <CalendarDays className={`w-3.5 h-3.5 ${activeViewMode === 'month' ? 'text-white' : 'text-slate-500'}`} />
              <span>Per Bulan</span>
            </button>
          </div>
        </div>
      </div>

      {publicSchedule.error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Jadwal publik tidak dapat dimuat. Kalender menampilkan data terakhir jika tersedia.</span>
          <button type="button" onClick={publicSchedule.retry} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-rose-700 px-4 font-bold text-white hover:bg-rose-800">
            Coba Lagi
          </button>
        </div>
      )}
      {publicSchedule.isLoading && publicSchedule.events.length === 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs font-semibold text-emerald-800" role="status" aria-live="polite">
          Memuat jadwal publik...
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-2 text-xs text-slate-600">
        <span className="font-bold text-slate-700">Keterangan:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
          <span>Disetujui / terjadwal</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-dashed border-emerald-400 bg-emerald-50/50 inline-block"></span>
          <span>Tersedia untuk dipinjam</span>
        </span>
      </div>

      {/* VIEW 1: DAY VIEW - GRID RUANGAN PER 30 MENIT */}
      {activeViewMode === 'day' && (
        <div className="w-full min-w-0 space-y-4">
          <div className="w-full min-w-0 overflow-hidden rounded-[16px_4px_16px_16px] border border-slate-200 bg-white shadow-sm">
            <div className="w-full overflow-x-auto">
              <div
                style={{
                  minWidth: `${Math.max(900, 90 + filteredRooms.length * 140)}px`,
                }}
              >

                {/* Rows: Jam per 30 Menit (07:00 - 21:00) */}
                <div className="divide-y divide-slate-100">
                  {TIME_SLOTS.map((slot) => {
                    const nextH = getNextSlotTime(slot);

                    return (
                      <div
                        key={slot}
                        className="grid min-h-[50px]"
                        style={{
                          gridTemplateColumns: `90px repeat(${filteredRooms.length}, minmax(130px, 1fr))`,
                        }}
                      >
                        {/* Sticky Left Column: Jam */}
                        <div className="p-2 border-r border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-xs font-semibold text-slate-500 sticky left-0 z-10">
                          {slot}
                        </div>

                        {/* Room Slots for this 30-min slot */}
                        {filteredRooms.map((room) => {
                          const academic = academicBlocks.find(
                            (ab) =>
                              ab.isActive &&
                              ab.roomId === room.id &&
                              ab.dayOfWeek === currentDayNum &&
                              checkTimeOverlap(slot, nextH, ab.startTime, ab.endTime)
                          );

                          const booking = bookings.find(
                            (b) =>
                              b.roomId === room.id &&
                              b.date === currentDateStr &&
                              b.status === 'APPROVED' &&
                              checkTimeOverlap(slot, nextH, b.startTime, b.endTime)
                          );

                          return (
                            <div
                              key={room.id}
                              className="p-1 border-r border-slate-100 last:border-r-0 group hover:bg-slate-50 transition-colors"
                            >
                              {academic ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAcademic(academic)}
                                  className="w-full h-full p-1.5 text-left bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg text-purple-950 shadow-xs"
                                >
                                  <p className="text-[10px] font-bold line-clamp-1">
                                    {academic.title}
                                  </p>
                                  <p className="text-[9px] text-purple-700">
                                    {academic.startTime} - {academic.endTime}
                                  </p>
                                </button>
                              ) : booking ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBooking(booking)}
                                  className={`w-full h-full p-1.5 text-left rounded-lg border shadow-xs ${
                                    booking.status === 'APPROVED'
                                      ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-950'
                                      : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950'
                                  }`}
                                >
                                  <p className="text-[10px] font-bold line-clamp-1">
                                    Terjadwal
                                  </p>
                                  <p className="text-[9px] opacity-80">
                                    {booking.startTime} - {booking.endTime}
                                  </p>
                                </button>
                              ) : (
                                <a
                                  href={`/dashboard/booking/new?roomId=${room.id}&date=${currentDateStr}&startTime=${slot}&endTime=${nextH}`}
                                  onClick={(e) =>
                                    handleSlotClick(e, room.id, room.name, currentDateStr, slot, nextH)
                                  }
                                  className="w-full h-full min-h-[44px] rounded-lg border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex items-center justify-center group"
                                  title={`Pinjam ${room.name} (${slot} - ${nextH})`}
                                >
                                  <span className="hidden group-hover:inline text-[10px] font-bold text-emerald-700">+ Pinjam</span>
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY VIEW FOR SINGLE ROOM */}
      {activeViewMode === 'week' && (
        <div className="space-y-4">

          <div className="space-y-3 md:hidden">
            {weekDates.map((dayDateStr) => {
              const dayNum = getDayOfWeekNumber(dayDateStr);
              const dayBookings = bookings
                .filter(
                  (booking) =>
                    booking.roomId === activeRoomId &&
                    booking.date === dayDateStr &&
                     booking.status === 'APPROVED'
                )
                .map((booking) => ({ kind: 'booking' as const, item: booking }));
              const dayAcademic = academicBlocks
                .filter(
                  (block) =>
                    block.isActive &&
                    block.roomId === activeRoomId &&
                    block.dayOfWeek === dayNum
                )
                .map((block) => ({ kind: 'academic' as const, item: block }));
              const dayAgenda = [...dayBookings, ...dayAcademic].sort((a, b) =>
                a.item.startTime.localeCompare(b.item.startTime)
              );

              return (
                <section key={dayDateStr} className="overflow-hidden rounded-[14px_3px_14px_14px] border border-slate-200 bg-white">
                  <div className={`flex items-center justify-between border-b px-4 py-3 ${dayDateStr === todayDateStr ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-100'}`}>
                    <h3 className="text-xs font-bold text-slate-900">{formatDateIndo(dayDateStr)}</h3>
                    {dayDateStr === todayDateStr && <span className="text-[10px] font-bold uppercase tracking-wide text-yarsi-primary">Hari ini</span>}
                  </div>
                  {dayAgenda.length ? (
                    <div className="divide-y divide-slate-100">
                      {dayAgenda.map((entry) => (
                        <button key={`${entry.kind}-${entry.item.id}`} type="button" onClick={() => entry.kind === 'booking' ? handleOpenBooking(entry.item) : handleOpenAcademic(entry.item)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                          <span className="w-[74px] shrink-0 font-mono text-xs font-bold text-slate-700">{entry.item.startTime}–{entry.item.endTime}</span>
                          <span className={`h-8 w-1 shrink-0 ${entry.kind === 'academic' ? 'bg-purple-500' : entry.item.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-900">Terjadwal</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <a href={`/dashboard/booking/new?roomId=${activeRoomId}&date=${dayDateStr}`} className="flex min-h-14 items-center justify-between px-4 py-3 text-xs font-bold text-yarsi-primary hover:bg-emerald-50">
                      <span>Tersedia · pilih waktu</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </section>
              );
            })}
          </div>

          {/* Week Grid */}
          <div className="hidden overflow-hidden rounded-[16px_4px_16px_16px] border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header Row: 7 Days */}
                <div
                  className="grid border-b border-slate-200 bg-slate-50 sticky top-0 z-20"
                  style={{
                    gridTemplateColumns: '90px repeat(7, minmax(110px, 1fr))',
                  }}
                >
                  <div className="p-3 font-bold text-xs text-slate-500 border-r border-slate-200 flex items-center justify-center sticky left-0 bg-slate-50 z-20">
                    Jam
                  </div>
                  {weekDates.map((dayDateStr) => {
                    const isToday = dayDateStr === todayDateStr;
                    return (
                      <div
                        key={dayDateStr}
                        className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 ${
                          isToday ? 'bg-emerald-50/80 font-bold' : ''
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-800">
                          {formatShortDateIndo(dayDateStr)}
                        </p>
                        {isToday && (
                          <span className="text-[10px] text-yarsi-primary font-extrabold uppercase">
                            Hari Ini
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Time Slot Rows for Selected Room */}
                <div className="divide-y divide-slate-100">
                  {TIME_SLOTS.map((slot) => {
                    const nextH = getNextSlotTime(slot);

                    return (
                      <div
                        key={slot}
                        className="grid min-h-[64px]"
                        style={{
                          gridTemplateColumns: '90px repeat(7, minmax(110px, 1fr))',
                        }}
                      >
                        <div className="p-2 border-r border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-xs font-semibold text-slate-500 sticky left-0 z-10">
                          {slot}
                        </div>

                        {weekDates.map((dayDateStr) => {
                          const dayNum = getDayOfWeekNumber(dayDateStr);
                          const academic = academicBlocks.find(
                            (ab) =>
                              ab.isActive &&
                              ab.roomId === activeRoomId &&
                              ab.dayOfWeek === dayNum &&
                              checkTimeOverlap(slot, nextH, ab.startTime, ab.endTime)
                          );

                          const booking = bookings.find(
                            (b) =>
                              b.roomId === activeRoomId &&
                              b.date === dayDateStr &&
                               b.status === 'APPROVED' &&
                              checkTimeOverlap(slot, nextH, b.startTime, b.endTime)
                          );

                          return (
                            <div
                              key={dayDateStr}
                              className="p-1 border-r border-slate-100 last:border-r-0 group hover:bg-slate-50 transition-colors"
                            >
                              {academic ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAcademic(academic)}
                                  className="w-full h-full p-1.5 text-left bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg text-purple-950 shadow-xs"
                                >
                                  <p className="text-[10px] font-bold line-clamp-1">
                                    {academic.title}
                                  </p>
                                  <p className="text-[9px] text-purple-700">
                                    {academic.startTime} - {academic.endTime}
                                  </p>
                                </button>
                              ) : booking ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBooking(booking)}
                                  className={`w-full h-full p-1.5 text-left rounded-lg border shadow-xs ${
                                    booking.status === 'APPROVED'
                                      ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-950'
                                      : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950'
                                  }`}
                                >
                                  <p className="text-[10px] font-bold line-clamp-1">
                                    Terjadwal
                                  </p>
                                  <p className="text-[9px] opacity-80">
                                    {booking.startTime} - {booking.endTime}
                                  </p>
                                </button>
                              ) : (
                                <a
                                  href={`/dashboard/booking/new?roomId=${activeRoomId}&date=${dayDateStr}&startTime=${slot}&endTime=${nextH}`}
                                  onClick={(e) => {
                                    const activeRoom = rooms.find((r) => r.id === activeRoomId);
                                    handleSlotClick(
                                      e,
                                      activeRoomId,
                                      activeRoom?.name || 'Ruangan Terpilih',
                                      dayDateStr,
                                      slot,
                                      nextH
                                    );
                                  }}
                                  className="w-full h-full min-h-[48px] rounded-lg border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 flex items-center justify-center text-[10px] text-slate-300 hover:text-emerald-700"
                                >
                                  <span className="hidden group-hover:inline">+ Slot</span>
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MONTHLY VIEW FULL GRID */}
      {activeViewMode === 'month' && (
        <CalendarGrid
          rooms={filteredRooms}
          bookings={bookings}
          academicBlocks={academicBlocks}
          selectedDateStr={currentDateStr}
          hideHeader={true}
          onSelectDate={(date) => {
            setCurrentDateStr(date);
            setViewMode('day');
          }}
        />
      )}

      {/* Booking / Academic Detail Modal */}
      <EventDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        booking={selectedBooking}
        academicBlock={selectedAcademic}
      />

      {/* Auth Gate Modal for Guest Timeline Booking */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        targetRoomId={targetSlot?.roomId}
        targetRoomName={targetSlot?.roomName}
        targetDate={targetSlot?.date}
        targetStartTime={targetSlot?.startTime}
        targetEndTime={targetSlot?.endTime}
      />
    </div>
  );
}
