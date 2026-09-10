'use client';

import React, { useState, useEffect } from 'react';
import { Room, Booking, AcademicBlock } from '@/lib/types';
import { formatDateIndo, formatShortDateIndo, checkTimeOverlap, getDayOfWeekNumber, getTodayDateStr, formatLocalDateYMD, addDaysToDateStr, addMonthsToDateStr, ensureWorkingDay, getNextWorkingDay, getPrevWorkingDay } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
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
} from 'lucide-react';

interface CalendarTimelineProps {
  rooms: Room[];
  bookings: Booking[];
  academicBlocks: AcademicBlock[];
  initialDate?: string;
  selectedRoomId?: string;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
}

const TIME_SLOTS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

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

export function CalendarTimeline({
  rooms,
  bookings,
  academicBlocks,
  initialDate,
  selectedRoomId,
  viewMode: controlledViewMode,
  onViewModeChange,
}: CalendarTimelineProps) {
  const { currentUser } = useAppStore();
  const isGuest = !currentUser || currentUser.role === 'guest';

  // Current selected date (defaults to today)
  const [currentDateStr, setCurrentDateStr] = useState<string>(
    initialDate || getTodayDateStr()
  );
  const [internalViewMode, setInternalViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  const activeViewMode = controlledViewMode || internalViewMode;

  const setViewMode = (mode: 'day' | 'week' | 'month') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  const [showOnlyUsedRooms, setShowOnlyUsedRooms] = useState<boolean>(true);
  const [activeRoomId, setActiveRoomId] = useState<string>(
    selectedRoomId || (rooms[0]?.id ?? '')
  );

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
    setCurrentDateStr(getTodayDateStr());
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (filterBuilding !== 'all' && r.building !== filterBuilding) return false;
    if (filterRoomType !== 'all' && r.type !== filterRoomType) return false;
    return true;
  });

  // Distinct buildings
  const buildings = Array.from(new Set(rooms.map((r) => r.building)));

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

  // Compute 7 days for week view (timezone-safe)
  const getWeekDates = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const curr = new Date(y, m - 1, d, 12, 0, 0);
    const day = curr.getDay(); // 0 is Sun
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(y, m - 1, diff, 12, 0, 0);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
      week.push(formatLocalDateYMD(nextDay));
    }
    return week;
  };

  const weekDates = getWeekDates(currentDateStr);
  const currentMonthDate = new Date(currentDateStr + 'T00:00:00');

  return (
    <div className="space-y-4">
      {/* Top Header & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
          {/* Building Filter */}
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
          >
            <option value="all">Semua Gedung</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Room Type Filter (for day and week modes) */}
          {activeViewMode !== 'month' && (
            <select
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
            >
              <option value="all">Semua Tipe Ruang</option>
              <option value="auditorium">Auditorium</option>
              <option value="classroom">Smart Classroom</option>
              <option value="lab">Lab Komputer & AI</option>
              <option value="meeting">Ruang Rapat</option>
              <option value="studio">Studio Broadcast</option>
              <option value="hall">Aula</option>
            </select>
          )}

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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-2 text-xs text-slate-600">
        <span className="font-bold text-slate-700">Keterangan:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
          <span>Disetujui (Confirmed)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
          <span>Antrean LPF (Review)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sky-500 inline-block"></span>
          <span>Antrean Yayasan</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-600 inline-block"></span>
          <span>Kuliah Semester (Locked)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-dashed border-emerald-400 bg-emerald-50/50 inline-block"></span>
          <span>Slot Kosong / Bebas Pinjam</span>
        </span>
      </div>

      {/* VIEW 1: DAY VIEW - ALL ROOMS MATRIX */}
      {activeViewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {dayRooms.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Tidak Ada Ruangan yang Sedang Digunakan
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Pada {formatDateIndo(currentDateStr)}, tidak ada jadwal kuliah atau peminjaman yang terdaftar. Semua ruangan bebas dipinjam.
              </p>
              <button
                type="button"
                onClick={() => setShowOnlyUsedRooms(false)}
                className="mt-4 px-4 py-2 bg-yarsi-primary hover:bg-yarsi-dark text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Semua Ruangan ({filteredRooms.length})</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="w-full">
                {/* Header Row: Jam & Ruangan Terpakai */}
                <div
                  className="grid w-full border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-xs"
                  style={{
                    gridTemplateColumns: `100px repeat(${dayRooms.length}, minmax(180px, 1fr))`,
                  }}
                >
                  {/* Header Atas Kolom Jam */}
                  <div className="p-3 font-bold text-xs text-slate-700 border-r border-slate-200 flex flex-col items-center justify-center sticky left-0 bg-slate-50 z-20">
                    <span className="font-extrabold text-slate-800">Jam</span>
                    <span className="text-[10px] text-slate-400 font-normal">WIB</span>
                  </div>

                  {/* Header Atas Kolom Ruangan: Ruangan yang sedang dipakai */}
                  <div
                    className="p-3 font-bold text-xs text-slate-700 bg-slate-50 flex items-center justify-center border-l border-slate-200"
                    style={{
                      gridColumn: `span ${dayRooms.length}`,
                    }}
                  >
                    <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                      Ruangan yang sedang dipakai
                    </span>
                  </div>
                </div>

                {/* Time Slots Rows */}
                <div className="divide-y divide-slate-100">
                  {TIME_SLOTS.map((slot) => {
                    const [hourStr] = slot.split(':');
                    const nextHour = (parseInt(hourStr) + 1).toString().padStart(2, '0') + ':00';

                    return (
                      <div
                        key={slot}
                        className="grid w-full min-h-[64px]"
                        style={{
                          gridTemplateColumns: `100px repeat(${dayRooms.length}, minmax(180px, 1fr))`,
                        }}
                      >
                        {/* Time Column */}
                        <div className="p-2 border-r border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-xs font-bold text-slate-500 sticky left-0 z-10">
                          <span>{slot}</span>
                          <span className="text-[10px] font-normal text-slate-400">s/d {nextHour}</span>
                        </div>

                        {/* Room Cells */}
                        {dayRooms.map((room) => {
                        // Check if an academic block overlaps with this slot
                        const academic = academicBlocks.find(
                          (ab) =>
                            ab.isActive &&
                            ab.roomId === room.id &&
                            ab.dayOfWeek === currentDayNum &&
                            checkTimeOverlap(slot, nextHour, ab.startTime, ab.endTime)
                        );

                        // Check if a booking overlaps
                        const booking = bookings.find(
                          (b) =>
                            b.roomId === room.id &&
                            b.date === currentDateStr &&
                            ['APPROVED', 'PENDING_LPF', 'RECOMMENDED_YAYASAN'].includes(b.status) &&
                            checkTimeOverlap(slot, nextHour, b.startTime, b.endTime)
                        );

                        return (
                          <div
                            key={room.id}
                            className="p-1 border-r border-slate-100 last:border-r-0 relative group hover:bg-slate-50/80 transition-colors"
                          >
                            {academic ? (
                              <button
                                type="button"
                                onClick={() => handleOpenAcademic(academic)}
                                className="w-full h-full p-2 text-left bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-xl transition-all shadow-xs flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-purple-900 uppercase">
                                    <GraduationCap className="w-3 h-3 text-purple-700 shrink-0" />
                                    <span className="truncate">{academic.courseCode}</span>
                                  </div>
                                  <p className="text-[11px] font-bold text-purple-950 line-clamp-1 leading-tight mt-0.5">
                                    {academic.title}
                                  </p>
                                </div>
                                <p className="text-[9px] text-purple-700 font-medium truncate mt-1">
                                  {room.name} • {academic.startTime} - {academic.endTime}
                                </p>
                              </button>
                            ) : booking ? (
                              <button
                                type="button"
                                onClick={() => handleOpenBooking(booking)}
                                className={`w-full h-full p-2 text-left rounded-xl border transition-all shadow-xs flex flex-col justify-between ${
                                  booking.status === 'APPROVED'
                                    ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-950'
                                    : booking.status === 'RECOMMENDED_YAYASAN'
                                    ? 'bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-950'
                                    : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 text-[9px] font-bold uppercase tracking-wider">
                                    <span className="truncate">{booking.category}</span>
                                    <span
                                      className={`px-1 py-0.2 rounded text-[8px] font-black ${
                                        booking.status === 'APPROVED'
                                          ? 'bg-emerald-600 text-white'
                                          : booking.status === 'RECOMMENDED_YAYASAN'
                                          ? 'bg-sky-600 text-white'
                                          : 'bg-amber-600 text-white'
                                      }`}
                                    >
                                      {booking.status === 'APPROVED' ? 'OK' : 'REVIEW'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-bold line-clamp-1 leading-tight mt-0.5">
                                    {booking.title}
                                  </p>
                                </div>
                                <p className="text-[9px] font-medium opacity-80 truncate mt-1">
                                  {room.name} • {booking.startTime} - {booking.endTime} • {booking.userName.split(' ')[0]}
                                </p>
                              </button>
                            ) : (
                              <a
                                href={`/dashboard/booking/new?roomId=${room.id}&date=${currentDateStr}&startTime=${slot}&endTime=${nextHour}`}
                                onClick={(e) =>
                                  handleSlotClick(e, room.id, room.name, currentDateStr, slot, nextHour)
                                }
                                className="w-full h-full min-h-[56px] rounded-xl border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all flex items-center justify-center text-[11px] text-slate-300 hover:text-emerald-700 font-medium"
                              >
                                <span className="hidden group-hover:inline">+ Pinjam</span>
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
          )}
        </div>
      )}

      {/* VIEW 2: WEEKLY VIEW FOR SINGLE ROOM */}
      {activeViewMode === 'week' && (
        <div className="space-y-4">
          {/* Week Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                    const isToday = dayDateStr === getTodayDateStr();
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
                    const [h] = slot.split(':');
                    const nextH = (parseInt(h) + 1).toString().padStart(2, '0') + ':00';

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
                              ['APPROVED', 'PENDING_LPF', 'RECOMMENDED_YAYASAN'].includes(b.status) &&
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
                                    {booking.title}
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
