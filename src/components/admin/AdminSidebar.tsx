'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  ShieldCheck,
  Building2,
  BarChart3,
  ArrowLeft,
  GraduationCap,
  Users,
  CalendarDays,
  Monitor,
  PackageCheck,
  Wrench,
  Menu,
} from 'lucide-react';

import { countUniqueBookingApplications } from '@/lib/utils';

export function AdminSidebar() {
  const pathname = usePathname();
  const { bookings, currentUser, logout } = useAppStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close drawer on Escape and lock body scroll while open (mobile only)
  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const role = currentUser?.role;
  const isSuperadmin = role === 'superadmin';
  const isAdminUmum = role === 'admin_umum';
  const isAdminLPF = role === 'admin_lpf';
  const isYayasan = role === 'admin_yayasan';

  const pendingGeneralCount = countUniqueBookingApplications(
    bookings.filter((b) => (b.status === 'PENDING_LPF' || b.status === 'VERIFIED') && !b.requiresYayasanApproval)
  );
  const pendingLPFCount = countUniqueBookingApplications(
    bookings.filter((b) => b.status === 'PENDING_LPF' && b.requiresYayasanApproval)
  );
  const pendingYayasanCount = countUniqueBookingApplications(
    bookings.filter((b) => b.status === 'RECOMMENDED_YAYASAN')
  );

  const navItems = [];

  // 1. Approval Items:
  if (isAdminUmum) {
    navItems.push({
      href: '/admin/approvals',
      label: 'Verifikasi Ruang Umum',
      description: 'Verifikasi pengajuan ruang reguler',
      icon: ShieldCheck,
      badge: pendingGeneralCount,
      badgeColor: 'bg-indigo-500',
    });
  } else if (isAdminLPF) {
    navItems.push({
      href: '/admin/approvals',
      label: 'Persetujuan LPF',
      description: 'Rekomendasi permohonan Yayasan',
      icon: ShieldCheck,
      badge: pendingLPFCount,
      badgeColor: 'bg-amber-500',
    });
  } else if (isSuperadmin) {
    navItems.push(
      {
        href: '/admin/approvals',
        label: 'Persetujuan Ruang Umum',
        description: 'Approval akhir ruang kuliah & lab',
        icon: ShieldCheck,
        badge: pendingGeneralCount,
        badgeColor: 'bg-indigo-500',
      },
      {
        href: '/admin/approvals/yayasan',
        label: 'Persetujuan Yayasan',
        description: 'Auditorium Ar-Rahman & R. Senat',
        icon: Building2,
        badge: pendingYayasanCount,
        badgeColor: 'bg-sky-500',
      }
    );
  } else if (isYayasan) {
    navItems.push({
      href: '/admin/approvals/yayasan',
      label: 'Persetujuan Yayasan',
      description: 'Auditorium Ar-Rahman & R. Senat',
      icon: Building2,
      badge: pendingYayasanCount,
      badgeColor: 'bg-sky-500',
    });
  }

  // 2. Academic schedule: Superadmin, Admin Umum, Admin LPF
  if (isSuperadmin || isAdminUmum || isAdminLPF) {
    navItems.push({
      href: '/admin/academic-bulk',
      label: 'Jadwal Akademik',
      description: 'Kelola penggunaan ruang semester',
      icon: GraduationCap,
    });
  }

  // Agenda Hari Ini (Run-Sheet Operasional)
  navItems.push({
    href: '/admin/runsheet',
    label: 'Agenda Hari Ini (Run-Sheet)',
    description: 'Checklist kesiapan ruangan & logistik',
    icon: PackageCheck,
  });

  // Pemeliharaan Ruang (Maintenance Scheduler - Task 2.3)
  if (isSuperadmin || isAdminLPF || isAdminUmum) {
    navItems.push({
      href: '/admin/maintenance',
      label: 'Pemeliharaan Ruang',
      description: 'Jadwal perbaikan & blokir reservasi',
      icon: Wrench,
    });
  }

  // 3. Reports: all admin roles
  navItems.push({
    href: '/admin/reports',
    label: 'Laporan & Ekspor',
    description: 'Rekap pemanfaatan ruang',
    icon: BarChart3,
  });

  // 4. Superadmin only menus
  if (isSuperadmin) {
    navItems.push(
      {
        href: '/admin/users',
        label: 'Manajemen Pengguna',
        description: 'Whitelist & invite multi-role',
        icon: Users,
      },
      {
        href: '/admin/rooms',
        label: 'Master Ruangan',
        description: 'Kelola & ketersediaan ruangan',
        icon: Building2,
      },
      {
        href: '/admin/faculties',
        label: 'Master Fakultas',
        description: 'Kelola daftar fakultas & warna',
        icon: GraduationCap,
      },
      {
        href: '/admin/facilities',
        label: 'Master Fasilitas',
        description: 'Kelola fasilitas & logistik sarpras',
        icon: PackageCheck,
      }
    );
  }

  return (
    <>
      {/* Mobile top bar with hamburger trigger */}
      <div className="sticky top-[104px] z-30 mb-1 flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-3 py-2 shadow-sm md:hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0 rounded-xl bg-yarsi-primary p-2 text-white shadow-sm dark:bg-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight text-slate-900 dark:text-slate-100">
              Pengelolaan Ruang
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Menu Admin SIPERU
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Buka menu navigasi"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay behind the off-canvas drawer */}
      <div
        aria-hidden="true"
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[280px] space-y-6 overflow-y-auto rounded-[16px_4px_16px_16px] border border-slate-200/90 bg-white p-4 shadow-2xl transition-[transform,visibility] duration-300 ease-in-out md:relative md:inset-auto md:z-auto md:w-full md:max-w-none md:translate-x-0 md:overflow-visible md:rounded-[16px_4px_16px_16px] md:shadow-sm md:transition-none lg:sticky lg:top-[104px] lg:w-72 lg:self-start dark:border-slate-700 dark:bg-slate-900 ${
          isSidebarOpen ? 'visible translate-x-0' : 'invisible md:visible -translate-x-full'
        }`}
      >
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-yarsi-primary text-white shadow-sm dark:bg-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold leading-tight text-slate-900 dark:text-slate-100">Pengelolaan Ruang</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Universitas & Yayasan YARSI</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex min-h-14 items-start justify-between border-l-2 p-3 transition-colors ${
                isActive
                  ? 'border-yarsi-primary bg-emerald-50 text-yarsi-primary font-bold dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-transparent text-slate-700 hover:border-emerald-200 hover:bg-slate-50 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    isActive ? 'text-yarsi-primary dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <div>
                  <p className="text-xs font-bold leading-tight">{item.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`ml-2 min-w-5 shrink-0 px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role Context Indicator */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 dark:bg-slate-800/60 dark:border-slate-700">
        <p className="font-bold text-slate-700 flex items-center gap-1.5 dark:text-slate-200">
          <Users className="w-3.5 h-3.5 text-yarsi-primary dark:text-emerald-400" />
          <span>Role Aktif</span>
        </p>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 dark:bg-slate-900 dark:border-slate-700">
          <p className="font-bold text-slate-800 dark:text-slate-100">{currentUser?.name?.split(',')[0] || 'Administrator'}</p>
          <p className="text-[10px] text-slate-500 font-mono dark:text-slate-400">
            {currentUser?.identifier} • {currentUser?.department}
          </p>
          <div className="pt-1">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40">
              {isSuperadmin
                ? 'Superadmin'
                : isAdminUmum
                ? 'Admin Ruang Umum'
                : isAdminLPF
                ? 'Admin LPF'
                : 'Pengurus Yayasan'}
            </span>
          </div>
        </div>
      </div>

      {/* Return to Public Portal */}
      <div className="pt-2 border-t border-slate-100 space-y-2 dark:border-slate-700">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 dark:text-slate-400">
          Navigasi Halaman Publik
        </p>
        <Link
          href="/"
          onClick={() => setIsSidebarOpen(false)}
          className="flex items-center justify-between p-2.5 text-xs font-bold text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-xl border border-slate-200 transition-all group dark:text-slate-200 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10 dark:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-yarsi-primary transition-colors dark:text-slate-500 dark:group-hover:text-emerald-400" />
            <span>Kembali ke Beranda</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal dark:text-slate-400">Publik</span>
        </Link>
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href="/schedule"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center justify-center gap-1.5 p-2 text-[11px] font-medium text-slate-600 hover:text-yarsi-primary hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors dark:text-slate-300 dark:hover:text-emerald-300 dark:hover:bg-slate-800 dark:border-slate-700"
          >
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Kalender</span>
          </Link>
          <Link
            href="/cbt-room"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center justify-center gap-1.5 p-2 text-[11px] font-medium text-slate-600 hover:text-yarsi-primary hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors dark:text-slate-300 dark:hover:text-emerald-300 dark:hover:bg-slate-800 dark:border-slate-700"
          >
            <Monitor className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Ruang CBT</span>
          </Link>
        </div>
      </div>
    </aside>
    </>
  );
}
