'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, bookings } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authGateAction, setAuthGateAction] = useState<string>('Peminjaman Ruangan Memerlukan Autentikasi');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const isGuest = !currentUser || currentUser.role === 'guest';
  const isAdmin = currentUser?.role === 'admin_lpf' || currentUser?.role === 'admin_yayasan';
  const isHome = pathname === '/';

  // Compute pending counts
  const pendingLPFCount = bookings.filter((b) => b.status === 'PENDING_LPF').length;
  const pendingYayasanCount = bookings.filter((b) => b.status === 'RECOMMENDED_YAYASAN').length;

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
    { href: '/dashboard/booking/new', label: 'Pinjam Ruang', icon: PlusCircle, highlight: true, requiresAuth: true },
  ];

  if (isAdmin) {
    navLinks.push({
      href: '/admin/approvals',
      label: 'Admin Portal',
      icon: ShieldCheck,
      badge: currentUser?.role === 'admin_yayasan' ? pendingYayasanCount : pendingLPFCount,
    });
  }

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

  const getRoleBadge = (role: Role) => {
    switch (role) {
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

  return (
    <>
      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl ${isHome ? 'border-white/10 bg-[#032f25] text-white shadow-none' : 'border-emerald-950/10 bg-white/95 shadow-[0_8px_28px_-24px_rgba(3,47,37,0.7)]'}`}>
        {/* Top Banner Notice */}
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
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`relative flex min-h-11 items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-semibold transition-colors ${
                      item.highlight
                        ? isHome
                          ? 'ml-2 rounded-[9px_2px_9px_9px] border-emerald-400/45 bg-emerald-400/10 text-white hover:bg-emerald-400/20'
                          : 'ml-2 rounded-[9px_2px_9px_9px] border-yarsi-primary bg-yarsi-primary text-white shadow-sm shadow-emerald-900/20 hover:bg-yarsi-dark'
                        : isActive
                        ? isHome ? 'border-emerald-400 text-white' : 'border-yarsi-primary text-yarsi-primary'
                        : isHome ? 'border-transparent text-emerald-50/70 hover:border-emerald-300/40 hover:text-white' : 'border-transparent text-slate-600 hover:border-emerald-200 hover:text-yarsi-primary'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${item.highlight || (isHome && isActive) ? 'text-white' : isHome ? 'text-emerald-200/60' : isActive ? 'text-yarsi-primary' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User Profile / Auth Trigger */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserDropdownOpen(false)}
                      />
                      <div className="absolute right-0 z-50 mt-2 w-72 animate-fade-in rounded-[14px_4px_14px_14px] border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5">
                        <div className="mb-1 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
                          <p className="text-xs text-slate-400 font-medium">Terautentikasi SSO LDAP:</p>
                          <p className="text-sm font-bold text-slate-800 leading-snug">{currentUser.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.identifier} • {currentUser.department}</p>
                          <div className="mt-2">
                            {getRoleBadge(currentUser.role)}
                          </div>
                        </div>

                        <div className="py-1 space-y-0.5 text-xs">
                          <Link
                            href="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                          >
                            <LayoutDashboard className="w-4 h-4 text-slate-400" />
                            <span>Peminjaman Saya</span>
                          </Link>

                          {isAdmin && (
                            <Link
                              href="/admin/approvals"
                              onClick={() => setUserDropdownOpen(false)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-yarsi-primary hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                            >
                              <ShieldCheck className="w-4 h-4 text-slate-400" />
                              <span>Admin Portal</span>
                            </Link>
                          )}
                        </div>

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
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                      item.highlight
                        ? isHome ? 'bg-emerald-400/15 text-white font-semibold' : 'bg-yarsi-primary text-white font-semibold'
                        : isActive
                        ? isHome ? 'bg-white/10 text-white font-bold' : 'text-yarsi-primary bg-emerald-50 font-bold'
                        : isHome ? 'text-emerald-50/75 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold text-white bg-rose-500 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
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
