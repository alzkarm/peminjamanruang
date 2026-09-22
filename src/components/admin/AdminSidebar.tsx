'use client';

import React from 'react';
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
} from 'lucide-react';

import { countUniqueBookingApplications } from '@/lib/utils';

export function AdminSidebar() {
  const pathname = usePathname();
  const { bookings, currentUser, logout } = useAppStore();

  const pendingLPFCount = countUniqueBookingApplications(bookings.filter((b) => b.status === 'PENDING_LPF'));
  const pendingYayasanCount = countUniqueBookingApplications(bookings.filter((b) => b.status === 'RECOMMENDED_YAYASAN'));

  const navItems = [
    {
      href: '/admin/approvals',
      label: 'Persetujuan LPF',
      description: 'Tinjau permohonan ruang reguler',
      icon: ShieldCheck,
      badge: pendingLPFCount,
      badgeColor: 'bg-amber-500',
    },
    {
      href: '/admin/approvals/yayasan',
      label: 'Persetujuan Yayasan',
      description: 'Auditorium Ar-Rahman & R. Senat',
      icon: Building2,
      badge: pendingYayasanCount,
      badgeColor: 'bg-sky-500',
    },
    {
      href: '/admin/academic-bulk',
      label: 'Jadwal Akademik',
      description: 'Kelola penggunaan ruang semester',
      icon: GraduationCap,
    },
    {
      href: '/admin/reports',
      label: 'Laporan & Ekspor',
      description: 'Rekap pemanfaatan ruang',
      icon: BarChart3,
    },
  ];

  return (
    <aside className="w-full space-y-6 rounded-[16px_4px_16px_16px] border border-slate-200/90 bg-white p-4 shadow-sm lg:sticky lg:top-[104px] lg:w-72 lg:self-start">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-yarsi-primary text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold leading-tight text-slate-900">Pengelolaan Ruang</h3>
            <p className="text-xs text-slate-500">Universitas & Yayasan YARSI</p>
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
              className={`flex min-h-14 items-start justify-between border-l-2 p-3 transition-colors ${
                isActive
                  ? 'border-yarsi-primary bg-emerald-50 text-yarsi-primary font-bold'
                  : 'border-transparent text-slate-700 hover:border-emerald-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    isActive ? 'text-yarsi-primary' : 'text-slate-400'
                  }`}
                />
                <div>
                  <p className="text-xs font-bold leading-tight">{item.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
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
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
        <p className="font-bold text-slate-700 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-yarsi-primary" />
          <span>Admin Terverifikasi SSO</span>
        </p>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
          <p className="font-bold text-slate-800">{currentUser?.name?.split(',')[0] || 'Administrator'}</p>
          <p className="text-[10px] text-slate-500 font-mono">
            {currentUser?.identifier} • {currentUser?.department}
          </p>
          <div className="pt-1">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              {currentUser?.role === 'admin_yayasan' ? 'Pengurus Yayasan' : 'Admin LPF'}
            </span>
          </div>
        </div>
      </div>

      {/* Return to Public Portal */}
      <div className="pt-2">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 p-2.5 text-xs font-semibold text-slate-600 hover:text-yarsi-primary hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda Publik</span>
        </Link>
      </div>
    </aside>
  );
}
