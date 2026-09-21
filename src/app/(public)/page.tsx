'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  Monitor,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { RoomCard } from '@/components/common/RoomCard';
import { AuthGateModal } from '@/components/common/AuthGateModal';
import { InteractiveBuilding } from '@/components/home/InteractiveBuilding';
import {
  formatDateIndo,
  formatShortDateIndo,
  getJakartaDateString,
} from '@/lib/utils';
import { Room } from '@/lib/types';
import {
  addJakartaDays,
  usePublicSchedule,
} from '@/lib/public-schedule';

const roomTypeLabels: Record<Room['type'], string> = {
  auditorium: 'Auditorium',
  classroom: 'Ruang Kelas',
  lab: 'Laboratorium',
  meeting: 'Ruang Rapat',
  studio: 'Studio',
  hall: 'Aula',
};

const quickAccessItems = [
  {
    title: 'Kalender Ruangan',
    description: 'Lihat pemakaian seluruh ruang dalam tampilan waktu yang terstruktur.',
    href: '/schedule',
    icon: CalendarDays,
    preview: 'calendar',
    requiresAuth: false,
  },
  {
    title: 'Form Peminjaman',
    description: 'Ajukan ruang, jadwal, fasilitas, dan dokumen dalam satu alur.',
    href: '/dashboard/booking/new',
    icon: FileText,
    preview: 'form',
    requiresAuth: true,
  },
  {
    title: 'Peminjaman Saya',
    description: 'Pantau permohonan, status persetujuan, dan agenda mendatang.',
    href: '/dashboard',
    icon: LayoutDashboard,
    preview: 'dashboard',
    requiresAuth: true,
  },
  {
    title: 'Portal Pengelola',
    description: 'Kelola verifikasi dan keputusan peminjaman sesuai kewenangan.',
    href: '/admin/approvals',
    icon: ShieldCheck,
    preview: 'admin',
    requiresAuth: true,
  },
] as const;

