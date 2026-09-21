'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { CalendarTimeline } from '@/components/calendar/CalendarTimeline';
import { getJakartaDateString } from '@/lib/utils';
import {
  PlusCircle,
  CalendarRange,
} from 'lucide-react';
import Link from 'next/link';

import { AuthGateModal } from '@/components/common/AuthGateModal';

function ScheduleContent() {
  const searchParams = useSearchParams();
  const initialRoomId = searchParams.get('roomId') || undefined;
  const initialDate = searchParams.get('date') || getJakartaDateString();

  const { currentUser, rooms, fetchInitialData } = useAppStore();
  const [selectedDate] = useState(initialDate);
  const [calendarMode, setCalendarMode] = useState<'day' | 'week' | 'month'>('day');
  const [authGateOpen, setAuthGateOpen] = useState(false);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const isGuest = !currentUser || currentUser.role === 'guest';

  const handleBookingClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      setAuthGateOpen(true);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-w-0 space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Top Banner */}
      <div className="relative flex flex-col gap-5 overflow-hidden rounded-[18px_4px_18px_18px] border border-emerald-900/15 bg-white p-5 shadow-sm sm:p-7 md:flex-row md:items-center md:justify-between">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-yarsi-primary" aria-hidden="true" />
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-yarsi-primary">
            <CalendarRange className="h-4 w-4" aria-hidden="true" />
            <span>Kalender ruang · WIB</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Ketersediaan ruang kampus
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
            Bandingkan ruang dan waktu melalui jadwal publik yang aman, lalu pilih slot yang masih tersedia untuk mengajukan peminjaman.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={initialRoomId ? `/dashboard/booking/new?roomId=${initialRoomId}` : '/dashboard/booking/new'}
            onClick={handleBookingClick}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[9px_2px_9px_9px] bg-yarsi-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-yarsi-dark"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Pinjam Ruang</span>
          </Link>
        </div>
      </div>

      {/* Main Calendar Render */}
      <CalendarTimeline
        rooms={rooms}
        initialDate={selectedDate}
        selectedRoomId={initialRoomId}
        viewMode={calendarMode}
        onViewModeChange={setCalendarMode}
      />

      {/* Auth Gate Modal */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        targetRoomId={initialRoomId}
        actionTitle="Peminjaman Ruangan Memerlukan Akun Civitas"
      />
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Memuat Kalender...</div>}>
      <ScheduleContent />
    </Suspense>
  );
}
