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
  PackageCheck,
  Sun,
  Moon,
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  const adminDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    try {
      localStorage.setItem('siperu-theme', next ? 'dark' : 'light');
    } catch {
      // localStorage unavailable (e.g. privacy mode) — class-only toggle still works
    }
    setIsDarkMode(next);
  };

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
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isAdminUser = isAdmin;

  const isHome = pathname === '/';
  const isOnAdminPath = pathname.startsWith('/admin');

  // Compute pending counts: antrean PENDING satu tingkat
  const pendingCount = countUniqueBookingApplications(
    bookings.filter((b) => b.status === 'PENDING')
  );

  const adminPendingBadge = pendingCount;

  const adminTargetUrl = '/admin/approvals';

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
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/40">Superadmin</span>;
      case 'admin':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40">Admin</span>;
      case 'user':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-500/20 dark:text-teal-200 dark:border-teal-500/40">User</span>;
      default:
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">Tamu</span>;
    }
  };

  const getRoleTitle = () => {
    if (isSuperadmin) return 'Superadmin';
    if (isAdmin) return 'Admin';
    return 'Pengelola';
  };

  return (
    <>
      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl ${isHome ? 'border-white/10 bg-[#032f25] text-white shadow-none' : 'border-emerald-950/10 bg-white/95 dark:border-slate-700/60 dark:bg-slate-900/95 shadow-[0_8px_28px_-24px_rgba(3,47,37,0.7)]'}`}>
        {/* Top Banner Notice: Dynamic Context & Two-Way Switching for Admin */}
        {mounted && isAdminUser ? (
          <div className="bg-[#02241b] border-b border-emerald-500/25 py-1.5 text-[11px] text-emerald-100">
            <div className="flex items-center justify-between w-full pl-[8px] pr-4 sm:pr-6 lg:pr-8 gap-2">
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
                {!isOnAdminPath && (
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
          <div className={`${isHome ? 'hidden' : 'flex'} bg-[#04382c] py-1.5 text-[11px] text-emerald-100`}>
            <div className="flex items-center gap-2 w-full pl-[8px] pr-4 sm:pr-6 lg:pr-8">
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

        <div className="w-full min-w-0 pr-4 sm:pr-6 lg:pr-8">
          <div className={`flex items-center justify-between gap-1.5 sm:gap-4 ${isHome ? 'h-[76px]' : 'h-[68px]'}`}>
            {/* Brand Logo */}
            <Link href="/" title="SIPERU YARSI - Beranda Utama" className="group flex min-w-0 items-center gap-2 pl-[8px] min-[420px]:gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px_3px_11px_11px] text-white transition-transform group-hover:-translate-y-0.5 ${isHome ? 'border border-emerald-300/20 bg-emerald-400/15 shadow-none' : 'bg-gradient-to-br from-yarsi-primary to-yarsi-dark shadow-md shadow-emerald-900/20'}`}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={`truncate text-lg font-black tracking-[0.08em] ${isHome ? 'text-white' : 'text-yarsi-dark dark:text-emerald-400'}`}>SIPERU</span>
                  <span className={`shrink-0 border-l border-emerald-300 pl-1.5 text-[11px] font-bold ${isHome ? 'text-emerald-300' : 'text-yarsi-primary dark:text-emerald-400'}`}>YARSI</span>
                </div>
                <p className={`hidden text-[11px] font-medium leading-none min-[420px]:block ${isHome ? 'text-emerald-100/60' : 'text-slate-500 dark:text-slate-400'}`}>Peminjaman Ruang Kampus</p>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-0.5 xl:gap-1.5">
              {navLinks.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`relative flex min-h-10 xl:min-h-11 items-center gap-1.5 xl:gap-2 border-b-2 px-2 xl:px-3.5 py-2 text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? isHome ? 'border-emerald-400 text-white' : 'border-yarsi-primary text-yarsi-primary dark:border-emerald-500 dark:text-emerald-400'
                        : isHome ? 'border-transparent text-emerald-50/70 hover:border-emerald-300/40 hover:text-white' : 'border-transparent text-slate-600 hover:border-emerald-200 hover:text-yarsi-primary dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400'
                    }`}
                  >
                    <span className="hidden xl:block shrink-0" aria-hidden="true"><Icon className={`block h-4 w-4 ${isHome ? 'text-emerald-200/60' : isActive ? 'text-yarsi-primary dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} /></span>
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
                    className={`relative flex min-h-10 xl:min-h-11 items-center gap-1.5 xl:gap-2 border-b-2 px-2.5 xl:px-3.5 py-2 text-xs xl:text-sm font-bold transition-all whitespace-nowrap shrink-0 rounded-t-lg ${
                      isOnAdminPath
                        ? isHome
                          ? 'border-emerald-400 text-emerald-300 bg-white/10'
                          : 'border-yarsi-primary text-yarsi-primary bg-emerald-50/70 dark:border-emerald-500 dark:text-emerald-300 dark:bg-emerald-500/10'
                        : isHome
                          ? 'border-transparent text-emerald-200 hover:border-emerald-300/40 hover:text-white hover:bg-white/5'
                          : 'border-transparent text-slate-700 hover:border-emerald-200 hover:text-yarsi-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400 dark:hover:bg-slate-800'
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
                    <div className="absolute left-0 mt-1 w-72 animate-fade-in rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 z-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 rounded-xl mb-1 flex items-center justify-between dark:border-slate-700 dark:bg-slate-800/80">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Akses Cepat Pengelola
                          </p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 dark:text-slate-100">
                            {getRoleTitle()}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                          Sidebar View
                        </span>
                      </div>

                      <div className="space-y-0.5 text-xs py-1">
                        <Link
                          href={adminTargetUrl}
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-xl transition-colors font-semibold dark:text-slate-200 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10"
                        >
                          <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-yarsi-primary shrink-0" />
                            <div>
                              <p className="leading-tight">
                                Persetujuan
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

                        {(isSuperadmin || isAdmin) && (
                          <Link
                            href="/admin/academic-bulk"
                            onClick={() => setAdminDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-xl transition-colors font-semibold dark:text-slate-200 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10"
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
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-xl transition-colors font-semibold dark:text-slate-200 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10"
                        >
                          <BarChart3 className="w-4 h-4 text-teal-600 shrink-0" />
                          <div>
                            <p className="leading-tight">Laporan &amp; Ekspor</p>
                            <p className="text-[10px] text-slate-400 font-normal">Rekapitulasi pemanfaatan ruang</p>
                          </div>
                        </Link>

                        {isSuperadmin && (
                          <>
                            <div className="border-t border-slate-100 my-1 pt-1 px-3 text-[9.5px] font-extrabold uppercase tracking-wider text-purple-700 dark:border-slate-700 dark:text-purple-300">
                              Khusus Superadmin
                            </div>
                            <Link
                              href="/admin/users"
                              onClick={() => setAdminDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors font-semibold dark:text-slate-200 dark:hover:text-purple-300 dark:hover:bg-purple-500/10"
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
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors font-semibold dark:text-slate-200 dark:hover:text-purple-300 dark:hover:bg-purple-500/10"
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
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors font-semibold dark:text-slate-200 dark:hover:text-purple-300 dark:hover:bg-purple-500/10"
                            >
                              <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
                              <div>
                                <p className="leading-tight">Master Fakultas &amp; Warna</p>
                                <p className="text-[10px] text-slate-400 font-normal">Identitas fakultas &amp; CBT</p>
                              </div>
                            </Link>

                            <Link
                              href="/admin/facilities"
                              onClick={() => setAdminDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors font-semibold dark:text-slate-200 dark:hover:text-purple-300 dark:hover:bg-purple-500/10"
                            >
                              <PackageCheck className="w-4 h-4 text-purple-600 shrink-0" />
                              <div>
                                <p className="leading-tight">Master Data Fasilitas</p>
                                <p className="text-[10px] text-slate-400 font-normal">Fasilitas &amp; logistik tambahan</p>
                              </div>
                            </Link>
                          </>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1.5 mt-1 dark:border-slate-700">
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
                className={`relative flex min-h-10 xl:min-h-11 items-center gap-1.5 xl:gap-2 border-b-2 px-2 xl:px-3.5 py-2 text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isHome
                    ? 'ml-1.5 xl:ml-2 rounded-[9px_2px_9px_9px] border-emerald-400/45 bg-emerald-400/10 text-white hover:bg-emerald-400/20'
                    : 'ml-1.5 xl:ml-2 rounded-[9px_2px_9px_9px] border-yarsi-primary bg-yarsi-primary text-white shadow-sm shadow-emerald-900/20 hover:bg-yarsi-dark dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                }`}
              >
                <PlusCircle className="h-4 w-4 shrink-0 text-white" />
                <span className="whitespace-nowrap">Pinjam Ruang</span>
              </Link>
            </nav>

            {/* User Profile / Quick Switcher / Auth Trigger */}
            <div className="flex shrink-0 items-center gap-1.5 min-[420px]:gap-2 md:gap-3">
              {/* Quick Switch Button (Two-Way Navigation) */}
              {mounted && isAdminUser && !isOnAdminPath && (
                <div className="hidden xl:block">
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
                </div>
              )}

              {mounted && !isGuest && currentUser ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-expanded={userDropdownOpen}
                    aria-label="Buka menu akun"
                    className={`flex min-h-11 items-center gap-2.5 rounded-[10px_3px_10px_10px] border p-1.5 pr-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${isHome ? 'border-white/10 bg-white/[0.07] hover:border-emerald-300/30 hover:bg-white/[0.11]' : 'border-slate-200 bg-white shadow-sm hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500"
                    />
                    <div className="text-left hidden xl:block">
                      <p className={`max-w-[130px] line-clamp-1 text-xs font-semibold leading-tight ${isHome ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                        {currentUser.name.split(' ')[0]}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {getRoleBadge(currentUser.role)}
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 ${isHome ? 'text-emerald-100/60' : 'text-slate-400 dark:text-slate-500'}`} />
                  </button>

                  {/* Dropdown Menu (Opsi B: User Profile Dropdown Integration) */}
                  {userDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserDropdownOpen(false)}
                      />
                      <div className="absolute right-0 z-50 mt-2 w-72 animate-fade-in rounded-[14px_4px_14px_14px] border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        <div className="mb-1 border-b border-slate-100 bg-slate-50 px-3 py-2.5 rounded-lg dark:border-slate-700 dark:bg-slate-800/80">
                          <p className="text-xs text-slate-400 font-medium">Terautentikasi SSO LDAP:</p>
                          <p className="text-sm font-bold text-slate-800 leading-snug dark:text-slate-100">{currentUser.name}</p>
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
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-medium dark:text-slate-200 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10"
                          >
                            <LayoutDashboard className="w-4 h-4 text-slate-400" />
                            <span>Peminjaman Saya</span>
                          </Link>

                          <Link
                            href="/dashboard/booking/new"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-medium dark:text-slate-200 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10"
                          >
                            <PlusCircle className="w-4 h-4 text-slate-400" />
                            <span>Ajukan Peminjaman Baru</span>
                          </Link>
                        </div>

                        {/* Special Role-Based Admin Quick Links (Opsi B Requirement) */}
                        {isAdminUser && (
                          <div className="border-t border-slate-100 pt-1.5 mt-1 space-y-0.5 dark:border-slate-700">
                            <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50/70 rounded flex items-center justify-between dark:text-emerald-300 dark:bg-emerald-500/10">
                              <span>Panel Pengelolaan Admin</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100">
                                {isSuperadmin ? 'Superadmin' : 'Admin'}
                              </span>
                            </div>

                            <Link
                              href={adminTargetUrl}
                              onClick={() => setUserDropdownOpen(false)}
                              className="w-full flex items-center justify-between px-3 py-2 text-slate-800 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-bold text-xs dark:text-slate-100 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10"
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

                            {(isSuperadmin || isAdmin) && (
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
                                  className="w-full flex items-center gap-2 px-3 py-2 text-purple-900 hover:bg-purple-50 rounded-lg transition-colors font-bold text-xs dark:text-purple-300 dark:hover:bg-purple-500/10"
                                >
                                  <Users className="w-4 h-4 text-purple-600" />
                                  <span>Kelola User &amp; Whitelist</span>
                                </Link>
                                <Link
                                  href="/admin/rooms"
                                  onClick={() => setUserDropdownOpen(false)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors font-medium text-xs dark:text-slate-200 dark:hover:text-purple-300 dark:hover:bg-purple-500/10"
                                >
                                  <Building2 className="w-4 h-4 text-slate-400" />
                                  <span>Master Data Ruangan</span>
                                </Link>
                                <Link
                                  href="/admin/facilities"
                                  onClick={() => setUserDropdownOpen(false)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors font-medium text-xs dark:text-slate-200 dark:hover:text-purple-300 dark:hover:bg-purple-500/10"
                                >
                                  <PackageCheck className="w-4 h-4 text-slate-400" />
                                  <span>Master Data Fasilitas</span>
                                </Link>
                              </>
                            )}
                          </div>
                        )}

                        {/* Logout Option */}
                        <div className="border-t border-slate-100 pt-1 mt-1 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:text-rose-400 dark:hover:bg-rose-500/10"
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
                  <span className={`hidden items-center gap-1 border-r pr-3 text-xs font-bold sm:inline-flex ${isHome ? 'border-white/10 text-emerald-100/70' : 'border-slate-200 text-amber-700 dark:border-slate-700 dark:text-amber-400'}`}>
                    <Compass className={`h-3.5 w-3.5 ${isHome ? 'text-emerald-300' : 'text-amber-600 dark:text-amber-400'}`} />
                    <span>Mode Tamu</span>
                  </span>
                  <Link
                    href="/auth/login"
                    aria-label="Masuk melalui SSO"
                    className={`inline-flex min-h-11 min-w-10 items-center justify-center gap-2 rounded-[9px_2px_9px_9px] px-2 py-2 text-xs font-bold text-white sm:min-w-11 sm:px-4 sm:text-sm ${isHome ? 'border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20' : 'bg-yarsi-primary shadow-sm hover:bg-yarsi-dark dark:bg-emerald-600 dark:hover:bg-emerald-500'}`}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Masuk SSO</span>
                  </Link>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDarkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
                title={isDarkMode ? 'Mode gelap aktif — klik untuk mode terang' : 'Mode terang aktif — klik untuk mode gelap'}
                className={`flex min-h-11 min-w-10 items-center justify-center p-2 rounded-[10px_3px_10px_10px] border transition-colors sm:min-w-11 ${isHome ? 'border-white/10 text-emerald-100/80 hover:border-emerald-300/30 hover:bg-white/10 hover:text-white' : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300'}`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                className={`min-h-11 min-w-10 p-2 sm:min-w-11 lg:hidden ${isHome ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <nav aria-label="Navigasi seluler" className={`animate-fade-in space-y-1 border-t py-3 lg:hidden ${isHome ? 'border-white/10' : 'border-slate-100 dark:border-slate-700/60'}`}>
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
                        ? isHome ? 'bg-white/10 text-white font-bold' : 'text-yarsi-primary bg-emerald-50 font-bold dark:text-emerald-400 dark:bg-emerald-500/10'
                        : isHome ? 'text-emerald-50/75 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
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
                    className="flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 hover:bg-emerald-50 rounded-lg dark:text-slate-200 dark:hover:bg-emerald-500/10"
                  >
                    <span>Persetujuan</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  {(isSuperadmin || isAdmin) && (
                    <Link
                      href="/admin/academic-bulk"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 rounded-lg dark:text-slate-300 dark:hover:bg-emerald-500/10"
                    >
                      <span>Kelola Jadwal Akademik</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  )}

                  <Link
                    href="/admin/reports"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 rounded-lg dark:text-slate-300 dark:hover:bg-emerald-500/10"
                  >
                    <span>Laporan &amp; Ekspor Rekap</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  {isSuperadmin && (
                    <>
                      <Link
                        href="/admin/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-xs font-bold text-purple-900 hover:bg-purple-50 rounded-lg dark:text-purple-300 dark:hover:bg-purple-500/10"
                      >
                        <span>Kelola Pengguna (Whitelist)</span>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      </Link>

                      <Link
                        href="/admin/rooms"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 rounded-lg dark:text-slate-300 dark:hover:bg-purple-500/10"
                      >
                        <span>Master Data Ruangan</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>

                      <Link
                        href="/admin/faculties"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 rounded-lg dark:text-slate-300 dark:hover:bg-purple-500/10"
                      >
                        <span>Master Data Fakultas</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>

                      <Link
                        href="/admin/facilities"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 rounded-lg dark:text-slate-300 dark:hover:bg-purple-500/10"
                      >
                        <span>Master Data Fasilitas</span>
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
                    isHome ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-yarsi-primary hover:bg-yarsi-dark dark:bg-emerald-600 dark:hover:bg-emerald-500'
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
