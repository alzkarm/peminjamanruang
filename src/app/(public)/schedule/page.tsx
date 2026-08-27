'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { CalendarTimeline } from '@/components/calendar/CalendarTimeline';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import {
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
    <main className="mx-auto max-w-[1440px] space-y-5 overflow-x-clip px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Top Banner */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-emerald-950/40 bg-[linear-gradient(120deg,#043b2e_0%,#075240_58%,#087158_100%)] p-5 text-white shadow-[0_20px_45px_-30px_rgba(0,63,47,0.85)] sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent" aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-100">
            <span className="relative flex h-2 w-2" aria-hidden="true"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
            <span>Jadwal Ruangan Terpadu</span>
          </div>
          <h1 className="text-balance text-2xl font-black tracking-[-0.025em] sm:text-3xl lg:text-[2rem]">
            Kalender Ruangan Kampus YARSI
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/85 sm:text-[15px]">
            Temukan ruang dan waktu yang tersedia, lalu ajukan peminjaman langsung dari slot kalender.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Toggle View Mode */}
          <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/15 p-1 text-xs font-bold text-white backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setCalendarMode('timeline')}
              aria-pressed={calendarMode === 'timeline'}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 ${
                calendarMode === 'timeline'
                  ? 'bg-white text-yarsi-dark shadow-sm'
                  : 'hover:bg-white/10 text-emerald-100'
              }`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Mingguan</span>
            </button>

            <button
              type="button"
              onClick={() => setCalendarMode('month')}
              aria-pressed={calendarMode === 'month'}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 ${
                calendarMode === 'month'
                  ? 'bg-white text-yarsi-dark shadow-sm'
                  : 'hover:bg-white/10 text-emerald-100'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Bulanan</span>
            </button>
          </div>

          <Link
            href="/dashboard/booking/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-amber-950 shadow-[0_8px_18px_-12px_rgba(0,0,0,0.8)] hover:bg-amber-300 active:bg-amber-500"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Pinjam Ruang</span>
          </Link>
        </div>
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
    <Suspense fallback={<div role="status" className="mx-auto max-w-[1440px] px-4 py-12 text-center text-sm font-medium text-slate-600">Memuat kalender ruangan…</div>}>
      <ScheduleContent />
    </Suspense>
  );
}
