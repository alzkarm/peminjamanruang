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
  Sparkles,
  PlusCircle,
  Building,
  Info,
} from 'lucide-react';
import Link from 'next/link';

import { AuthGateModal } from '@/components/common/AuthGateModal';

function ScheduleContent() {
  const searchParams = useSearchParams();
  const initialRoomId = searchParams.get('roomId') || undefined;

  const { currentUser, rooms, bookings, academicBlocks } = useAppStore();
  const [calendarMode, setCalendarMode] = useState<'timeline' | 'month'>('timeline');
  const [selectedDate, setSelectedDate] = useState('2026-08-16');
  const [authGateOpen, setAuthGateOpen] = useState(false);

  const isGuest = !currentUser || currentUser.role === 'guest';

  const handleBookingClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      setAuthGateOpen(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-yarsi-dark to-yarsi-primary text-white rounded-2xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Interactive Room Schedule Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Kalender Ruangan Digital Kampus YARSI
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
            Tampilan kalender interaktif ala Google Calendar. Klik pada slot atau event untuk melihat detail permohonan, nama kegiatan, dan jadwal kuliah semester.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle View Mode */}
          <div className="bg-white/10 backdrop-blur p-1 rounded-xl border border-white/20 flex text-xs font-bold text-white">
            <button
              type="button"
              onClick={() => setCalendarMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                calendarMode === 'timeline'
                  ? 'bg-white text-yarsi-dark shadow-sm'
                  : 'hover:bg-white/10 text-emerald-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline Google Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => setCalendarMode('month')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
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
            href={initialRoomId ? `/dashboard/booking/new?roomId=${initialRoomId}` : '/dashboard/booking/new'}
            onClick={handleBookingClick}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Pinjam Ruang</span>
          </Link>
        </div>
      </div>

      {/* Main Calendar Render */}
      {calendarMode === 'timeline' ? (
        <CalendarTimeline
          rooms={rooms}
          bookings={bookings}
          academicBlocks={academicBlocks}
          selectedRoomId={initialRoomId}
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
