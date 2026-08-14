'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { DEMO_USERS } from '@/lib/mockData';
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
  Sparkles,
  Menu,
  X,
  FileCheck2,
  Lock,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, loginAsRole, bookings } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <header className="sticky top-0 z-40 w-full border-b border-emerald-900/10 bg-white/95 backdrop-blur shadow-sm">
      {/* Top Banner Notice */}
      <div className="bg-yarsi-dark text-emerald-100 text-xs px-4 py-1.5 flex items-center justify-between border-b border-emerald-900/20">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium truncate">
            Smart Campus Universitas YARSI • Sistem Informasi Peminjaman Ruangan Terpadu (SIPERU)
          </span>
          <div className="hidden md:flex items-center gap-3 ml-auto text-emerald-200 text-[11px]">
            <span>Menara YARSI • Gedung FK/FKG • Gedung C</span>
            <span className="text-emerald-400">|</span>
            <span className="flex items-center gap-1 font-semibold text-white">
              <Sparkles className="w-3 h-3 text-amber-400" /> Real-time Conflict Engine
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yarsi-primary to-yarsi-dark flex items-center justify-center text-white shadow-md shadow-emerald-900/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-yarsi-dark">SIPERU</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-yarsi-primary">YARSI</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">Smart Campus Booking</p>
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
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    item.highlight
                      ? 'bg-yarsi-primary text-white hover:bg-yarsi-dark shadow-sm shadow-emerald-900/20 hover:shadow-md'
                      : isActive
                      ? 'text-yarsi-primary bg-emerald-50 font-semibold'
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
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500"
                  />
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
                          Simulasi Ganti Role (LDAP SSO)
                        </p>
                        {DEMO_USERS.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleRoleChange(u.role)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                              currentUser.role === u.role
                                ? 'bg-emerald-50 text-yarsi-primary font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-left">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <div>
                                <p className="font-semibold">{u.name.split(',')[0]}</p>
                                <p className="text-[10px] text-slate-400">{u.department.split('(')[0]}</p>
                              </div>
                            </div>
                            {getRoleBadge(u.role)}
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
                          <span>Halaman SSO LDAP</span>
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
                <span>Masuk SSO</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
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
