'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { RoomCard } from '@/components/common/RoomCard';
import { formatDateIndo, formatShortDateIndo, checkTimeOverlap, getDayOfWeekNumber } from '@/lib/utils';
import {
  Search,
  Calendar,
  Building2,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Laptop,
  GraduationCap,
  Layers,
  Filter,
  FileCheck2,
  QrCode,
  Star,
  Monitor,
} from 'lucide-react';

import { AuthGateModal } from '@/components/common/AuthGateModal';

export default function HomePage() {
  const { currentUser, rooms, bookings, academicBlocks } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDateStr, setSelectedDateStr] = useState('2026-08-16');
  const [authGateOpen, setAuthGateOpen] = useState(false);

  const isGuest = !currentUser || currentUser.role === 'guest';

  const handleHeroBookingClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      setAuthGateOpen(true);
    }
  };

  // Buildings list
  const buildings = Array.from(new Set(rooms.map((r) => r.building)));

  // Day number for academic block checks
  const dayNum = getDayOfWeekNumber(selectedDateStr);

  // Filtered rooms
  const filteredRooms = rooms.filter((room) => {
    // Search query
    if (
      searchQuery &&
      !room.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !room.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !room.building.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Building filter
    if (selectedBuilding !== 'all' && room.building !== selectedBuilding) {
      return false;
    }

    // Category / Room Type filter
    if (selectedCategory !== 'all' && room.type !== selectedCategory) {
      return false;
    }

    return true;
  });

  // Calculate live statistics for selected date
  const activeBookingsForDate = bookings.filter(
    (b) =>
      b.date === selectedDateStr &&
      ['APPROVED', 'PENDING_LPF', 'RECOMMENDED_YAYASAN'].includes(b.status)
  );

  const activeAcademicForDate = academicBlocks.filter(
    (ab) => ab.isActive && ab.dayOfWeek === dayNum
  );

  const occupiedRoomIds = new Set([
    ...activeBookingsForDate.map((b) => b.roomId),
    ...activeAcademicForDate.map((ab) => ab.roomId),
  ]);

  const availableRoomsCount = rooms.length - occupiedRoomIds.size;
  const utilizationPercent = Math.round((occupiedRoomIds.size / rooms.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 space-y-12 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yarsi-dark via-yarsi-primary to-emerald-900 text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-teal-300/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 space-y-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold text-emerald-200">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Smart Campus Universitas YARSI • Sistem Terintegrasi 2026</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Peminjaman Ruangan Kampus <span className="text-emerald-300 underline decoration-amber-400 decoration-wavy decoration-2">Cepat, Transparan</span> & Real-Time
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
              Cek ketersediaan Auditorium Ar-Rahman, Smart Classroom, Laboratorium Komputer AI, hingga Ruang Rapat Senat secara instan dengan persetujuan digital multi-level LPF & Yayasan.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/schedule"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white text-yarsi-dark hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all"
              >
                <Calendar className="w-4 h-4 text-yarsi-primary" />
                <span>Lihat Kalender Interaktif</span>
              </Link>

              <Link
                href="/dashboard/booking/new"
                onClick={handleHeroBookingClick}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg hover:shadow-xl transition-all"
              >
                <span>Ajukan Peminjaman Ruang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Search Card Bar */}
          <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-2xl border border-white/30 text-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Cari nama ruangan, kode (misal: MY-1201), atau gedung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yarsi-primary transition-all"
                />
              </div>

              {/* Building selector */}
              <div>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-700"
                >
                  <option value="all">🏢 Semua Gedung Kampus</option>
                  {buildings.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date selector */}
              <div>
                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {}
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-700 font-sans cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS OVERVIEW FOR SELECTED DATE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-yarsi-primary rounded-xl shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">Total Ruangan</p>
              <h3 className="text-xl font-black text-slate-800">{rooms.length} Ruang</h3>
              <p className="text-[10px] text-slate-500 font-medium">3 Gedung Utama</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card flex items-center gap-3.5">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">Tersedia Tanggal Ini</p>
              <h3 className="text-xl font-black text-emerald-700">{availableRoomsCount} Ruang</h3>
              <p className="text-[10px] text-emerald-600 font-medium">{formatShortDateIndo(selectedDateStr)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card flex items-center gap-3.5">
            <div className="p-3 bg-purple-50 text-purple-700 rounded-xl shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">Sesi Terjadwal</p>
              <h3 className="text-xl font-black text-purple-900">
                {activeBookingsForDate.length + activeAcademicForDate.length} Sesi
              </h3>
              <p className="text-[10px] text-purple-700 font-medium">Kuliah & Peminjaman</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">Tingkat Okupansi</p>
              <h3 className="text-xl font-black text-amber-800">{utilizationPercent}%</h3>
              <p className="text-[10px] text-amber-700 font-medium">Pemanfaatan Ruang</p>
            </div>
          </div>
        </div>
      </section>

      {/* CBT ROOM SPOTLIGHT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-950 rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-xl">
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Left: Text content */}
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Monitor className="w-3.5 h-3.5" />
                <span>Smart CBT Center — Fasilitas Eksklusif Kampus YARSI</span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Ruang CBT Multi-Tenant
                  <span className="block text-emerald-300 text-lg sm:text-xl font-bold mt-0.5">200 Kursi Komputer • Alokasi Per-Fakultas</span>
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mt-2 max-w-xl">
                  Satu ruangan, banyak fakultas — secara bersamaan. Sistem pemesanan kursi berbasis rentang nomor (contoh: kursi 1–50 untuk FK, kursi 51–120 untuk FTI) dengan validasi overlap real-time dan penolakan otomatis jika kapasitas habis.
                </p>
              </div>

              {/* Faculty color legend */}
              <div className="flex flex-wrap gap-2">
                {([
                  { code: 'FEB', color: '#93C5FD', text: '#1E3A5F' },
                  { code: 'FH',  color: '#F87171', text: '#7F1D1D' },
                  { code: 'FTI', color: '#FB923C', text: '#7C2D12' },
                  { code: 'FK',  color: '#4ADE80', text: '#14532D' },
                  { code: 'FKG', color: '#C4B5FD', text: '#3B0764' },
                  { code: 'FP',  color: '#A855F7', text: '#FFFFFF' },
                ] as const).map((f) => (
                  <span
                    key={f.code}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                    style={{ backgroundColor: f.color, color: f.text, borderColor: f.color }}
                  >
                    {f.code}
                  </span>
                ))}
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/10 border border-white/20 text-white/70">
                  Setiap warna = alokasi 1 fakultas
                </span>
              </div>

              <Link
                href="/cbt-room"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-400 hover:bg-emerald-300 text-emerald-950 shadow-lg hover:shadow-emerald-400/30 transition-all"
              >
                <Monitor className="w-4 h-4" />
                <span>Buka Denah &amp; Booking Kursi CBT</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Mini seat map preview (visual representation of two-block layout) */}
            <div className="shrink-0 w-full lg:w-72 xl:w-80">
              <div className="bg-black/25 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300/80 uppercase tracking-widest">
                  <span>Blok Kiri (1–100)</span>
                  <span>Blok Kanan (101–200)</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {/* Left Block: 1-100, 7 cols */}
                  <div
                    className="grid gap-0.5 flex-1"
                    style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                  >
                    {Array.from({ length: 100 }, (_, i) => {
                      const s = i + 1;
                      const bg =
                        s <= 50 ? '#FB923C'
                        : s <= 100 ? '#4ADE80'
                        : 'rgba(255,255,255,0.15)';
                      return (
                        <div
                          key={s}
                          className="rounded-[1.5px] aspect-square"
                          style={{ backgroundColor: bg }}
                        />
                      );
                    })}
                  </div>

                  {/* Central Aisle */}
                  <div className="flex flex-col items-center self-stretch justify-center px-1">
                    <div className="w-0 border-l border-dashed border-emerald-400/40 h-full" />
                  </div>

                  {/* Right Block: 101-200, 7 cols */}
                  <div
                    className="grid gap-0.5 flex-1"
                    style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                  >
                    {Array.from({ length: 100 }, (_, i) => {
                      const s = i + 101;
                      const bg =
                        s <= 110 ? '#4ADE80'
                        : 'rgba(255,255,255,0.15)';
                      return (
                        <div
                          key={s}
                          className="rounded-[1.5px] aspect-square"
                          style={{ backgroundColor: bg }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] text-white/60 pt-1">
                  <span>7 Kursi / Baris</span>
                  <span className="text-emerald-300 font-bold">90 Kursi Tersedia</span>
                  <span>Lorong Tengah</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stats strip */}
          <div className="relative z-10 grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-2xl font-black text-white">200</p>
              <p className="text-[11px] text-emerald-300/80 font-medium">Total Kursi PC</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-2xl font-black text-white">6</p>
              <p className="text-[11px] text-emerald-300/80 font-medium">Fakultas Pengguna</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">0ms</p>
              <p className="text-[11px] text-emerald-300/80 font-medium">Validasi Overlap</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROOM DIRECTORY SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">Daftar Ruangan & Ketersediaan</h2>
              <span className="text-xs font-bold text-yarsi-primary bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {filteredRooms.length} Ditemukan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadwal diperbarui otomatis untuk tanggal <strong>{formatDateIndo(selectedDateStr)}</strong>
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'Semua Ruang' },
              { id: 'auditorium', label: 'Auditorium & Aula' },
              { id: 'classroom', label: 'Smart Classroom' },
              { id: 'lab', label: 'Lab AI & IT' },
              { id: 'meeting', label: 'Ruang Rapat' },
              { id: 'studio', label: 'Studio' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-yarsi-primary text-white border-yarsi-primary shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Room Cards Grid */}
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Tidak ada ruangan yang sesuai filter</h3>
            <p className="text-xs text-slate-400">Silakan ubah kata kunci pencarian atau gedung.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedBuilding('all');
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-yarsi-primary hover:underline"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => {
              // Check if room has active bookings or lectures on selected date
              const activeBooking = activeBookingsForDate.find((b) => b.roomId === room.id);
              const activeAcademic = activeAcademicForDate.find((ab) => ab.roomId === room.id);

              const isAvailable = !activeBooking && !activeAcademic;
              const activeTitle = activeBooking
                ? activeBooking.title
                : activeAcademic
                ? `Kuliah: ${activeAcademic.title}`
                : undefined;

              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  isAvailableToday={isAvailable}
                  activeBookingTitle={activeTitle}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* HOW IT WORKS / STEP-BY-STEP WORKFLOW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-yarsi-dark text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-700/60 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
              Alur Digital SIPERU
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">
              4 Langkah Mudah Reservasi Ruangan Kampus
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Tanpa kertas disposisi manual. Seluruh permohonan terekam real-time dan terverifikasi secara digital.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-lg flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-sm text-white">Login Akun LDAP SSO</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Masuk menggunakan akun civitas YARSI resmi (NIM untuk Mahasiswa / NIDN untuk Dosen & Tendik).
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-lg flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-sm text-white">Pilih Ruang & Cek Jadwal</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sistem mendeteksi bentrok jadwal kuliah dan permohonan lain secara otomatis dan instan.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-lg flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-sm text-white">Multi-Level Approval</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ruang reguler diverifikasi Admin LPF. Auditorium dan ruang VIP diteruskan ke Yayasan YARSI.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-lg flex items-center justify-center">
                4
              </div>
              <h3 className="font-bold text-sm text-white">E-Ticket & QR Akses</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dapatkan tiket QR resmi untuk akses petugas security dan fasilitas audio-visual siap pakai.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Gate Modal */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        actionTitle="Peminjaman Ruangan Memerlukan Akun Civitas"
      />
    </div>
  );
}
