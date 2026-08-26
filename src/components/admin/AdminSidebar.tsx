'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  ShieldCheck,
  Building2,
  Lock,
  BarChart3,
  CalendarDays,
  Layers,
  ArrowLeft,
  GraduationCap,
  Users,
  CheckSquare,
} from 'lucide-react';

export function AdminSidebar() {
  const pathname = usePathname();
  const { bookings, currentUser, loginAsRole } = useAppStore();

  const pendingLPFCount = bookings.filter((b) => b.status === 'PENDING_LPF').length;
  const pendingYayasanCount = bookings.filter((b) => b.status === 'RECOMMENDED_YAYASAN').length;

  const navItems = [
    {
      href: '/admin/approvals',
      label: 'Persetujuan Reguler (LPF)',
      description: 'Review permohonan ruang kuliah & lab',
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
      label: 'Bulk Blocker Kuliah',
      description: 'Kunci jadwal semester otomatis',
      icon: GraduationCap,
    },
    {
      href: '/admin/reports',
      label: 'Laporan & Analitik',
      description: 'Okupansi ruang & export Excel/PDF',
      icon: BarChart3,
    },
  ];

  return (
    <aside className="w-full lg:w-72 bg-white rounded-xl border border-slate-200 p-4 space-y-5">
      {/* Header */}
      <div className="pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-yarsi-primary text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">Admin Portal</h3>
            <p className="text-xs text-slate-500">Universitas & Yayasan YARSI</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-h-11 flex items-start justify-between p-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-yarsi-primary border border-emerald-200 font-bold'
                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isActive ? 'text-yarsi-primary' : 'text-slate-500'
                  }`}
                />
                <div>
                  <p className="text-xs font-bold leading-tight">{item.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 text-xs font-bold text-white rounded-md ${item.badgeColor} shrink-0`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role Context Indicator */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
        <p className="font-bold text-slate-700 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-yarsi-primary" />
          <span>Role Pengguna Aktif</span>
        </p>
        <div className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-200">
          <div>
            <p className="font-bold text-slate-800">{currentUser.name.split(',')[0]}</p>
            <p className="text-[10px] text-slate-500 uppercase font-mono">
              {currentUser.role.replace('_', ' ')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => loginAsRole('admin_lpf')}
            className={`min-h-9 py-1.5 px-2 rounded-md text-[11px] font-bold border transition-colors ${
              currentUser.role === 'admin_lpf'
                ? 'bg-yarsi-primary text-white border-yarsi-primary'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Mode LPF
          </button>
          <button
            type="button"
            onClick={() => loginAsRole('admin_yayasan')}
            className={`min-h-9 py-1.5 px-2 rounded-md text-[11px] font-bold border transition-colors ${
              currentUser.role === 'admin_yayasan'
                ? 'bg-yarsi-primary text-white border-yarsi-primary'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Mode Yayasan
          </button>
        </div>
      </div>

      {/* Return to Public Portal */}
      <div className="pt-1">
        <Link
          href="/"
          className="min-h-10 flex items-center justify-center gap-2 p-2 text-xs font-semibold text-slate-700 hover:text-yarsi-primary hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Publik</span>
        </Link>
      </div>
    </aside>
  );
}
