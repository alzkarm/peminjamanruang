'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore, DEMO_ACCOUNTS } from '@/lib/store';
import { Role } from '@/lib/types';
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
  FileCheck2,
  Lock,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, loginAsRole, bookings, fetchInitialData } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchInitialData();
  }, [fetchInitialData]);

  // Compute pending counts
  const pendingLPFCount = bookings.filter((b) => b.status === 'PENDING_LPF').length;
  const pendingYayasanCount = bookings.filter((b) => b.status === 'RECOMMENDED_YAYASAN').length;

  interface NavLinkItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badge?: number;
  }

  const isAdmin = currentUser?.role === 'admin_lpf' || currentUser?.role === 'admin_yayasan';

  const navLinks: NavLinkItem[] = [
    { href: '/', label: 'Beranda', icon: CalendarDays },
    { href: '/schedule', label: 'Kalender Ruangan', icon: CalendarDays },
    { href: '/dashboard', label: 'Peminjaman Saya', icon: LayoutDashboard },
    { href: '/dashboard/booking/new', label: 'Pinjam Ruang', icon: PlusCircle, highlight: true },
  ];

  if (isAdmin) {
    navLinks.push({
      href: '/admin/approvals',
      label: 'Admin Portal',
      icon: ShieldCheck,
      badge: currentUser.role === 'admin_yayasan' ? pendingYayasanCount : pendingLPFCount,
    });
  }

  const handleRoleChange = (role: Role) => {
    loginAsRole(role);
    setUserDropdownOpen(false);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin_yayasan':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">Yayasan YARSI</span>;
      case 'admin_lpf':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">Admin LPF</span>;
      case 'dosen':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">Dosen / Tendik</span>;
      case 'mahasiswa':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-300">Mahasiswa</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
      {/* Top Banner Notice */}
      <div className="bg-yarsi-dark text-emerald-50 text-xs px-4 py-1.5 border-b border-emerald-950/30">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <span className="font-medium truncate">
            Universitas YARSI · Sistem Informasi Peminjaman Ruangan
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-yarsi-primary flex items-center justify-center text-white">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-yarsi-dark">SIPERU</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-yarsi-primary">YARSI</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-none">Peminjaman Ruangan</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : item.href === '/admin/approvals'
                  ? pathname.startsWith('/admin')
                  : pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    item.highlight
                      ? isActive
                        ? 'bg-yarsi-dark text-white ring-2 ring-emerald-300/40 shadow-sm'
                        : 'bg-yarsi-primary text-white hover:bg-yarsi-dark shadow-sm shadow-emerald-900/20 hover:shadow-md'
                      : isActive
                      ? 'text-yarsi-primary bg-emerald-50 font-semibold border border-emerald-200/80'
                      : 'text-slate-600 hover:text-yarsi-primary hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.highlight ? 'text-white' : isActive ? 'text-yarsi-primary' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-rose-500 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Role Switcher */}
          <div className="flex items-center gap-3">
            {mounted && currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="menu"
                  className="min-h-11 flex items-center gap-2.5 p-1.5 pr-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 focus:ring-2 focus:ring-yarsi-primary"
                >
                  {currentUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-600" />
                  ) : (
                    <span aria-hidden="true" className="w-8 h-8 rounded-full bg-emerald-100 text-yarsi-primary flex items-center justify-center text-xs font-bold">
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1 max-w-[130px] leading-tight">
                      {currentUser.name.split(' ')[0]}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {getRoleBadge(currentUser.role)}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 ring-1 ring-black/5 z-50 animate-fade-in">
                      <div className="px-3 py-2.5 border-b border-slate-100 mb-1 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-400 font-medium">Masuk sebagai:</p>
                        <p className="text-sm font-bold text-slate-800 leading-snug">{currentUser.name}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.identifier} • {currentUser.department}</p>
                      </div>

                      <div className="py-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                          Simulasi Akun Pengguna
                        </p>
                        {Object.entries(DEMO_ACCOUNTS)
                          .filter(([role]) => role !== 'guest')
                          .map(([role, u]) => (
                          <button
                            key={role}
                            onClick={() => handleRoleChange(role as Role)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                              currentUser.role === role
                                ? 'bg-emerald-50 text-yarsi-primary font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-left">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <div>
                                <p className="font-semibold">{u.name.split(',')[0]}</p>
                                <p className="text-[10px] text-slate-400">{u.dept.split('(')[0]}</p>
                              </div>
                            </div>
                            {getRoleBadge(role as Role)}
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 pt-1 mt-1">
                        <Link
                          href="/auth/login"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-yarsi-primary hover:bg-slate-50 rounded-lg"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Halaman Masuk Akun</span>
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yarsi-primary hover:bg-yarsi-dark rounded-xl shadow-sm transition-all"
              >
                <User className="w-4 h-4" />
                <span>Masuk Akun</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden min-w-11 min-h-11 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 space-y-1 animate-fade-in">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                    item.highlight
                      ? 'bg-yarsi-primary text-white font-semibold'
                      : isActive
                      ? 'text-yarsi-primary bg-emerald-50 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
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
          </div>
        )}
      </div>
    </header>
  );
}
