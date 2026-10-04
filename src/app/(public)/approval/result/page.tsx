'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Calendar,
  User,
  ExternalLink,
  ChevronLeft,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { quickApprovalApi } from '@/lib/api';

function QuickApprovalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token persetujuan tidak ditemukan pada tautan.');
      setLoading(false);
      return;
    }

    quickApprovalApi
      .execute(token)
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || 'Gagal memproses persetujuan cepat.');
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-yarsi-dark text-white border-b border-emerald-800/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Persetujuan Resmi Yayasan</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex items-center justify-center">
        {loading ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 text-center space-y-4 w-full">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center animate-spin">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              Memproses Otorisasi Pimpinan...
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Memverifikasi tanda tangan digital token persetujuan di server terpusat SIPERU YARSI.
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-rose-200 text-center space-y-4 w-full">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-rose-700">Persetujuan Tidak Dapat Diproses</h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              {error}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm"
              >
                Buka Beranda SIPERU
              </Link>
            </div>
          </div>
        ) : result?.alreadyProcessed ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-amber-200 text-center space-y-4 w-full">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-amber-800">Permohonan Telah Diproses</h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              {result.message}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href={`/verify/${result.booking?.id || ''}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                Lihat Status Permohonan
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Ke Beranda
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 text-center space-y-5 w-full">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                OTORISASI 1-KLIK BERHASIL
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2">
                Persetujuan Resmi Berhasil Diterbitkan
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Status permohonan peminjaman ruangan telah diperbarui dan tercatat pada riwayat audit resmi kampus YARSI.
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-400 font-medium">Kode Permohonan:</span>
                <span className="font-mono font-bold text-slate-800">{result.bookingCode}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-400 font-medium">Ruangan:</span>
                <strong className="text-slate-800">{result.roomName}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-400 font-medium">Penanggung Jawab:</span>
                <span className="font-semibold text-slate-800">{result.applicantName}</span>
              </div>
              {result.passToken && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Security Pass:</span>
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    {result.passToken}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href={`/verify/${result.passToken || result.bookingCode}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-yarsi-primary hover:bg-yarsi-dark text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Lihat Bukti Verifikasi Resmi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Beranda SIPERU
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-[11px] text-slate-400">
        SIPERU • Sistem Informasi Peminjaman Ruangan Terpadu Universitas YARSI
      </footer>
    </div>
  );
}

export default function QuickApprovalResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <QuickApprovalContent />
    </Suspense>
  );
}
