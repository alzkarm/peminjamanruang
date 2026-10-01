'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Role } from '@/lib/types';
import { AuthGateModal } from '@/components/common/AuthGateModal';
import {
  CalendarDays,
  PlusCircle,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  ChevronDown,
  User,
  LogOut,
  Menu,
  X,
  Compass,
  Monitor,
  Users,
  GraduationCap,
  BarChart3,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

import { countUniqueBookingApplications } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, bookings, fetchInitialData } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authGateAction, setAuthGateAction] = useState<string>('Peminjaman Ruangan Memerlukan Autentikasi');

  const adminDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setAdminDropdownOpen(false);
  }, [pathname]);

  // Click outside listener for admin dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
        setAdminDropdownOpen(false);
      }
    };
    if (adminDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [adminDropdownOpen]);

  const isGuest = !currentUser || currentUser.role === 'guest';
  const role = currentUser?.role;
  const isSuperadmin = role === 'superadmin';
  const isAdminUmum = role === 'admin_umum' || (role as string) === 'admin';
  const isAdminLPF = role === 'admin_lpf';
  const isYayasan = role === 'admin_yayasan';
  const isAdminUser = isSuperadmin || isAdminUmum || isAdminLPF || isYayasan;

  const isHome = pathname === '/';
  const isOnAdminPath = pathname.startsWith('/admin');

  // Compute pending counts (grouped by application so recurring series count as 1)
  const pendingGeneralCount = countUniqueBookingApplications(
    bookings.filter((b) => (b.status === 'PENDING_LPF' || b.status === 'VERIFIED') && !b.requiresYayasanApproval)
  );
  const pendingLPFCount = countUniqueBookingApplications(
    bookings.filter((b) => b.status === 'PENDING_LPF' && b.requiresYayasanApproval)
  );
  const pendingYayasanCount = countUniqueBookingApplications(
    bookings.filter((b) => b.status === 'RECOMMENDED_YAYASAN')
  );

  const adminPendingBadge = isYayasan
    ? pendingYayasanCount
    : isAdminLPF
    ? pendingLPFCount
    : pendingGeneralCount;

  const adminTargetUrl = isYayasan ? '/admin/approvals/yayasan' : '/admin/approvals';

  interface NavLinkItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badge?: number;
    requiresAuth?: boolean;
  }

  const navLinks: NavLinkItem[] = [
    { href: '/', label: 'Beranda', icon: CalendarDays },
    { href: '/schedule', label: 'Kalender Ruangan', icon: CalendarDays },
    { href: '/cbt-room', label: 'Ruang CBT', icon: Monitor },
    { href: '/dashboard', label: 'Peminjaman Saya', icon: LayoutDashboard, requiresAuth: true },
  ];

  const handleNavClick = (e: React.MouseEvent, item: NavLinkItem) => {
    if (item.requiresAuth && isGuest) {
      e.preventDefault();
      setAuthGateAction(
        item.label === 'Pinjam Ruang'
          ? 'Peminjaman Ruangan Memerlukan Autentikasi'
          : 'Akses Peminjaman Saya Memerlukan Login'
      );
      setAuthGateOpen(true);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    router.push('/');
  };

  const getRoleBadge = (userRole: Role) => {
    switch (userRole) {
      case 'superadmin':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">Superadmin</span>;
      case 'admin_umum':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">Admin Umum</span>;
      case 'admin_yayasan':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">Yayasan YARSI</span>;
      case 'admin_lpf':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">Admin LPF</span>;
      case 'dosen':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">Dosen</span>;
      case 'tendik':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">Tendik</span>;
      case 'mahasiswa':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-300">Mahasiswa</span>;
      default:
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">Mode Tamu</span>;
    }
  };

  const getRoleTitle = () => {
    if (isSuperadmin) return 'Superadmin';
    if (isAdminUmum) return 'Admin Umum';
    if (isAdminLPF) return 'Admin LPF';
    if (isYayasan) return 'Pengurus Yayasan';
    return 'Pengelola';
  };

  return (
    <>
      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl ${isHome ? 'border-white/10 bg-[#032f25] text-white shadow-none' : 'border-emerald-950/10 bg-white/95 shadow-[0_8px_28px_-24px_rgba(3,47,37,0.7)]'}`}>
        {/* Top Banner Notice: Dynamic Context & Two-Way Switching for Admin */}
        {mounted && isAdminUser ? (
          <div className="bg-[#02241b] border-b border-emerald-500/25 px-4 py-1.5 text-[11px] text-emerald-100">
            <div className="flex items-center justify-between max-w-7xl mx-auto w-full gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[10px] shrink-0">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Sesi {getRoleTitle()}</span>
                </span>
                <span className="text-emerald-200/80 truncate hidden sm:inline">
                  {isOnAdminPath ? 'Anda sedang di Dashboard Pengelolaan Internal.' : 'Anda sedang melihat Halaman Publik SIPERU.'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isOnAdminPath ? (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-700/60 hover:bg-emerald-600 px-2.5 py-0.5 rounded border border-emerald-400/30 transition-colors"
                    title="Beralih ke tampilan publik (Beranda, Kalender, CBT)"
                  >
                    <span>Ke Tampilan Publik</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <Link
                    href={adminTargetUrl}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-0.5 rounded border border-emerald-400/40 shadow-sm transition-all"
                    title="Masuk ke Dashboard Admin dengan Sidebar Pengelolaan"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Masuk ke Dashboard Admin</span>
                    {adminPendingBadge > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[9.5px]">
                        {adminPendingBadge}
                      </span>
                    )}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={`${isHome ? 'hidden' : 'flex'} bg-[#04382c] px-4 py-1.5 text-[11px] text-emerald-100`}>
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
              </span>
              <span className="truncate font-semibold">
                Universitas YARSI · Sistem Informasi Peminjaman Ruangan Terpadu
              </span>

              <div className="ml-auto hidden items-center gap-3 text-emerald-200 md:flex">
                {mounted && isGuest && (
                  <span className="inline-flex items-center gap-1 border-l border-amber-300/40 pl-3 font-bold text-amber-200">
                    <Compass className="h-3 w-3" aria-hidden="true" /> Mode tamu
                  </span>
                )}
                <span>Jadwal ruangan terpusat</span>
                <span className="border-l border-emerald-300/25 pl-3 font-semibold text-white">WIB · Jadwal langsung</span>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between gap-2 sm:gap-4 ${isHome ? 'h-[76px]' : 'h-[68px]'}`}>
            {/* Brand Logo */}
            <Link href="/" className="group flex min-w-0 items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-[11px_3px_11px_11px] text-white transition-transform group-hover:-translate-y-0.5 ${isHome ? 'border border-emerald-300/20 bg-emerald-400/15 shadow-none' : 'bg-gradient-to-br from-yarsi-primary to-yarsi-dark shadow-md shadow-emerald-900/20'}`}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-lg font-black tracking-[0.08em] ${isHome ? 'text-white' : 'text-yarsi-dark'}`}>SIPERU</span>
                  <span className={`border-l border-emerald-300 pl-1.5 text-[11px] font-bold ${isHome ? 'text-emerald-300' : 'text-yarsi-primary'}`}>YARSI</span>
                </div>
                <p className={`hidden text-[11px] font-medium leading-none min-[420px]:block ${isHome ? 'text-emerald-100/60' : 'text-slate-500'}`}>Peminjaman Ruang Kampus</p>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1.5">
              {navLinks.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`relative flex min-h-10 lg:min-h-11 items-center gap-1.5 lg:gap-2 border-b-2 px-2 lg:px-3.5 py-2 text-xs lg:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? isHome ? 'border-emerald-400 text-white' : 'border-yarsi-primary text-yarsi-primary'
                        : isHome ? 'border-transparent text-emerald-50/70 hover:border-emerald-300/40 hover:text-white' : 'border-transparent text-slate-600 hover:border-emerald-200 hover:text-yarsi-primary'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isHome ? 'text-emerald-200/60' : isActive ? 'text-yarsi-primary' : 'text-slate-400'}`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}

              {/* Dedicated Admin Interactive Menu Dropdown (Opsi A) */}
              {mounted && isAdminUser && (
                <div className="relative" ref={adminDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                    aria-expanded={adminDropdownOpen}
                    className={`relative flex min-h-10 lg:min-h-11 items-center gap-1.5 lg:gap-2 border-b-2 px-2.5 lg:px-3.5 py-2 text-xs lg:text-sm font-bold transition-all whitespace-nowrap shrink-0 rounded-t-lg ${
                      isOnAdminPath
                        ? isHome
                          ? 'border-emerald-400 text-emerald-300 bg-white/10'
                          : 'border-yarsi-primary text-yarsi-primary bg-emerald-50/70'
                        : isHome
                          ? 'border-transparent text-emerald-200 hover:border-emerald-300/40 hover:text-white hover:bg-white/5'
                          : 'border-transparent text-slate-700 hover:border-emerald-200 hover:text-yarsi-primary hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className={`h-4 w-4 shrink-0 ${isOnAdminPath ? 'text-emerald-400' : 'text-amber-500'}`} />
                    <span>Dashboard Admin</span>
                    {adminPendingBadge > 0 && (
                      <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shrink-0">
                        {adminPendingBadge}
                      </span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Interactive Admin Quick Access Dropdown Menu */}
                  {adminDropdownOpen && (
                    <div className="absolute left-0 mt-1 w-72 animate-fade-in rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 z-50 text-slate-800">
                      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 rounded-xl mb-1 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Akses Cepat Pengelola
                          </p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">
                            {getRoleTitle()}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          Sidebar View
                        </span>
                      </div>

                      <div className="space-y-0.5 text-xs py-1">
                        <Link
                          href={adminTargetUrl}
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-xl transition-colors font-semibold"
                        >
                          <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-yarsi-primary shrink-0" />
                            <div>
                              <p className="leading-tight">
                                {isYayasan ? 'Persetujuan Yayasan' : 'Verifikasi Permohonan'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-normal">Antrean permohonan ruang</p>
                            </div>
                          </div>
                          {adminPendingBadge > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-rose-600 rounded">
                              {adminPendingBadge}
                            </span>
                          )}
                        </Link>

                        {(isSuperadmin || isAdminUmum || isAdminLPF) && (
                          <Link
                            href="/admin/academic-bulk"
                            onClick={() => setAdminDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-xl transition-colors font-semibold"
                          >
                            <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                            <div>
                              <p className="leading-tight">Jadwal Akademik</p>
                              <p className="text-[10px] text-slate-400 font-normal">Penggunaan ruang semester</p>
                            </div>
                          </Link>
                        )}

                        <Link
                          href="/admin/reports"
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-xl transition-colors font-semibold"
                        >
                          <BarChart3 className="w-4 h-4 text-teal-600 shrink-0" />
                          <div>
                            <p className="leading-tight">Laporan &amp; Ekspor</p>
                            <p className="text-[10px] text-slate-400 font-normal">Rekapitulasi pemanfaatan ruang</p>
                          </div>
                        </Link>

                        {isSuperadmin && (
                          <>
                            <div className="border-t border-slate-100 my-1 pt-1 px-3 text-[9.5px] font-extrabold uppercase tracking-wider text-purple-700">
                              Khusus Superadmin
                            </div>
                            <Link
                              href="/admin/users"
                              onClick={() => setAdminDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors font-semibold"
                            >
                              <Users className="w-4 h-4 text-purple-600 shrink-0" />
                              <div>
                                <p className="leading-tight">Kelola Pengguna (Whitelist)</p>
                                <p className="text-[10px] text-slate-400 font-normal">Tambah &amp; kelola role akun</p>
                              </div>
                            </Link>

                            <Link
                              href="/admin/rooms"
                              onClick={() => setAdminDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors font-semibold"
                            >
                              <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                              <div>
                                <p className="leading-tight">Master Data Ruangan</p>
                                <p className="text-[10px] text-slate-400 font-normal">Fasilitas, kuota &amp; denah</p>
                              </div>
                            </Link>

                            <Link
                              href="/admin/faculties"
                              onClick={() => setAdminDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors font-semibold"
                            >
                              <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
                              <div>
                                <p className="leading-tight">Master Fakultas &amp; Warna</p>
                                <p className="text-[10px] text-slate-400 font-normal">Identitas fakultas &amp; CBT</p>
                              </div>
                            </Link>
                          </>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1.5 mt-1">
                        <Link
                          href={adminTargetUrl}
                          onClick={() => setAdminDropdownOpen(false)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark rounded-xl transition-all shadow-xs"
                        >
                          <span>Buka Dashboard Utama</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pinjam Ruang Button */}
              <Link
                href="/dashboard/booking/new"
                onClick={(e) => handleNavClick(e, { href: '/dashboard/booking/new', label: 'Pinjam Ruang', icon: PlusCircle, requiresAuth: true })}
                className={`relative flex min-h-10 lg:min-h-11 items-center gap-1.5 lg:gap-2 border-b-2 px-2 lg:px-3.5 py-2 text-xs lg:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isHome
                    ? 'ml-1.5 lg:ml-2 rounded-[9px_2px_9px_9px] border-emerald-400/45 bg-emerald-400/10 text-white hover:bg-emerald-400/20'
                    : 'ml-1.5 lg:ml-2 rounded-[9px_2px_9px_9px] border-yarsi-primary bg-yarsi-primary text-white shadow-sm shadow-emerald-900/20 hover:bg-yarsi-dark'
                }`}
              >
                <PlusCircle className="h-4 w-4 shrink-0 text-white" />
                <span className="whitespace-nowrap">Pinjam Ruang</span>
              </Link>
            </nav>

            {/* User Profile / Quick Switcher / Auth Trigger */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* Quick Switch Button (Two-Way Navigation) */}
              {mounted && isAdminUser && (
                <div className="hidden sm:block">
                  {isOnAdminPath ? (
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all shadow-xs"
                      title="Kembali ke Beranda Publik"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ke Beranda Publik</span>
                    </Link>
                  ) : (
                    <Link
                      href={adminTargetUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-500/40 rounded-xl transition-all shadow-xs"
                      title="Buka Dashboard Admin Internal (Sidebar View)"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Panel Admin</span>
                      {adminPendingBadge > 0 && (
                        <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[9.5px]">
                          {adminPendingBadge}
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              )}

              {mounted && !isGuest && currentUser ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-expanded={userDropdownOpen}
                    aria-label="Buka menu akun"
                    className={`flex min-h-11 items-center gap-2.5 rounded-[10px_3px_10px_10px] border p-1.5 pr-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${isHome ? 'border-white/10 bg-white/[0.07] hover:border-emerald-300/30 hover:bg-white/[0.11]' : 'border-slate-200 bg-white shadow-sm hover:border-emerald-300 hover:bg-emerald-50/40'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500"
                    />
                    <div className="text-left hidden sm:block">
                      <p className={`max-w-[130px] line-clamp-1 text-xs font-semibold leading-tight ${isHome ? 'text-white' : 'text-slate-800'}`}>
                        {currentUser.name.split(' ')[0]}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {getRoleBadge(currentUser.role)}
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 ${isHome ? 'text-emerald-100/60' : 'text-slate-400'}`} />
                  </button>

                  {/* Dropdown Menu (Opsi B: User Profile Dropdown Integration) */}
                  {userDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserDropdownOpen(false)}
                      />
                      <div className="absolute right-0 z-50 mt-2 w-72 animate-fade-in rounded-[14px_4px_14px_14px] border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5">
                        <div className="mb-1 border-b border-slate-100 bg-slate-50 px-3 py-2.5 rounded-lg">
                          <p className="text-xs text-slate-400 font-medium">Terautentikasi SSO LDAP:</p>
                          <p className="text-sm font-bold text-slate-800 leading-snug">{currentUser.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.identifier} • {currentUser.department}</p>
                          <div className="mt-2">
                            {getRoleBadge(currentUser.role)}
                          </div>
                        </div>

                        {/* Standard User Links */}
                        <div className="py-1 space-y-0.5 text-xs">
                          <Link
                            href="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                          >
                            <LayoutDashboard className="w-4 h-4 text-slate-400" />
                            <span>Peminjaman Saya</span>
                          </Link>

                          <Link
                            href="/dashboard/booking/new"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                          >
                            <PlusCircle className="w-4 h-4 text-slate-400" />
                            <span>Ajukan Peminjaman Baru</span>
                          </Link>
                        </div>

                        {/* Special Role-Based Admin Quick Links (Opsi B Requirement) */}
                        {isAdminUser && (
                          <div className="border-t border-slate-100 pt-1.5 mt-1 space-y-0.5">
                            <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50/70 rounded flex items-center justify-between">
                              <span>Panel Pengelolaan Admin</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-900">
                                {isSuperadmin ? 'Superadmin' : 'Admin'}
                              </span>
                            </div>

                            <Link
                              href={adminTargetUrl}
                              onClick={() => setUserDropdownOpen(false)}
                              className="w-full flex items-center justify-between px-3 py-2 text-slate-800 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-bold text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-yarsi-primary" />
                                <span>Verifikasi &amp; Pengelolaan</span>
                              </div>
                              {adminPendingBadge > 0 && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-rose-600 rounded">
                                  {adminPendingBadge}
                                </span>
                              )}
                            </Link>

                            {(isSuperadmin || isAdminUmum || isAdminLPF) && (
                              <Link
                                href="/admin/academic-bulk"
                                onClick={() => setUserDropdownOpen(false)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-medium text-xs"
                              >
                                <GraduationCap className="w-4 h-4 text-slate-400" />
                                <span>Kelola Jadwal Akademik</span>
                              </Link>
                            )}

                            <Link
                              href="/admin/reports"
                              onClick={() => setUserDropdownOpen(false)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-medium text-xs"
                            >
                              <BarChart3 className="w-4 h-4 text-slate-400" />
                              <span>Laporan &amp; Ekspor Rekap</span>
                            </Link>

                            {isSuperadmin && (
                              <>
                                <Link
                                  href="/admin/users"
                                  onClick={() => setUserDropdownOpen(false)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-purple-900 hover:bg-purple-50 rounded-lg transition-colors font-bold text-xs"
                                >
                                  <Users className="w-4 h-4 text-purple-600" />
                                  <span>Kelola User &amp; Whitelist</span>
                                </Link>
                                <Link
                                  href="/admin/rooms"
                                  onClick={() => setUserDropdownOpen(false)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors font-medium text-xs"
                                >
                                  <Building2 className="w-4 h-4 text-slate-400" />
                                  <span>Master Data Ruangan</span>
                                </Link>
                              </>
                            )}
                          </div>
                        )}

                        {/* Logout Option */}
                        <div className="border-t border-slate-100 pt-1 mt-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Keluar dari Akun (Logout)</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`hidden items-center gap-1 border-r pr-3 text-xs font-bold sm:inline-flex ${isHome ? 'border-white/10 text-emerald-100/70' : 'border-slate-200 text-amber-700'}`}>
                    <Compass className={`h-3.5 w-3.5 ${isHome ? 'text-emerald-300' : 'text-amber-600'}`} />
                    <span>Mode Tamu</span>
                  </span>
                  <Link
                    href="/auth/login"
                    aria-label="Masuk melalui SSO"
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[9px_2px_9px_9px] px-3 py-2 text-xs font-bold text-white sm:px-4 sm:text-sm ${isHome ? 'border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20' : 'bg-yarsi-primary shadow-sm hover:bg-yarsi-dark'}`}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Masuk SSO</span>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                className={`min-h-11 min-w-11 p-2 md:hidden ${isHome ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <nav aria-label="Navigasi seluler" className={`animate-fade-in space-y-1 border-t py-3 md:hidden ${isHome ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Menu Utama
              </div>
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                      isActive
                        ? isHome ? 'bg-white/10 text-white font-bold' : 'text-yarsi-primary bg-emerald-50 font-bold'
                        : isHome ? 'text-emerald-50/75 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}

              {/* Mobile Dedicated Admin Section */}
              {mounted && isAdminUser && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 mt-2 space-y-1">
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Panel Pengelolaan ({getRoleTitle()})</span>
                    </span>
                    {adminPendingBadge > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-extrabold text-white bg-rose-600 rounded">
                        {adminPendingBadge}
                      </span>
                    )}
                  </div>

                  <Link
                    href={adminTargetUrl}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 hover:bg-emerald-50 rounded-lg"
                  >
                    <span>{isYayasan ? 'Persetujuan Yayasan' : 'Verifikasi Permohonan'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  {(isSuperadmin || isAdminUmum || isAdminLPF) && (
                    <Link
                      href="/admin/academic-bulk"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 rounded-lg"
                    >
                      <span>Kelola Jadwal Akademik</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  )}

                  <Link
                    href="/admin/reports"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 rounded-lg"
                  >
                    <span>Laporan &amp; Ekspor Rekap</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  {isSuperadmin && (
                    <>
                      <Link
                        href="/admin/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-xs font-bold text-purple-900 hover:bg-purple-50 rounded-lg"
                      >
                        <span>Kelola Pengguna (Whitelist)</span>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                      </Link>

                      <Link
                        href="/admin/rooms"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 rounded-lg"
                      >
                        <span>Master Data Ruangan</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>

                      <Link
                        href="/admin/faculties"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 rounded-lg"
                      >
                        <span>Master Data Fakultas</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* Mobile Pinjam Ruang */}
              <div className="pt-2">
                <Link
                  href="/dashboard/booking/new"
                  onClick={(e) => handleNavClick(e, { href: '/dashboard/booking/new', label: 'Pinjam Ruang', icon: PlusCircle, requiresAuth: true })}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white ${
                    isHome ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-yarsi-primary hover:bg-yarsi-dark'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Pinjam Ruang Sekarang</span>
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Reusable Auth Gate Modal */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        actionTitle={authGateAction}
      />
    </>
  );
}
