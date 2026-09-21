'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-yarsi-primary mx-auto flex items-center justify-center shadow-inner">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-yarsi-primary bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Halaman Tidak Ditemukan (404)
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">
            Rute Tidak Tersedia
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Halaman yang Anda cari mungkin telah dipindahkan, diubah alamatnya, atau tidak dapat diakses saat ini.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda Utama</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
