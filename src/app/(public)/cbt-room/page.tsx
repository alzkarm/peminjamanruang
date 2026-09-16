'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { CbtSeatBooking, CbtFaculty } from '@/lib/types';
import { cbtRoomApi } from '@/lib/api';
import CbtSeatMap, { FACULTY_COLORS, formatSeatList } from '@/components/cbt/CbtSeatMap';
import CbtBookingForm from '@/components/cbt/CbtBookingForm';
import { AuthGateModal } from '@/components/common/AuthGateModal';
import {
  Monitor,
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

const INITIAL_CBT_BOOKINGS: CbtSeatBooking[] = [
  {
    id: 'seed-cbt-1',
    userId: 'u-fti-01',
    faculty: 'FTI',
    title: 'Ujian Akhir Praktikum Pemrograman Web',
    seatStart: 1,
    seatEnd: 50,
    startTime: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
    notes: 'Lab Komputer A, B, C',
    createdAt: new Date().toISOString(),
    user: {
      id: 'u-fti-01',
      fullName: 'Dr. Ir. Ahmad FTI, M.Kom',
      unitName: 'Fakultas Teknologi Informasi',
    },
  },
  {
    id: 'seed-cbt-2',
    userId: 'u-fk-01',
    faculty: 'FK',
    title: 'Try Out CBT UKMPPD Gelombang 1',
    seatStart: 51,
    seatEnd: 110,
    startTime: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
    notes: 'Kandidat Ujian Dokter',
    createdAt: new Date().toISOString(),
    user: {
      id: 'u-fk-01',
      fullName: 'dr. Siti Rahma, Sp.A',
      unitName: 'Fakultas Kedokteran',
    },
  },
];

const LOCAL_STORAGE_KEY = 'siperu_cbt_seat_bookings_v1';

export default function CbtRoomPage() {
  const { currentUser } = useAppStore();

  // Date and Time Filter
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedStartTime, setSelectedStartTime] = useState('08:00');
  const [selectedEndTime, setSelectedEndTime] = useState('12:00');

  // Form states
  const [title, setTitle] = useState('');
  const [faculty, setFaculty] = useState<CbtFaculty | ''>('');
  const [capacity, setCapacity] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Multi-select array state: stores array of chosen seat numbers
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  // Bookings state
  const [bookings, setBookings] = useState<CbtSeatBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auth gate modal
  const [authGateOpen, setAuthGateOpen] = useState(false);

  // Capacity validation limit: if capacity decreases below current selection, trim array
  const handleCapacityChange = (newCap: number) => {
    setCapacity(newCap);
    if (newCap > 0 && selectedSeats.length > newCap) {
      setSelectedSeats((prev) => prev.slice(0, newCap));
    }
  };

  // Helper to get local stored bookings
  const getStoredLocalBookings = useCallback((): CbtSeatBooking[] => {
    if (typeof window === 'undefined') return INITIAL_CBT_BOOKINGS;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CBT_BOOKINGS));
      return INITIAL_CBT_BOOKINGS;
    } catch {
      return INITIAL_CBT_BOOKINGS;
    }
  }, []);

  const saveLocalBookings = useCallback((newList: CbtSeatBooking[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
    }
  }, []);

  // Fetch or filter bookings for slot
  const fetchSlotBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const startISO = new Date(`${selectedDate}T${selectedStartTime}:00+07:00`).toISOString();
    const endISO = new Date(`${selectedDate}T${selectedEndTime}:00+07:00`).toISOString();

    try {
      // Try backend API first
      const data = await cbtRoomApi.getSeats(startISO, endISO);
      setBookings(data);
    } catch (err: any) {
      // Fallback to local storage for robust offline demonstration
      const localList = getStoredLocalBookings();
      const slotStart = new Date(startISO).getTime();
      const slotEnd = new Date(endISO).getTime();

      const overlapping = localList.filter((b) => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        return bStart < slotEnd && bEnd > slotStart;
      });

      setBookings(overlapping);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedStartTime, selectedEndTime, getStoredLocalBookings]);

  useEffect(() => {
    fetchSlotBookings();
  }, [fetchSlotBookings]);

  // Handle booking submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faculty || !title.trim() || capacity <= 0 || selectedSeats.length === 0) return;

    if (selectedSeats.length !== capacity) {
      setError(`Jumlah kursi terpilih (${selectedSeats.length}) belum memenuhi kapasitas (${capacity}).`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const startISO = new Date(`${selectedDate}T${selectedStartTime}:00+07:00`).toISOString();
    const endISO = new Date(`${selectedDate}T${selectedEndTime}:00+07:00`).toISOString();

    const minSeat = Math.min(...selectedSeats);
    const maxSeat = Math.max(...selectedSeats);

    const bookingPayload = {
      title,
      faculty: faculty as CbtFaculty,
      seatStart: minSeat,
      seatEnd: maxSeat,
      startTime: startISO,
      endTime: endISO,
      notes: notes ? `${notes} (Kursi: ${formatSeatList(selectedSeats)})` : `Kursi: ${formatSeatList(selectedSeats)}`,
    };

    try {
      let created: CbtSeatBooking;

      try {
        // Try backend API first
        created = await cbtRoomApi.bookSeats(bookingPayload);
      } catch (apiErr: any) {
        // If API fails or backend offline, perform atomic local validation
        const localList = getStoredLocalBookings();
        const reqStart = new Date(bookingPayload.startTime).getTime();
        const reqEnd = new Date(bookingPayload.endTime).getTime();

        const slotBookings = localList.filter((b) => {
          const bStart = new Date(b.startTime).getTime();
          const bEnd = new Date(b.endTime).getTime();
          return bStart < reqEnd && bEnd > reqStart;
        });

        // 1. Capacity check
        const currentlyBookedSeats = new Set<number>();
        for (const b of slotBookings) {
          for (let s = b.seatStart; s <= b.seatEnd; s++) {
            currentlyBookedSeats.add(s);
          }
        }

        const remainingSeats = 200 - currentlyBookedSeats.size;
        const requestedCount = selectedSeats.length;

        if (requestedCount > remainingSeats) {
          throw new Error(
            `Kapasitas tidak mencukupi! Tersisa ${remainingSeats} kursi, Anda meminta ${requestedCount} kursi.`
          );
        }

        // 2. Overlap check against selected seats
        const overlappingSeats: number[] = [];
        for (const s of selectedSeats) {
          if (currentlyBookedSeats.has(s)) {
            overlappingSeats.push(s);
          }
        }

        if (overlappingSeats.length > 0) {
          const sample = overlappingSeats.slice(0, 5).join(', ');
          const extra = overlappingSeats.length > 5 ? ` dan ${overlappingSeats.length - 5} lainnya` : '';
          throw new Error(
            `Kursi [${sample}${extra}] sudah dipesan oleh fakultas lain pada slot waktu ini.`
          );
        }

        // Validation passed: create locally
        created = {
          id: `cbt-${Date.now()}`,
          userId: currentUser?.id || 'demo-user',
          faculty: bookingPayload.faculty,
          title: bookingPayload.title,
          seatStart: bookingPayload.seatStart,
          seatEnd: bookingPayload.seatEnd,
          startTime: bookingPayload.startTime,
          endTime: bookingPayload.endTime,
          notes: bookingPayload.notes,
          createdAt: new Date().toISOString(),
          user: {
            id: currentUser?.id || 'demo-user',
            fullName: currentUser?.name || `${bookingPayload.faculty} User`,
            unitName: currentUser?.organization || `Fakultas ${bookingPayload.faculty}`,
          },
        };

        const updated = [...localList, created];
        saveLocalBookings(updated);
      }

      setSuccessMessage(
        `Sukses! ${selectedSeats.length} kursi (${formatSeatList(selectedSeats)}) berhasil dibooking untuk ${bookingPayload.faculty}.`
      );
      setSelectedSeats([]);
      setTitle('');
      setCapacity(0);
      setNotes('');
      await fetchSlotBookings();
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pemesanan kursi CBT.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDemoData = () => {
    if (confirm('Reset data simulasi kursi CBT ke kondisi awal?')) {
      saveLocalBookings(INITIAL_CBT_BOOKINGS);
      fetchSlotBookings();
      setSuccessMessage('Data kursi CBT telah di-reset ke kondisi awal.');
      setError(null);
      setSelectedSeats([]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner - 'Cubicle' removed from title */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Monitor className="w-3.5 h-3.5" />
              <span>Smart CBT Center • Kapasitas 200 Kursi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Pemesanan Ruang CBT Multi-Tenant
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Fasilitas laboratorium Computer-Based Test terpusat berkapasitas 200 kursi. Mendukung peminjaman bersama (multi-tenant) antar-fakultas secara simultan dengan alokasi rentang nomor kursi yang terisolasi.
            </p>
          </div>

          {/* Quick presets / actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetDemoData}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all"
              title="Kembalikan data ke awal simulasi"
            >
              Reset Data Demo
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Seat Map (8 cols) & Right Booking Form (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Seat Map */}
        <div className="lg:col-span-8 space-y-6">
          {/* Seat Map Card - 'Cubicle' removed from title */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Denah Kursi CBT (Kursi 001 - 200)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Setiap kotak merepresentasikan 1 unit PC CBT. Kursi terpilih ditandai outline biru terang.
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2 text-xs">
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    Memuat data...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Live Data ({bookings.length} alokasi aktif)
                  </span>
                )}
              </div>
            </div>

            {/* Multi-Select Drag-to-Select Seat Map */}
            <div className="pt-4">
              <CbtSeatMap
                bookings={bookings}
                faculty={faculty}
                capacity={capacity}
                selectedSeats={selectedSeats}
                onSelectedSeatsChange={setSelectedSeats}
              />
            </div>
          </div>

          {/* Bookings breakdown table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-emerald-600" />
              Daftar Alokasi Kursi Pada Slot Ini
            </h3>

            {bookings.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Belum ada pemesanan kursi pada slot waktu ini. Seluruh 200 kursi tersedia.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 rounded-l-lg">Fakultas</th>
                      <th className="px-3 py-2.5">Nama Kegiatan / Ujian</th>
                      <th className="px-3 py-2.5">Rentang Kursi</th>
                      <th className="px-3 py-2.5">Total Kursi</th>
                      <th className="px-3 py-2.5 rounded-r-lg">Pemohon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bookings.map((b) => {
                      const fColor = FACULTY_COLORS[b.faculty];
                      const count = b.seatEnd - b.seatStart + 1;
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-3 font-semibold">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border"
                              style={{
                                backgroundColor: fColor?.bg || '#E2E8F0',
                                color: fColor?.text || '#1E293B',
                                borderColor: fColor?.border || '#CBD5E1',
                              }}
                            >
                              {b.faculty}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                            {b.title}
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                            #{String(b.seatStart).padStart(3, '0')} – #{String(b.seatEnd).padStart(3, '0')}
                          </td>
                          <td className="px-3 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                            {count} Kursi
                          </td>
                          <td className="px-3 py-3 text-slate-500">
                            {b.user?.fullName || 'Pengguna Terdaftar'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Booking Form Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Form Booking Kursi CBT
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ketik kapasitas kursi, lalu klik atau drag kursi pada denah untuk memilih ({selectedSeats.length} / {capacity || 0}).
              </p>
            </div>

            <CbtBookingForm
              title={title}
              onTitleChange={setTitle}
              faculty={faculty}
              onFacultyChange={setFaculty}
              capacity={capacity}
              onCapacityChange={handleCapacityChange}
              notes={notes}
              onNotesChange={setNotes}
              selectedSeats={selectedSeats}
              onClearSelection={() => setSelectedSeats([])}
              bookings={bookings}
              selectedDate={selectedDate}
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              onDateChange={setSelectedDate}
              onStartTimeChange={setSelectedStartTime}
              onEndTimeChange={setSelectedEndTime}
              onSubmit={handleBookingSubmit}
              isLoading={isSubmitting}
              error={error}
              successMessage={successMessage}
            />
          </div>

          {/* Validation Rules Card */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-600" />
              Ketentuan Multi-Select &amp; Kapasitas
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span><strong>Multi-Select &amp; Drag:</strong> Tahan &amp; geser kursor atau klik satu per satu untuk memilih kursi. Klik ulang kursi terpilih untuk membatalkan (toggle).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span><strong>Batas Kapasitas:</strong> Jumlah kursi yang dipilih otomatis dikunci maksimal sesuai angka <em>Kapasitas</em> yang Anda masukkan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span><strong>Outline Biru Terang:</strong> Kursi yang sedang Anda pilih ditandai dengan garis tepi biru geometris yang kontras dan jelas.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Auth gate modal for guest */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        actionTitle="Pemesanan Kursi CBT Memerlukan Login"
      />
    </div>
  );
}
