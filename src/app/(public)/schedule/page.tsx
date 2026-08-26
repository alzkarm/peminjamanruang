'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { CalendarTimeline } from '@/components/calendar/CalendarTimeline';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import {
  CalendarDays,
  LayoutGrid,
  Clock,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';

function ScheduleContent() {
  const searchParams = useSearchParams();
  const initialRoomId = searchParams.get('roomId') || undefined;

  const { rooms, bookings, academicBlocks } = useAppStore();
  const [calendarMode, setCalendarMode] = useState<'timeline' | 'month'>('timeline');
  const [selectedDate, setSelectedDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  );

  return (
    <main className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-5">
      {/* Top Banner */}
      <section className="bg-yarsi-dark text-white rounded-xl p-5 sm:p-7 border border-emerald-950/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-900/60 text-emerald-200 text-xs font-semibold mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-300" />
            <span>Jadwal Ruangan Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Kalender Ruangan Kampus YARSI
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
            Pantau ketersediaan slot ruangan, agenda kegiatan terkonfirmasi, dan jadwal perkuliahan secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle View Mode */}
          <div className="bg-emerald-950/50 p-1 rounded-lg border border-emerald-800/40 flex text-xs font-bold text-white">
            <button
              type="button"
              onClick={() => setCalendarMode('timeline')}
              aria-pressed={calendarMode === 'timeline'}
              className={`min-h-10 flex items-center gap-1.5 px-3 py-2 rounded-md transition-all ${
                calendarMode === 'timeline'
                  ? 'bg-white text-yarsi-dark shadow-sm'
                  : 'hover:bg-white/10 text-emerald-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline Harian</span>
            </button>

            <button
              type="button"
              onClick={() => setCalendarMode('month')}
              aria-pressed={calendarMode === 'month'}
              className={`min-h-10 flex items-center gap-1.5 px-3 py-2 rounded-md transition-all ${
                calendarMode === 'month'
                  ? 'bg-white text-yarsi-dark shadow-sm'
                  : 'hover:bg-white/10 text-emerald-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Bulan Penuh</span>
            </button>
          </div>

          <Link
            href="/dashboard/booking/new"
            className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Pinjam Ruang</span>
          </Link>
        </div>
      </section>

      {/* Main Calendar Render */}
      {calendarMode === 'timeline' ? (
        <CalendarTimeline
          rooms={rooms}
          bookings={bookings}
          academicBlocks={academicBlocks}
          selectedRoomId={initialRoomId}
          initialDate={selectedDate}
          usePublicSchedule
        />
      ) : (
        <CalendarGrid
          rooms={rooms}
          bookings={bookings}
          academicBlocks={academicBlocks}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setCalendarMode('timeline');
          }}
        />
      )}
    </main>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div role="status" className="p-12 text-center text-slate-600">Memuat kalender ruangan...</div>}>
      <ScheduleContent />
    </Suspense>
  );
}
