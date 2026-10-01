'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Clock3,
  FileText,
  LayoutDashboard,
  MapPin,
  Monitor,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { RoomCard } from '@/components/common/RoomCard';
import { AuthGateModal } from '@/components/common/AuthGateModal';
import { InteractiveBuilding } from '@/components/home/InteractiveBuilding';
import { CBTBannerSection } from '@/components/home/CBTBannerSection';
import {
  formatDateIndo,
  formatShortDateIndo,
  getJakartaDateString,
} from '@/lib/utils';
import { Room } from '@/lib/types';
import {
  addJakartaDays,
  formatJakartaTime,
  usePublicSchedule,
} from '@/lib/public-schedule';

function formatFloorLabel(floorName?: string | null) {
  if (!floorName) return 'Lantai Ruangan';
  const trimmed = floorName.trim();
  if (/^lantai/i.test(trimmed) || /^basement/i.test(trimmed)) {
    return trimmed;
  }
  return `Lantai ${trimmed}`;
}

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
  const { currentUser, rooms, fetchInitialData } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedDateStr, setSelectedDateStr] = useState(getJakartaDateString);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [showFinishedToday, setShowFinishedToday] = useState(false);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  const todayDateStr = getJakartaDateString();
  const todaySchedule = usePublicSchedule(todayDateStr, addJakartaDays(todayDateStr, 1));
  const selectedDateSchedule = usePublicSchedule(
    selectedDateStr,
    addJakartaDays(selectedDateStr, 1),
  );

  const isGuest = !currentUser || currentUser.role === 'guest';
  const floors = useMemo(() => {
    const floorMap = new Map<number, { level: number; label: string }>();
    rooms.forEach((room) => {
      const level = room.floor;
      if (!floorMap.has(level)) {
        let label = `Lantai ${level}`;
        const nameUpper = (room.floorName || '').toUpperCase();
        if (level === -1 || nameUpper === 'BASEMENT') {
          label = 'Basement';
        } else if (level === 0 || nameUpper === 'DASAR') {
          label = 'Lantai Dasar';
        } else if (room.floorName && !Number.isNaN(Number(room.floorName))) {
          label = `Lantai ${room.floorName}`;
        }
        floorMap.set(level, { level, label });
      }
    });
    return Array.from(floorMap.values()).sort((a, b) => a.level - b.level);
  }, [rooms]);

  const activeBookingsForDate = selectedDateSchedule.events;
  const occupiedRoomIds = new Set(activeBookingsForDate.map((booking) => booking.roomId));

  const filteredRooms = rooms.filter((room) => {
    const query = searchQuery.trim().toLowerCase();
    const typeLabel = (room.type && roomTypeLabels[room.type]) ? roomTypeLabels[room.type].toLowerCase() : '';
    const matchesQuery =
      !query ||
      room.name.toLowerCase().includes(query) ||
      (room.code && room.code.toLowerCase().includes(query)) ||
      (room.type && room.type.toLowerCase().includes(query)) ||
      typeLabel.includes(query) ||
      (room.description && room.description.toLowerCase().includes(query)) ||
      (room.facilities && room.facilities.some((f) => f.toLowerCase().includes(query)));
    const matchesFloor =
      selectedFloor === 'all' || String(room.floor) === selectedFloor;

    return matchesQuery && matchesFloor;
  });

  const availableRoomsCount = Math.max(rooms.length - occupiedRoomIds.size, 0);
  const scheduledCount = activeBookingsForDate.length;
  const currentTime = Date.now();

  const todayActiveEvents = useMemo(() => {
    return todaySchedule.events
      .filter((event) => {
        const start = new Date(event.startTime).getTime();
        const end = new Date(event.endTime).getTime();
        return start <= currentTime && end > currentTime;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [todaySchedule.events, currentTime]);

  const todayUpcomingEvents = useMemo(() => {
    return todaySchedule.events
      .filter((event) => {
        const start = new Date(event.startTime).getTime();
        return start > currentTime;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [todaySchedule.events, currentTime]);

  const todayFinishedEvents = useMemo(() => {
    return todaySchedule.events
      .filter((event) => {
        const end = new Date(event.endTime).getTime();
        return end <= currentTime;
      })
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
  }, [todaySchedule.events, currentTime]);
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

          <div className="relative mx-auto flex min-h-[300px] w-full min-w-0 max-w-[780px] items-center justify-center overflow-visible sm:min-h-[370px] lg:min-h-[420px]" aria-label="Layanan Peminjaman Ruangan SIPERU">
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

      {/* CBT ROOM SPOTLIGHT SECTION (Interactive & Dynamic Multi-Tenant CBT Banner) */}
      <CBTBannerSection />

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
            <>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {[
                  {
                    title: 'Sedang Digunakan Saat Ini',
                    events: todayActiveEvents,
                    emptyTitle: 'Tidak ada ruangan yang sedang digunakan',
                    emptySubtitle: 'Saat ini semua ruangan bebas dan tidak sedang ada agenda berlangsung.',
                    tone: 'emerald' as const,
                  },
                  {
                    title: 'Akan Datang / Terjadwal Hari Ini',
                    events: todayUpcomingEvents,
                    emptyTitle: 'Tidak ada jadwal berikutnya hari ini',
                    emptySubtitle: 'Tidak ada agenda ruangan lainnya yang terjadwal untuk sisa hari ini.',
                    tone: 'amber' as const,
                  },
                ].map((group) => {
                  const isEmerald = group.tone === 'emerald';
                  return (
                    <div
                      key={group.title}
                      className={`rounded-2xl border p-4 sm:p-5 ${
                        isEmerald
                          ? 'border-emerald-200/90 bg-emerald-50/50'
                          : 'border-amber-200/90 bg-amber-50/55'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 border-b pb-3 border-slate-200/70">
                        <div className="flex items-center gap-2">
                          {isEmerald ? (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                            </span>
                          ) : (
                            <Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" />
                          )}
                          <h3 className="text-sm font-black text-slate-950">{group.title}</h3>
                        </div>
                        <span
                          className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-white px-2 text-xs font-black text-slate-800 shadow-xs border border-slate-200/60"
                          aria-label={`${group.events.length} ruangan`}
                        >
                          {group.events.length}
                        </span>
                      </div>

                      {group.events.length > 0 ? (
                        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                          {group.events.map((event) => (
                            <div
                              key={event.id}
                              className={`group flex flex-col justify-between gap-3 rounded-xl border bg-white p-3.5 shadow-xs transition hover:shadow-md ${
                                isEmerald
                                  ? 'border-emerald-200 hover:border-emerald-400'
                                  : 'border-amber-200 hover:border-amber-400'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="truncate text-xs font-black text-slate-900 group-hover:text-yarsi-primary">
                                    {event.roomName}
                                  </h4>
                                  <span
                                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                      isEmerald
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {isEmerald ? 'Aktif' : `Mulai ${formatJakartaTime(event.startTime)}`}
                                  </span>
                                </div>
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                                  <span className="truncate">{formatFloorLabel(event.floorName)}</span>
                                </p>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                                  <Clock className={`h-3 w-3 ${isEmerald ? 'text-emerald-600' : 'text-amber-600'}`} aria-hidden="true" />
                                  <span>{formatJakartaTime(event.startTime)} – {formatJakartaTime(event.endTime)} WIB</span>
                                </div>
                                <Link
                                  href={`/schedule?roomId=${event.roomId}&date=${todayDateStr}`}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-yarsi-primary hover:text-emerald-800 hover:underline"
                                >
                                  Jadwal <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3.5 flex items-start gap-3 rounded-xl border border-dashed border-slate-300/80 bg-white/70 p-3.5 text-slate-600">
                          {isEmerald ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
                          ) : (
                            <Clock3 className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-800">{group.emptyTitle}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{group.emptySubtitle}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {todayFinishedEvents.length > 0 && (
                <div className="mt-4 border-t border-slate-200/80 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowFinishedToday((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>
                      {showFinishedToday ? 'Sembunyikan' : 'Lihat'} {todayFinishedEvents.length} ruangan yang selesai digunakan hari ini
                    </span>
                    <ArrowRight
                      className={`h-3 w-3 text-slate-400 transition-transform ${showFinishedToday ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {showFinishedToday && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {todayFinishedEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs opacity-85 hover:opacity-100 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h5 className="truncate font-bold text-slate-800">{event.roomName}</h5>
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                                <MapPin className="h-3 w-3 text-slate-400" aria-hidden="true" />
                                <span className="truncate">{formatFloorLabel(event.floorName)}</span>
                              </p>
                            </div>
                            <span className="inline-flex items-center rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              Selesai
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-200/70 pt-2 text-[11px] text-slate-600">
                            <span className="flex items-center gap-1 font-semibold">
                              <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                              {formatJakartaTime(event.startTime)} – {formatJakartaTime(event.endTime)} WIB
                            </span>
                            <Link
                              href={`/schedule?roomId=${event.roomId}&date=${todayDateStr}`}
                              className="font-bold text-yarsi-primary hover:underline"
                            >
                              Jadwal
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </section>

        <section id="catalog-section" className="rounded-[22px_6px_22px_22px] border border-slate-200/90 bg-white p-4 shadow-[0_28px_80px_-58px_rgba(3,47,37,0.5)] sm:p-6">
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">Daftar Ruangan per Lantai</h2>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-yarsi-primary ring-1 ring-inset ring-emerald-600/20">
                    {filteredRooms.length} ruangan ditemukan
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Ketersediaan {formatShortDateIndo(selectedDateStr)}</p>
              </div>

              {/* Smart Search Bar */}
              <div className="relative w-full sm:w-72 md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, kode, lab, kelas..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-9 text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all focus:border-yarsi-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Floor Tabs with horizontal scroll */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-thin" role="tablist" aria-label="Filter lantai ruangan">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedFloor === 'all'}
                  onClick={() => setSelectedFloor('all')}
                  className={`room-filter-chip shrink-0 ${selectedFloor === 'all' ? 'room-filter-chip-active' : ''}`}
                >
                  Semua
                </button>
                {floors.map((fl) => (
                  <button
                    key={fl.level}
                    type="button"
                    role="tab"
                    aria-selected={selectedFloor === String(fl.level)}
                    onClick={() => setSelectedFloor(String(fl.level))}
                    className={`room-filter-chip shrink-0 ${selectedFloor === String(fl.level) ? 'room-filter-chip-active' : ''}`}
                  >
                    {fl.label}
                  </button>
                ))}
              </div>

              <Link href={`/schedule?date=${selectedDateStr}`} className="hidden sm:inline-flex min-h-10 shrink-0 items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-yarsi-primary transition">
                Lihat kalender <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Building2 className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">
                {searchQuery ? `Tidak ada ruangan dengan kata kunci "${searchQuery}"` : 'Tidak ada ruangan pada filter ini'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {searchQuery
                  ? 'Coba gunakan kata kunci lain (misal: "lab", "auditorium", kode ruang) atau atur ulang pencarian.'
                  : 'Pilih lantai lain atau tampilkan "Semua" untuk melihat ruangan yang tersedia.'}
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedFloor('all'); }}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-yarsi-primary hover:bg-emerald-100 transition"
              >
                Atur ulang pencarian & lantai
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
                      activeTime={activeSchedule ? `${formatJakartaTime(activeSchedule.startTime)} – ${formatJakartaTime(activeSchedule.endTime)} WIB` : undefined}
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
