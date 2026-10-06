'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { CbtSeatBooking, CbtFaculty } from '@/lib/types';
import { cbtRoomApi } from '@/lib/api';
import CbtSeatMap, { FACULTY_COLORS, formatSeatList, CBT_ROOMS } from '@/components/cbt/CbtSeatMap';
import CbtBookingForm from '@/components/cbt/CbtBookingForm';
import { CbtRoomId } from '@/lib/types';
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
    status: 'APPROVED',
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
    status: 'PENDING',
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

  // Active CBT Room selection (A or B)
  const [selectedRoomId, setSelectedRoomId] = useState<CbtRoomId>('cbt-a');
  const activeRoomConfig = CBT_ROOMS[selectedRoomId];

  // Date and Time Filter
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedEndDate, setSelectedEndDate] = useState<string>(() => {
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
  const [bookings, setBookings] = useState<CbtSeatBooking[]>(INITIAL_CBT_BOOKINGS);
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

  // Switch room: clear seats + capacity when user switches between CBT A / CBT B
  const handleRoomSwitch = (roomId: CbtRoomId) => {
    if (roomId === selectedRoomId) return;
    setSelectedRoomId(roomId);
    setSelectedSeats([]);
    setCapacity(0);
    setError(null);
    setSuccessMessage(null);
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
    const endISO = new Date(`${selectedEndDate}T${selectedEndTime}:00+07:00`).toISOString();

    try {
      // Try backend API first for selected room ('A' or 'B')
      const backendRoomCode = selectedRoomId === 'cbt-b' ? 'B' : 'A';
      const data = await cbtRoomApi.getSeats(startISO, endISO, backendRoomCode);
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
  }, [selectedDate, selectedEndDate, selectedStartTime, selectedEndTime, selectedRoomId, getStoredLocalBookings]);

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
    const endISO = new Date(`${selectedEndDate}T${selectedEndTime}:00+07:00`).toISOString();

    const minSeat = Math.min(...selectedSeats);
    const maxSeat = Math.max(...selectedSeats);

    const bookingPayload = {
      roomId: selectedRoomId === 'cbt-b' ? ('B' as const) : ('A' as const),
      title,
      faculty: faculty as CbtFaculty,
      seatStart: minSeat,
      seatEnd: maxSeat,
      startTime: startISO,
      endTime: endISO,
      notes: notes ? `${notes} (Kursi: ${formatSeatList(selectedSeats)})` : `Kursi: ${formatSeatList(selectedSeats)}`,
    };

    try {
      const created = await cbtRoomApi.bookSeats(bookingPayload);
      void created;

      setSuccessMessage(
        `Sukses! ${selectedSeats.length} kursi (${formatSeatList(selectedSeats)}) berhasil dibooking untuk ${bookingPayload.faculty}.`
      );
      setSelectedSeats([]);
      setTitle('');
      setCapacity(0);
      setNotes('');
      await fetchSlotBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memproses pemesanan kursi CBT.';
      setError(message);
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

  const handleUpdateStatus = async (bookingId: string, newStatus: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    try {
      try {
        await cbtRoomApi.updateBookingStatus(bookingId, newStatus);
      } catch {
        // Fallback local storage
      }
      const localList = getStoredLocalBookings();
      const updatedList = localList.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b));
      saveLocalBookings(updatedList);

      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)));

      if (newStatus === 'APPROVED') {
        setSuccessMessage(`Booking berhasil di-ACC! Kursi sekarang berubah menjadi warna fakultas.`);
      } else {
        setSuccessMessage(`Status booking diubah menjadi ${newStatus}. Kursi kembali berwarna kuning.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui status');
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-8 px-4 pt-10 pb-12 sm:px-6 sm:pt-12 sm:pb-16 lg:px-8">
      {/* Top Banner - adjusted spacing & margins */}
      <div className="mt-4 sm:mt-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Monitor className="w-3.5 h-3.5" />
              <span>Smart CBT Center • {activeRoomConfig.name} ({activeRoomConfig.totalSeats} Kursi)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Pemesanan Ruang CBT Multi-Tenant
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Fasilitas laboratorium Computer-Based Test terpusat ({activeRoomConfig.name}: {activeRoomConfig.totalSeats} kursi). Mendukung peminjaman bersama (multi-tenant) antar-fakultas secara simultan dengan alokasi rentang nomor kursi yang terisolasi.
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
        <div className="min-w-0 space-y-6 lg:col-span-8">
          {/* Seat Map Card */}
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            {/* Room Selector Tabs */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              {(Object.values(CBT_ROOMS) as (typeof CBT_ROOMS)[keyof typeof CBT_ROOMS][]).map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleRoomSwitch(room.id)}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 border',
                    selectedRoomId === room.id
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/25'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 dark:hover:border-emerald-500/40',
                  ].join(' ')}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{room.name}</span>
                  <span className={[
                    'text-[10px] px-1.5 py-0.5 rounded font-mono',
                    selectedRoomId === room.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
                  ].join(' ')}>
                    {room.totalSeats} kursi
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Denah Kursi {activeRoomConfig.name}
                  <span className="text-sm font-normal text-slate-400">({activeRoomConfig.totalSeats} kursi total)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Setiap kotak merepresentasikan 1 unit PC CBT. Kursi terpilih ditandai outline biru terang.
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2 text-xs">
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30">
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
            <div className="min-w-0 pt-4">
              <CbtSeatMap
                bookings={bookings}
                roomId={selectedRoomId}
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
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Daftar Alokasi Kursi Pada Slot Ini
            </h3>

            {bookings.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm dark:text-slate-400">
                Belum ada pemesanan kursi pada slot waktu ini. Seluruh {activeRoomConfig.totalSeats} kursi tersedia.
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
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Pemohon</th>
                      <th className="px-3 py-2.5 rounded-r-lg text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bookings.map((b) => {
                      const fColor = FACULTY_COLORS[b.faculty];
                      const count = b.seatEnd - b.seatStart + 1;
                      const bStatus = b.status || 'PENDING';
                      const isApproved = bStatus === 'APPROVED';
                      const isAdmin =
                        currentUser?.role === 'admin_umum' ||
                        currentUser?.role === 'superadmin' ||
                        (currentUser?.role as string) === 'admin';
                      const isOwner = Boolean(currentUser?.id && b.userId === currentUser.id);
                      const canViewDetails = isAdmin || isOwner;

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-3 font-semibold">
                            {isApproved ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border"
                                style={{
                                  backgroundColor: fColor?.bg || '#93C5FD',
                                  color: fColor?.text || '#1E3A5F',
                                  borderColor: fColor?.border || '#60A5FA',
                                }}
                              >
                                {b.faculty}
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border bg-yellow-100 text-amber-900 border-amber-300 shadow-xs dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/40"
                                title="Menunggu ACC (Belum menggunakan warna fakultas)"
                              >
                                {b.faculty} • Pending
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                            {canViewDetails ? b.title : `Kegiatan / Ujian Terjadwal (${b.faculty})`}
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                            #{String(b.seatStart).padStart(3, '0')} – #{String(b.seatEnd).padStart(3, '0')}
                          </td>
                          <td className="px-3 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                            {count} Kursi
                          </td>
                          <td className="px-3 py-3">
                            {isApproved ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/40">
                                ✓ Sudah di-ACC
                              </span>
                            ) : bStatus === 'REJECTED' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/40">
                                ✗ Ditolak
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-amber-900 border border-amber-300 shadow-xs dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/40">
                                ⏳ Belum di-ACC (Kuning)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                            {canViewDetails ? (b.user?.fullName || 'Pengguna Terdaftar') : 'Identitas Terproteksi'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {!isApproved ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(b.id, 'APPROVED')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 dark:hover:bg-emerald-500"
                                title="Setujui permohonan ini agar warna kursi berubah menjadi warna fakultas"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ACC / Setujui</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(b.id, 'PENDING')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 transition dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-500/10 dark:border-slate-700"
                                title="Kembalikan status ke Pending (Kuning)"
                              >
                                <span>Batal ACC</span>
                              </button>
                            )}
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
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
              maxCapacity={activeRoomConfig.totalSeats}
              onCapacityChange={handleCapacityChange}
              notes={notes}
              onNotesChange={setNotes}
              selectedSeats={selectedSeats}
              onClearSelection={() => setSelectedSeats([])}
              bookings={bookings}
              selectedDate={selectedDate}
              selectedEndDate={selectedEndDate}
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              onDateChange={setSelectedDate}
              onEndDateChange={setSelectedEndDate}
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
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
