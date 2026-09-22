'use client';

import React, { useState, useEffect } from 'react';
import { Room, Booking, AcademicBlock } from '@/lib/types';
import { EventDetailModal } from './EventDetailModal';
import { getJakartaDateString } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ArrowUpRight,
} from 'lucide-react';

interface CalendarGridProps {
  rooms: Room[];
  bookings: Booking[];
  academicBlocks?: AcademicBlock[];
  selectedDateStr?: string;
  hideHeader?: boolean;
  onSelectDate?: (dateStr: string) => void;
}

export function CalendarGrid({
  rooms,
  bookings,
  selectedDateStr,
  hideHeader = false,
  onSelectDate,
}: CalendarGridProps) {
  const todayStr = getJakartaDateString();
  const [todayYear, todayMonth] = todayStr.split('-').map(Number);
  const fallbackDate = new Date(`${todayStr}T00:00:00`);
  const initialDate = selectedDateStr ? new Date(`${selectedDateStr}T00:00:00`) : fallbackDate;
  const validInitialDate = !Number.isNaN(initialDate.getTime()) ? initialDate : fallbackDate;
  const [currentYear, setCurrentYear] = useState(validInitialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(validInitialDate.getMonth());

  useEffect(() => {
    if (!selectedDateStr) return;
    const nextDate = new Date(`${selectedDateStr}T00:00:00`);
    if (!Number.isNaN(nextDate.getTime())) {
      setCurrentYear(nextDate.getFullYear());
      setCurrentMonth(nextDate.getMonth());
    }
  }, [selectedDateStr]);

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
              setCurrentYear(todayYear);
              setCurrentMonth(todayMonth - 1);
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

      {/* Week Header - Google Calendar Style */}
      <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, index) => (
          <div key={day} className={index > 4 ? 'text-amber-700' : ''}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Month Grid - Google Calendar Style */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-16 bg-slate-50/60 p-2 sm:min-h-[110px]"
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
              ['APPROVED', 'PENDING', 'RECOMMENDED', 'PENDING_LPF', 'RECOMMENDED_YAYASAN'].includes(b.status)
          );

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate?.(dateStr)}
              className={`flex min-h-16 flex-col justify-between p-1.5 sm:p-2 cursor-pointer transition-colors sm:min-h-[116px] ${
                isToday
                  ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                  : isPast
                  ? 'bg-white/80 hover:bg-slate-50'
                  : 'bg-white hover:bg-slate-50'
              }`}
            >
              {/* Day Header with Google Calendar Circle */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate?.(dateStr);
                  }}
                  aria-label={`Lihat jadwal ${dateStr}, ${dayBookings.length} agenda`}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isToday
                      ? 'bg-emerald-700 text-white font-bold shadow-xs'
                      : 'text-slate-700 font-semibold hover:bg-slate-200'
                  }`}
                >
                  {day}
                </button>

                {dayBookings.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-500">
                    {dayBookings.length}
                  </span>
                )}
              </div>

              {/* Event Chips */}
              <div className="hidden sm:block space-y-1 my-1 overflow-hidden">
                {dayBookings.slice(0, 3).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBooking(b);
                    }}
                    className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium border-l-2 shadow-2xs transition-colors ${
                      b.status === 'APPROVED'
                        ? 'border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-950'
                        : b.status === 'RECOMMENDED' || b.status === 'RECOMMENDED_YAYASAN'
                        ? 'border-sky-500 bg-sky-50 hover:bg-sky-100 text-sky-950'
                        : 'border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-950'
                    }`}
                  >
                    <span className="font-mono font-semibold">{b.startTime}</span>{' '}
                    <span>{b.roomName || 'Terjadwal'}</span>
                  </button>
                ))}

                {dayBookings.length > 3 && (
                  <span className="block text-left text-[9px] font-bold text-slate-500 hover:text-emerald-700 pl-1">
                    +{dayBookings.length - 3} lainnya
                  </span>
                )}
              </div>

              <div className="sm:hidden flex items-center justify-center">
                {dayBookings.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                )}
              </div>
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
