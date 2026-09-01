'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'admin_lpf' || currentUser?.role === 'admin_yayasan';

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              Hak Akses Terbatas
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              Admin Portal SIPERU
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Halaman ini dikhususkan untuk Administrator Bagian Pengelolaan Fasilitas (LPF) dan Sekretariat Yayasan YARSI.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/auth/login?redirect=/admin/approvals"
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Masuk dengan Akun Admin LDAP</span>
            </Link>

            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
            >
              Kembali ke Beranda Publik
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <AdminSidebar />
          <main className="flex-1 w-full overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
