'use client';

import React, { useState } from 'react';
import { Room, Booking, AcademicBlock } from '@/lib/types';
import { EventDetailModal } from './EventDetailModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ArrowUpRight,
} from 'lucide-react';

interface CalendarGridProps {
  rooms: Room[];
  bookings: Booking[];
  academicBlocks: AcademicBlock[];
  onSelectDate?: (dateStr: string) => void;
}

export function CalendarGrid({
  rooms,
  bookings,
  academicBlocks,
  onSelectDate,
}: CalendarGridProps) {
  const today = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(today);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const monthNames = [
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

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate days in month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun
  const startingOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0 is Mon
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < startingOffset; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }
  while (daysArray.length < 42) daysArray.push(null);

  const handleOpenBooking = (b: Booking) => {
    setSelectedBooking(b);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      {/* Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-yarsi-primary ring-1 ring-emerald-100">
            <CalendarIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yarsi-primary">Kalender bulanan</p>
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          </div>
        </div>

        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
            className="flex min-h-11 items-center justify-center rounded-lg text-slate-700 hover:bg-white hover:text-yarsi-primary hover:shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentYear(today.getFullYear());
              setCurrentMonth(today.getMonth());
            }}
            className="min-h-11 rounded-lg px-3 text-sm font-bold text-yarsi-primary hover:bg-white hover:shadow-sm"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
            className="flex min-h-11 items-center justify-center rounded-lg text-slate-700 hover:bg-white hover:text-yarsi-primary hover:shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 border-b border-slate-100 pb-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, index) => <div key={day} className={index > 4 ? 'text-amber-700' : ''}>{day}</div>)}
      </div>

      {/* Calendar Month Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-14 rounded-lg border border-transparent bg-slate-50/60 sm:min-h-[112px]"
              />
            );
          }

          const dateStr = `${currentYear}-${(currentMonth + 1)
            .toString()
            .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;

          const dayBookings = bookings.filter(
            (b) =>
              b.date === dateStr &&
              ['APPROVED', 'PENDING_LPF', 'RECOMMENDED_YAYASAN'].includes(b.status)
          );

          const academicCount = academicBlocks.filter(
            (block) => block.isActive && block.dayOfWeek === (((new Date(`${dateStr}T00:00:00`).getDay() + 6) % 7) + 1),
          ).length;

          return (
            <div
              key={dateStr}
              className={`flex min-h-16 flex-col justify-between rounded-lg border p-1.5 text-left sm:min-h-[112px] sm:p-2 ${
                isToday
                  ? 'border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-500/15'
                  : isPast
                    ? 'border-slate-100 bg-slate-50/40'
                    : 'border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDate?.(dateStr)}
                  aria-label={`Lihat jadwal ${dateStr}, ${dayBookings.length + academicCount} agenda`}
                  className={`text-xs font-bold ${
                    isToday
                      ? 'flex h-7 w-7 items-center justify-center rounded-lg bg-yarsi-primary text-white shadow-sm'
                      : 'flex h-7 w-7 items-center justify-center rounded-lg text-slate-800 hover:bg-emerald-50 hover:text-yarsi-primary'
                  }`}
                >
                  {day}
                </button>

                {dayBookings.length + academicCount > 0 && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {dayBookings.length + academicCount}
                  </span>
                )}
              </div>

              {/* Event Snippets */}
              <div className="hidden sm:block space-y-1 my-1 overflow-hidden">
                {dayBookings.slice(0, 2).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBooking(b);
                    }}
                    className={`block w-full truncate rounded-md border-l-2 p-1.5 text-left text-[10px] font-semibold ${
                      b.status === 'APPROVED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                        : 'border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {b.startTime} {b.title}
                  </button>
                ))}

                {dayBookings.length > 2 && (
                  <span className="block text-center text-[9px] font-bold text-slate-400">
                    +{dayBookings.length - 2} acara lagi
                  </span>
                )}
              </div>

              <button type="button" onClick={() => onSelectDate?.(dateStr)} className="ml-auto hidden items-center gap-1 text-[9px] font-bold text-yarsi-primary hover:text-yarsi-dark sm:inline-flex">
                Lihat hari <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <EventDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        booking={selectedBooking}
      />
    </div>
  );
}
