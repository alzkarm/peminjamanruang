'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, ShieldAlert } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled SIPERU Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 text-center space-y-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center shadow-inner dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30">
            Penanganan Kesalahan Sistem
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2 dark:text-slate-100">
            Terjadi Kendala Memuat Halaman
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed dark:text-slate-400">
            Sistem SIPERU mengalami gangguan sementara saat memproses data sesi atau data ruangan. Anda dapat mencoba memuat ulang halaman ini.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-200 truncate dark:bg-slate-800/60 dark:border-slate-700">
              {error.message}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Coba Lagi</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
