'use client';

import React, { useState } from 'react';
import { Room, Booking, AcademicBlock } from '@/lib/types';
import { formatDateIndo, formatShortDateIndo, checkTimeOverlap, getDayOfWeekNumber } from '@/lib/utils';
import { EventDetailModal } from './EventDetailModal';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Building,
  Users,
  Info,
  Calendar,
  Sparkles,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

interface CalendarTimelineProps {
  rooms: Room[];
  bookings: Booking[];
  academicBlocks: AcademicBlock[];
  initialDate?: string;
  selectedRoomId?: string;
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

export function CalendarTimeline({
  rooms,
  bookings,
  academicBlocks,
  initialDate,
  selectedRoomId,
}: CalendarTimelineProps) {
  // Current selected date (default to 2026-08-16 or today)
  const [currentDateStr, setCurrentDateStr] = useState<string>(
    initialDate || '2026-08-16'
  );
  const [viewMode, setViewMode] = useState<'day_rooms' | 'week_room'>('day_rooms');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  const [activeRoomId, setActiveRoomId] = useState<string>(
    selectedRoomId || (rooms[0]?.id ?? '')
  );

  // Modal detail
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedAcademic, setSelectedAcademic] = useState<AcademicBlock | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Navigate Date
  const handlePrevDay = () => {
    const d = new Date(currentDateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setCurrentDateStr(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(currentDateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setCurrentDateStr(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setCurrentDateStr('2026-08-16');
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

  // Compute 7 days for week view
  const getWeekDates = (dateStr: string) => {
    const curr = new Date(dateStr + 'T00:00:00');
    const day = curr.getDay(); // 0 is Sun
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(curr.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay.toISOString().slice(0, 10));
    }
    return week;
  };

  const weekDates = getWeekDates(currentDateStr);

  return (
    <div className="space-y-4">
      {/* Top Header & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-yarsi-primary hover:bg-white rounded-lg transition-colors"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yarsi-primary" />
              <span>{formatDateIndo(currentDateStr)}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {viewMode === 'day_rooms'
                ? `Matriks Semua Ruangan Kampus YARSI (${filteredRooms.length} Ruang)`
                : `Jadwal Mingguan untuk 1 Ruangan`}
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

          {/* Room Type Filter */}
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

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('day_rooms')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'day_rooms'
                  ? 'bg-yarsi-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Harian Ruang
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week_room')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'week_room'
                  ? 'bg-yarsi-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mingguan per Ruang
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
      {viewMode === 'day_rooms' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header Row: Rooms */}
              <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(180px,1fr))] border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
                <div className="p-3 font-bold text-xs text-slate-500 border-r border-slate-200 flex items-center justify-center">
                  Jam WIB
                </div>
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-3 border-r border-slate-200 last:border-r-0"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-yarsi-primary bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {room.code}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5 font-semibold">
                        <Users className="w-3 h-3" /> {room.capacity}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                      {room.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">{room.building}</p>
                  </div>
                ))}
              </div>

              {/* Time Slots Rows */}
              <div className="divide-y divide-slate-100">
                {TIME_SLOTS.map((slot) => {
                  const [hourStr] = slot.split(':');
                  const nextHour = (parseInt(hourStr) + 1).toString().padStart(2, '0') + ':00';

                  return (
                    <div
                      key={slot}
                      className="grid grid-cols-[100px_repeat(auto-fit,minmax(180px,1fr))] min-h-[72px]"
                    >
                      {/* Time Column */}
                      <div className="p-2 border-r border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-xs font-bold text-slate-500">
                        <span>{slot}</span>
                        <span className="text-[10px] font-normal text-slate-400">s/d {nextHour}</span>
                      </div>

                      {/* Room Cells */}
                      {filteredRooms.map((room) => {
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
                                  {academic.startTime} - {academic.endTime} • {academic.lecturerName.split(',')[0]}
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
                                  {booking.startTime} - {booking.endTime} • {booking.userName.split(' ')[0]}
                                </p>
                              </button>
                            ) : (
                              <a
                                href={`/dashboard/booking/new?roomId=${room.id}&date=${currentDateStr}&startTime=${slot}&endTime=${nextHour}`}
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
        </div>
      )}

      {/* VIEW 2: WEEKLY VIEW FOR SINGLE ROOM */}
      {viewMode === 'week_room' && (
        <div className="space-y-4">
          {/* Room Selector Tab */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRoomId(r.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activeRoomId === r.id
                    ? 'bg-yarsi-primary text-white border-yarsi-primary shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {r.name} ({r.code})
              </button>
            ))}
          </div>

          {/* Week Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header Row: 7 Days */}
                <div className="grid grid-cols-[90px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
                  <div className="p-3 font-bold text-xs text-slate-500 border-r border-slate-200 flex items-center justify-center">
                    Jam
                  </div>
                  {weekDates.map((dayDateStr) => {
                    const isToday = dayDateStr === '2026-08-16';
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
                        className="grid grid-cols-[90px_repeat(7,1fr)] min-h-[64px]"
                      >
                        <div className="p-2 border-r border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-xs font-semibold text-slate-500">
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

      {/* Booking / Academic Detail Modal */}
      <EventDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        booking={selectedBooking}
        academicBlock={selectedAcademic}
      />
    </div>
  );
}
