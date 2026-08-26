'use client';

import React, { useState } from 'react';
import { Room, Booking, AcademicBlock } from '@/lib/types';
import { EventDetailModal } from './EventDetailModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  GraduationCap,
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

  const handleOpenBooking = (b: Booking) => {
    setSelectedBooking(b);
    setModalOpen(true);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 space-y-4">
      {/* Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-yarsi-primary" />
          <h2 className="text-lg font-black text-slate-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
        </div>

        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
            className="min-h-11 flex items-center justify-center hover:bg-white rounded-md text-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentYear(today.getFullYear());
              setCurrentMonth(today.getMonth());
            }}
            className="min-h-11 px-3 text-sm font-bold text-yarsi-primary hover:bg-white rounded-md"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
            className="min-h-11 flex items-center justify-center hover:bg-white rounded-md text-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 pb-2 border-b border-slate-100">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => <div key={day}>{day}</div>)}
      </div>

      {/* Calendar Month Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-14 sm:min-h-[100px] bg-slate-50/50 rounded-md border border-transparent"
              />
            );
          }

          const dateStr = `${currentYear}-${(currentMonth + 1)
            .toString()
            .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

          const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

          const dayBookings = bookings.filter(
            (b) =>
              b.date === dateStr &&
              ['APPROVED', 'PENDING_LPF', 'RECOMMENDED_YAYASAN'].includes(b.status)
          );

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate && onSelectDate(dateStr)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectDate?.(dateStr);
              }}
              role="button"
              tabIndex={0}
              aria-label={`Lihat jadwal ${dateStr}, ${dayBookings.length} kegiatan`}
              className={`min-h-16 sm:min-h-[110px] p-1.5 sm:p-2 rounded-md sm:rounded-lg border flex flex-col justify-between text-left ${
                isToday
                  ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    isToday
                      ? 'w-6 h-6 rounded-full bg-yarsi-primary text-white flex items-center justify-center'
                      : 'text-slate-800'
                  }`}
                >
                  {day}
                </span>

                {dayBookings.length > 0 && (
                  <span className="text-[10px] font-bold text-yarsi-primary bg-emerald-100 px-1.5 py-0.5 rounded-md">
                    {dayBookings.length}
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
                    className={`w-full text-left p-1 rounded text-[10px] font-semibold truncate block transition-colors ${
                      b.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                        : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    }`}
                  >
                    {b.startTime} {b.title}
                  </button>
                ))}

                {dayBookings.length > 2 && (
                  <span className="text-[9px] text-slate-400 font-bold block text-center">
                    +{dayBookings.length - 2} acara lagi
                  </span>
                )}
              </div>

              <div className="text-[9px] text-slate-400 font-medium text-right">
                {isToday ? 'Hari Ini' : ''}
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