function ProductPreview({ type }: { type: (typeof quickAccessItems)[number]['preview'] }) {
  if (type === 'calendar') {
    return (
      <div className="feature-preview-grid" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
        <i className="col-span-2 bg-emerald-400/70" />
        <i className="col-start-2 bg-sky-300/80" />
        <i className="col-start-3 bg-amber-300/80" />
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="space-y-2.5" aria-hidden="true">
        <span className="feature-preview-line w-2/3" />
        <span className="feature-preview-field" />
        <span className="feature-preview-field" />
        <div className="grid grid-cols-2 gap-2"><span className="feature-preview-field" /><span className="feature-preview-field" /></div>
        <span className="feature-preview-button" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[0.55fr_1fr] gap-2" aria-hidden="true">
      <div className="space-y-2 border-r border-emerald-900/10 pr-2">
        <span className="feature-preview-line w-full" />
        <span className="feature-preview-line w-4/5" />
        <span className="feature-preview-line w-3/5" />
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5"><span className="feature-preview-stat" /><span className="feature-preview-stat" /><span className="feature-preview-stat" /></div>
        <span className="feature-preview-field" />
        <span className="feature-preview-field" />
        <span className="feature-preview-field" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { currentUser, rooms } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDateStr, setSelectedDateStr] = useState(getJakartaDateString);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const todayDateStr = getJakartaDateString();
  const todaySchedule = usePublicSchedule(todayDateStr, addJakartaDays(todayDateStr, 1));
  const selectedDateSchedule = usePublicSchedule(
    selectedDateStr,
    addJakartaDays(selectedDateStr, 1),
  );

  const isGuest = !currentUser || currentUser.role === 'guest';
  const categories = useMemo(
    () => Array.from(new Set(rooms.map((room) => room.type))),
    [rooms]
  );

  const activeBookingsForDate = selectedDateSchedule.events;
  const occupiedRoomIds = new Set(activeBookingsForDate.map((booking) => booking.roomId));

  const filteredRooms = rooms.filter((room) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      room.name.toLowerCase().includes(query) ||
      room.code.toLowerCase().includes(query);
    const matchesCategory =
      selectedCategory === 'all' || room.type === selectedCategory;

    return matchesQuery && matchesCategory;
  });

  const availableRoomsCount = Math.max(rooms.length - occupiedRoomIds.size, 0);
  const scheduledCount = activeBookingsForDate.length;
  const currentTime = Date.now();
  const todayUsedRooms = Array.from(new Set(
    todaySchedule.events
      .filter((event) => new Date(event.startTime).getTime() <= currentTime && new Date(event.endTime).getTime() > currentTime)
      .map((event) => event.roomName),
  ));
  const todayBookedRooms = Array.from(new Set(
    todaySchedule.events
      .filter((event) => new Date(event.startTime).getTime() > currentTime)
      .map((event) => event.roomName),
  ));
  const handleProtectedClick = (event: React.MouseEvent, requiresAuth = true) => {
    if (requiresAuth && isGuest) {
      event.preventDefault();
      setAuthGateOpen(true);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f7f5] pb-20">
      <section className="home-hero relative isolate bg-[#032f25] px-4 pb-8 text-white sm:px-6 sm:pb-10 lg:px-8 lg:pb-12">
        <div className="hero-architectural-grid absolute inset-0 -z-20 opacity-75" aria-hidden="true" />
        <div className="hero-contour-lines absolute inset-0 -z-10 opacity-50" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-4 pt-8 lg:min-h-[520px] lg:grid-cols-[0.72fr_1.28fr] lg:pt-1">
          <div className="relative z-20 min-w-0 max-w-xl py-8 lg:py-12">
            <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-200/80">
              <span className="h-px w-7 bg-emerald-300" aria-hidden="true" />
              Sistem Peminjaman Ruangan Universitas YARSI
            </p>

            <h1 className="w-full max-w-[360px] break-words text-[2.35rem] font-black leading-[1.05] tracking-[-0.045em] sm:max-w-[590px] sm:text-balance sm:text-[3.35rem] lg:text-[3.45rem]">
              Temukan ruang yang tepat,
              <span className="mt-1 block text-[#43c990]">pada waktu yang tepat.</span>
            </h1>

            <p className="mt-5 w-full max-w-lg text-sm leading-6 text-emerald-50/75 sm:text-base">
              Cek jadwal ketersediaan ruangan secara langsung dan ajukan peminjaman melalui alur digital yang jelas.
            </p>

            <div className="hero-stat-panel mt-6 overflow-hidden border border-emerald-200/20 bg-white/[0.075] shadow-2xl backdrop-blur-md">
              <div className="flex min-h-12 items-center gap-4 border-b border-white/10 px-4 text-xs sm:px-5">
                <span className="inline-flex min-w-0 items-center gap-2 font-bold text-white">
                  <Calendar className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  <span className="truncate">{formatDateIndo(selectedDateStr)}</span>
                </span>
                <span className="h-5 w-px bg-white/15" aria-hidden="true" />
                <span className="inline-flex items-center gap-2 font-bold text-emerald-100">
                  <Clock3 className="h-4 w-4 text-emerald-300" aria-hidden="true" /> WIB
                </span>
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
              <div className="grid grid-cols-3 divide-x divide-white/10">
                <div className="hero-stat-item">
                  <Building2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                  <span><strong>{rooms.length}</strong><small>Total ruang</small></span>
                </div>
                <div className="hero-stat-item">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                  <span><strong>{availableRoomsCount}</strong><small>Tersedia</small></span>
                </div>
                <div className="hero-stat-item">
                  <CalendarDays className="h-5 w-5 text-amber-300" aria-hidden="true" />
                  <span><strong>{scheduledCount}</strong><small>Terjadwal</small></span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mx-auto flex min-h-[300px] w-full min-w-0 max-w-[780px] items-center justify-center overflow-hidden rounded-[24px_6px_24px_24px] border border-emerald-200/15 bg-emerald-950/35 p-6 sm:min-h-[370px] lg:min-h-[420px]" aria-label="Layanan Peminjaman Ruangan SIPERU">
            <InteractiveBuilding
              selectedDate={selectedDateStr}
              activeBookings={activeBookingsForDate}
              onSelectRoom={(roomName) => {
                setSearchQuery(roomName);
                document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>

        </div>

        <div className="relative z-30 mx-auto mt-6 w-full max-w-7xl sm:mt-8 lg:mt-10">
          <div className="search-console overflow-hidden border border-slate-200/80 bg-white text-slate-900 shadow-[0_24px_65px_-26px_rgba(1,40,30,0.48)]">
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.05fr_1.2fr_0.78fr_0.8fr_auto]">
              <div className="flex min-h-[76px] items-center gap-3 border-b border-slate-200 px-4 lg:border-b-0 lg:border-r sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-yarsi-primary">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm font-extrabold text-slate-900">Cek ketersediaan</strong>
                  <small className="mt-1 block truncate text-[10px] text-slate-500">Cari ruangan yang sesuai agenda</small>
                </span>
              </div>
              <label className="search-field group border-b border-slate-200 lg:border-b-0 lg:border-r">
                <span className="sr-only">Cari nama atau kode ruangan</span>
                <span className="flex items-center gap-3">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <input type="search" placeholder="Nama atau kode ruangan..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400" />
                </span>
              </label>
              <label className="search-field border-b border-slate-200 lg:border-b-0 lg:border-r">
                <span className="sr-only">Pilih tanggal penggunaan</span>
                <span className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 shrink-0 text-yarsi-primary" aria-hidden="true" />
                  <input type="date" value={selectedDateStr} onChange={(event) => setSelectedDateStr(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none" />
                </span>
              </label>
              <div className="flex items-center p-3">
                <Link href={`/schedule?date=${selectedDateStr}`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-yarsi-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-yarsi-dark lg:w-auto">
                  Cari ruang <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CBT ROOM SPOTLIGHT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-950 p-6 shadow-xl sm:p-8">
          <div className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            {/* Left: Text content */}
            <div className="min-w-0 space-y-4">
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
          <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-black text-white">200</p>
              <p className="text-[11px] text-emerald-300/80 font-medium">Total Kursi PC</p>
            </div>
            <div className="border-y border-white/10 py-3 text-center sm:border-x sm:border-y-0 sm:py-0">
              <p className="text-2xl font-black text-white">10</p>
              <p className="text-[11px] text-emerald-300/80 font-medium">Kolom per blok</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">2</p>
              <p className="text-[11px] text-emerald-300/80 font-medium">Blok kursi</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1376px] px-3 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pt-20">
        <section aria-labelledby="status-ruangan-hari-ini" className="rounded-[22px_6px_22px_22px] border border-emerald-900/10 bg-white p-4 shadow-[0_28px_80px_-58px_rgba(3,47,37,0.5)] sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">Pantauan jadwal publik</p>
              <h2 id="status-ruangan-hari-ini" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Status Ruangan Hari Ini</h2>
              <p className="mt-1 text-xs text-slate-500">{formatShortDateIndo(todayDateStr)} · WIB</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Diperbarui otomatis · setiap 60 detik
              </span>
              <Link href="/schedule" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 px-3.5 text-xs font-extrabold text-yarsi-primary transition hover:border-emerald-400 hover:bg-emerald-50">
                Lihat Kalender Ruangan <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {todaySchedule.error && (
            <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between">
              <span>Jadwal ruangan tidak dapat dimuat. Periksa koneksi lalu coba lagi.</span>
              <button type="button" onClick={todaySchedule.retry} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-rose-700 px-4 font-bold text-white hover:bg-rose-800">
                Coba Lagi
              </button>
            </div>
          )}

          {todaySchedule.isLoading && todaySchedule.events.length === 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2" aria-live="polite" aria-busy="true">
              {[0, 1].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-slate-100" />)}
              <span className="sr-only">Memuat status ruangan</span>
            </div>
          ) : !todaySchedule.error || todaySchedule.events.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Sedang Digunakan', rooms: todayUsedRooms, empty: 'Tidak ada ruangan yang sedang digunakan', tone: 'emerald' },
                { title: 'Sudah Dibooking', rooms: todayBookedRooms, empty: 'Tidak ada ruangan yang sudah dibooking', tone: 'amber' },
              ].map((group) => (
                <div key={group.title} className={`rounded-xl border p-4 ${group.tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/65'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-slate-950">{group.title}</h3>
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-white px-2 text-sm font-black text-slate-900 shadow-sm" aria-label={`${group.rooms.length} ruangan`}>
                      {group.rooms.length}
                    </span>
                  </div>
                  {group.rooms.length > 0 ? (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label={group.title}>
                      {group.rooms.map((roomName) => <li key={roomName} className="rounded-lg border border-white/80 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">{roomName}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs font-medium text-slate-600">{group.empty}</p>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[22px_6px_22px_22px] border border-slate-200/90 bg-white p-4 shadow-[0_28px_80px_-58px_rgba(3,47,37,0.5)] sm:p-6">
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">Kategori Ruangan</h2>
                <span className="text-xs font-bold text-yarsi-primary">{filteredRooms.length} ditemukan</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Ketersediaan {formatShortDateIndo(selectedDateStr)}</p>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Kategori ruangan">
                <button type="button" role="tab" aria-selected={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} className={`room-filter-chip ${selectedCategory === 'all' ? 'room-filter-chip-active' : ''}`}>
                  Semua
                </button>
                {categories.map((category) => (
                  <button key={category} type="button" role="tab" aria-selected={selectedCategory === category} onClick={() => setSelectedCategory(category)} className={`room-filter-chip ${selectedCategory === category ? 'room-filter-chip-active' : ''}`}>
                    {roomTypeLabels[category]}
                  </button>
                ))}
              </div>
              <Link href={`/schedule?date=${selectedDateStr}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-yarsi-primary">
                Lihat kalender <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="py-14 text-center">
              <Building2 className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-bold text-slate-800">Tidak ada ruangan yang sesuai</h3>
              <p className="mt-1 text-xs text-slate-500">Ubah kata kunci atau kategori untuk melihat pilihan lain.</p>
              <button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="mt-4 min-h-11 px-4 text-sm font-bold text-yarsi-primary hover:bg-emerald-50">
                Atur ulang pencarian
              </button>
            </div>
          ) : (
            <div className="room-carousel mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
              {filteredRooms.map((room) => {
                const activeSchedule = activeBookingsForDate.find((booking) => booking.roomId === room.id);

                return (
                  <div key={room.id} className="w-[252px] min-w-[252px] snap-start sm:w-[278px] sm:min-w-[278px]">
                    <RoomCard
                      room={room}
                      variant="compact"
                      isAvailableToday={!activeSchedule}
                      activeBookingTitle={undefined}
                      activeTime={activeSchedule ? `${activeSchedule.startTime}–${activeSchedule.endTime}` : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-labelledby="akses-cepat-heading">
          <h2 id="akses-cepat-heading" className="sr-only">Akses cepat SIPERU</h2>
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={(event) => handleProtectedClick(event, item.requiresAuth)}
                className="feature-access-card group grid min-h-[190px] grid-cols-[0.75fr_1.25fr] gap-4 overflow-hidden border border-slate-200 bg-white p-4 shadow-sm focus-visible:ring-2 focus-visible:ring-yarsi-primary"
              >
                <span className="flex min-w-0 flex-col">
                  <Icon className="h-5 w-5 text-yarsi-primary" aria-hidden="true" />
                  <strong className="mt-4 text-sm font-extrabold leading-snug text-slate-900">{item.title}</strong>
                  <small className="mt-2 text-[10px] leading-4 text-slate-500">{item.description}</small>
                  <span className="mt-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-yarsi-primary transition group-hover:border-emerald-300 group-hover:bg-emerald-50">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </span>
                <span className="feature-preview self-center border border-emerald-900/10 bg-[#f7faf8] p-3 shadow-inner">
                  <ProductPreview type={item.preview} />
                </span>
              </Link>
            );
          })}
        </section>
      </main>

      <AuthGateModal isOpen={authGateOpen} onClose={() => setAuthGateOpen(false)} actionTitle="Masuk untuk melanjutkan ke layanan SIPERU" />
    </div>
  );
}
