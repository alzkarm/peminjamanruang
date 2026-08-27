'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { RoomCard } from '@/components/common/RoomCard';
import { formatDateIndo, getDayOfWeekNumber } from '@/lib/utils';
import {
  Search,
  Calendar,
  Building2,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  GraduationCap,
  FileCheck2,
  QrCode,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';

export default function HomePage() {
  const { rooms, bookings, academicBlocks } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
  );

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

  const occupiedRoomsCount = occupiedRoomIds.size;
  const availableRoomsCount = Math.max(rooms.length - occupiedRoomsCount, 0);
  const utilizationPercent = rooms.length
    ? Math.round((occupiedRoomsCount / rooms.length) * 100)
    : 0;
  const hasActiveFilters =
    Boolean(searchQuery) || selectedBuilding !== 'all' || selectedCategory !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBuilding('all');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 sm:pb-20">
      <section className="relative overflow-hidden border-b border-emerald-950/40 bg-yarsi-darker text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(115deg,rgba(16,185,129,0.13),transparent_46%),radial-gradient(circle_at_82%_18%,rgba(245,158,11,0.10),transparent_26rem)]" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:pb-28 sm:pt-14 lg:px-8">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(310px,.75fr)] lg:gap-14">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 border-l-2 border-amber-400 pl-3 text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                Universitas YARSI · Layanan Ruang Kampus
              </div>
              <h1 className="max-w-3xl text-3xl font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.45rem]">
                Temukan ruang yang tepat, pada waktu yang tepat.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-50/80 sm:text-base">
                Lihat jadwal akademik dan peminjaman dalam satu kalender, lalu ajukan ruang tanpa menebak ketersediaannya.
              </p>
              <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
                <Link
                  href="/schedule"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-extrabold text-yarsi-dark shadow-[0_10px_28px_rgba(0,0,0,.18)] hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  <Calendar className="h-4 w-4 text-yarsi-primary" />
                  Buka Kalender Ruang
                </Link>
                <Link
                  href="/dashboard/booking/new"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-800/55 px-5 text-sm font-bold text-white hover:-translate-y-0.5 hover:border-emerald-200/60 hover:bg-emerald-800"
                >
                  Ajukan Peminjaman
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <aside aria-label="Ringkasan jadwal tanggal terpilih" className="overflow-hidden rounded-xl border border-white/15 bg-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,.22)] backdrop-blur-md">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">Ringkasan tanggal</p>
                  <p className="mt-1 text-sm font-bold text-white">{formatDateIndo(selectedDateStr)}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-100 ring-1 ring-inset ring-emerald-300/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> WIB
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black tracking-tight text-white">{availableRoomsCount}</p>
                    <p className="mt-1 text-xs font-medium text-emerald-100/75">ruang tanpa jadwal aktif</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-amber-300">{occupiedRoomsCount}</p>
                    <p className="text-[11px] text-emerald-100/65">ruang terjadwal</p>
                  </div>
                </div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Persentase ruang terjadwal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={utilizationPercent}>
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-[width] duration-300" style={{ width: `${utilizationPercent}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-4">
                  <div className="pr-4">
                    <div className="flex items-center gap-2 text-emerald-200">
                      <GraduationCap className="h-4 w-4" />
                      <span className="text-lg font-black text-white">{activeAcademicForDate.length}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-100/65">jadwal akademik</p>
                  </div>
                  <div className="pl-4">
                    <div className="flex items-center gap-2 text-amber-300">
                      <Clock className="h-4 w-4" />
                      <span className="text-lg font-black text-white">{activeBookingsForDate.length}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-100/65">peminjaman aktif</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section aria-label="Pencarian ruangan" className="relative z-20 mx-auto -mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_18px_48px_-24px_rgba(15,23,42,.32)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-yarsi-primary" />
              Cari ketersediaan ruang
            </div>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="min-h-9 text-xs font-bold text-yarsi-primary hover:text-yarsi-dark hover:underline">
                Reset filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(180px,.7fr)_minmax(180px,.7fr)]">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama, kode, atau gedung</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Contoh: Auditorium atau MY-1201"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-slate-50/70 py-2 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none hover:border-slate-400 focus:border-yarsi-primary focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Gedung</span>
              <span className="relative block">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="min-h-12 w-full appearance-none rounded-lg border border-slate-300 bg-slate-50/70 py-2 pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none hover:border-slate-400 focus:border-yarsi-primary focus:bg-white focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">Semua gedung</option>
                  {buildings.map((building) => <option key={building} value={building}>{building}</option>)}
                </select>
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal</span>
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="min-h-12 w-full rounded-lg border border-slate-300 bg-slate-50/70 px-3 py-2 font-sans text-sm font-semibold text-slate-700 outline-none hover:border-slate-400 focus:border-yarsi-primary focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-100 pt-4" aria-live="polite">
            <div className="flex items-center gap-2 pr-3 sm:gap-3">
              <Building2 className="hidden h-4 w-4 text-yarsi-primary sm:block" />
              <div><strong className="block text-base text-slate-900">{rooms.length}</strong><span className="text-[10px] text-slate-500 sm:text-xs">total ruang</span></div>
            </div>
            <div className="flex items-center gap-2 px-3 sm:gap-3">
              <CheckCircle2 className="hidden h-4 w-4 text-emerald-600 sm:block" />
              <div><strong className="block text-base text-emerald-700">{availableRoomsCount}</strong><span className="text-[10px] text-slate-500 sm:text-xs">tanpa jadwal</span></div>
            </div>
            <div className="flex items-center gap-2 pl-3 sm:gap-3">
              <Activity className="hidden h-4 w-4 text-amber-600 sm:block" />
              <div><strong className="block text-base text-slate-900">{utilizationPercent}%</strong><span className="text-[10px] text-slate-500 sm:text-xs">ruang terjadwal</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ROOM DIRECTORY SECTION */}
      <section id="rooms" className="mx-auto mt-12 max-w-7xl space-y-6 px-4 sm:mt-14 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Ruang yang dapat Anda gunakan</h2>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-yarsi-primary">
                {filteredRooms.length} Ruang
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Status ringkas untuk <strong className="font-bold text-slate-700">{formatDateIndo(selectedDateStr)}</strong>. Buka kalender untuk melihat slot per jam.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Filter kategori ruang">
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
                className={`min-h-9 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold ${
                  selectedCategory === cat.id
                    ? 'bg-yarsi-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Room Cards Grid */}
        {filteredRooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Search className="h-5 w-5" /></span>
            <h3 className="mt-4 text-base font-bold text-slate-800">Belum ada ruang yang cocok</h3>
            <p className="mt-1 text-xs text-slate-500">Coba kata kunci lain atau tampilkan kembali semua gedung.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 min-h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-yarsi-primary hover:border-emerald-300 hover:bg-emerald-100"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
      <section className="mx-auto mt-14 max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-[0_24px_70px_-36px_rgba(15,23,42,.8)]">
          <div className="grid lg:grid-cols-[.78fr_1.22fr]">
            <div className="border-b border-slate-800 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">Alur SIPERU</p>
              <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl">Dari pencarian hingga izin akses, dalam satu alur.</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400">Setiap permohonan tercatat dan melewati jalur persetujuan sesuai jenis ruang.</p>
              <Link href="/dashboard/booking/new" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200">
                Mulai pengajuan <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ol className="grid sm:grid-cols-2">
              {[
                { icon: ShieldCheck, step: '01', title: 'Masuk dengan akun YARSI', copy: 'Identitas pemohon terhubung ke akun resmi kampus.' },
                { icon: Calendar, step: '02', title: 'Tentukan ruang & waktu', copy: 'Periksa slot kosong langsung dari kalender terintegrasi.' },
                { icon: FileCheck2, step: '03', title: 'Tunggu verifikasi', copy: 'LPF atau Yayasan meninjau permohonan sesuai kewenangan.' },
                { icon: QrCode, step: '04', title: 'Gunakan e-tiket', copy: 'Tunjukkan QR Code yang terbit setelah pengajuan disetujui.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.step} className="group border-b border-slate-800 p-5 last:border-b-0 sm:p-6 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(3)]:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20 group-hover:bg-emerald-500/15"><Icon className="h-4 w-4" /></span>
                      <span className="font-mono text-xs font-bold text-slate-600">{item.step}</span>
                    </div>
                    <h3 className="mt-5 text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{item.copy}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
