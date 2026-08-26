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
  Activity,
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
} from 'lucide-react';

export default function HomePage() {
  const { rooms, bookings, academicBlocks } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDateStr, setSelectedDateStr] = useState('2026-08-16');

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
      <section className="bg-yarsi-dark text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-emerald-950/40">
        <div className="max-w-7xl mx-auto space-y-7">
          <div className="max-w-3xl space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-900/60 border border-emerald-800 text-xs font-semibold text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Sistem Informasi Peminjaman Ruangan · Universitas YARSI</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Peminjaman Ruangan Kampus Terpadu & Terjadwal Real-Time
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
              Cek ketersediaan Auditorium Ar-Rahman, Smart Classroom, Laboratorium Komputer AI, hingga Ruang Rapat Senat dengan sistem verifikasi multi-tier LPF dan Yayasan YARSI.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/schedule"
                className="min-h-11 inline-flex items-center gap-2 px-5 rounded-lg font-bold text-sm bg-white text-yarsi-dark hover:bg-emerald-50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-yarsi-primary" />
                <span>Lihat Kalender Ruangan</span>
              </Link>

              <Link
                href="/dashboard/booking/new"
                className="min-h-11 inline-flex items-center gap-2 px-5 rounded-lg font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
              >
                <span>Ajukan Peminjaman</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Search Card Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 text-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Cari nama ruangan atau kode"
                  placeholder="Cari nama ruangan, kode (misal: MY-1201), atau gedung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-11 pl-10 pr-4 py-2 bg-white text-xs sm:text-sm font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
                />
              </div>

              {/* Building selector */}
              <div>
                <select
                  aria-label="Filter gedung"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 bg-white text-xs sm:text-sm font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-700"
                >
                  <option value="all">Semua Gedung Kampus</option>
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
                  aria-label="Pilih tanggal ketersediaan"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 bg-white text-xs sm:text-sm font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-700 font-sans"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS OVERVIEW FOR SELECTED DATE */}
      <section aria-label="Statistik keterisian" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-yarsi-primary rounded-lg shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total Ruangan</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">{rooms.length} Ruang</h3>
              <p className="text-[10px] text-slate-600 font-medium">3 Gedung Utama</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3.5">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Tersedia Tanggal Ini</p>
              <h3 className="text-lg sm:text-xl font-black text-emerald-800">{availableRoomsCount} Ruang</h3>
              <p className="text-[10px] text-emerald-700 font-medium">{formatShortDateIndo(selectedDateStr)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3.5">
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Sesi Terjadwal</p>
              <h3 className="text-lg sm:text-xl font-black text-purple-900">
                {activeBookingsForDate.length + activeAcademicForDate.length} Sesi
              </h3>
              <p className="text-[10px] text-purple-800 font-medium">Kuliah & Peminjaman</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Tingkat Okupansi</p>
              <h3 className="text-lg sm:text-xl font-black text-amber-900">{utilizationPercent}%</h3>
              <p className="text-[10px] text-amber-800 font-medium">Pemanfaatan Ruang</p>
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
              <span className="text-xs font-bold text-yarsi-primary bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {filteredRooms.length} Ruang
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadwal diperbarui untuk tanggal <strong>{formatDateIndo(selectedDateStr)}</strong>
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter kategori ruang">
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
                aria-pressed={selectedCategory === cat.id}
                className={`min-h-10 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-yarsi-primary text-white border-yarsi-primary shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Room Cards Grid */}
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Tidak ada ruangan yang sesuai filter</h3>
            <p className="text-xs text-slate-500">Silakan ubah kata kunci pencarian atau gedung.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-10 border border-slate-800 space-y-7">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-wider text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-800">
              Alur Pengajuan SIPERU
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">
              4 Langkah Mudah Reservasi Ruangan Kampus
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Seluruh permohonan tercatat real-time dan terverifikasi secara digital tanpa berkas fisik berlebih.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/80 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-base flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-sm text-white">Masuk Akun YARSI</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Gunakan kredensial akun resmi YARSI Anda untuk autentikasi SSO.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/80 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-base flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-sm text-white">Pilih Ruang & Slot</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sistem memeriksa otomatis ketersediaan ruangan agar terhindar dari tabrakan jadwal.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/80 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-base flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-sm text-white">Verifikasi Petugas</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ruang reguler diverifikasi LPF, sementara auditorium & senat diteruskan ke Yayasan.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/80 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-base flex items-center justify-center">
                4
              </div>
              <h3 className="font-bold text-sm text-white">E-Tiket & QR Code</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Terbitkan e-tiket resmi ber-QR Code untuk izin akses ke petugas operasional.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
