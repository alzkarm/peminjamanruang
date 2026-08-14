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
    <aside className="w-full lg:w-72 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-yarsi-primary text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">Admin Portal</h3>
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
              className={`flex items-start justify-between p-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-emerald-50 text-yarsi-primary border border-emerald-200/80 font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
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
                  className={`ml-2 px-2 py-0.5 text-xs font-extrabold text-white rounded-full ${item.badgeColor} shrink-0 animate-pulse`}
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
          <span>Role Pengguna Aktif</span>
        </p>
        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
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
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
              currentUser.role === 'admin_lpf'
                ? 'bg-yarsi-primary text-white border-yarsi-primary'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Mode LPF
          </button>
          <button
            type="button"
            onClick={() => loginAsRole('admin_yayasan')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
              currentUser.role === 'admin_yayasan'
                ? 'bg-yarsi-primary text-white border-yarsi-primary'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Mode Yayasan
          </button>
        </div>
      </div>

      {/* Return to Public Portal */}
      <div className="pt-2">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 p-2.5 text-xs font-semibold text-slate-600 hover:text-yarsi-primary hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Publik</span>
        </Link>
      </div>
    </aside>
  );
}
