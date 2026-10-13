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
  const [executing, setExecuting] = useState<boolean>(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token persetujuan tidak ditemukan pada tautan.');
      setLoading(false);
      return;
    }

    // Step 1: Fetch read-only preview (safe against email scanner GET auto-triggers)
    quickApprovalApi
      .preview(token)
      .then((data) => {
        setPreview(data);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || 'Gagal memverifikasi tautan persetujuan.');
        setLoading(false);
      });
  }, [token]);

  const handleConfirmAction = async () => {
    if (!token) return;
    setExecuting(true);
    setError(null);
    try {
      const data = await quickApprovalApi.execute(token);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memproses persetujuan cepat.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between dark:bg-[#0b1120]">
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
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 text-center space-y-4 w-full dark:bg-slate-900 dark:border-slate-800">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center animate-spin dark:bg-emerald-500/10 dark:border-emerald-500/30">
              <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Memverifikasi Keabsahan Tautan...
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto dark:text-slate-400">
              Memeriksa keaslian tanda tangan digital token persetujuan di server terpusat SIPERU YARSI.
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-rose-200 text-center space-y-4 w-full dark:bg-slate-900 dark:border-rose-500/40">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/40 dark:text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-rose-700 dark:text-rose-400">Persetujuan Tidak Dapat Diproses</h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto dark:text-slate-300">
              {error}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={() => { setError(null); handleConfirmAction(); }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                Coba Lagi
              </button>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm"
              >
                Buka Beranda SIPERU
              </Link>
            </div>
          </div>
        ) : result ? (
          /* State 3: Execution Successful */
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 text-center space-y-5 w-full dark:bg-slate-900 dark:border-slate-800">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full dark:text-emerald-200 dark:bg-emerald-500/15">
                OTORISASI RESMI BERHASIL
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 dark:text-slate-100">
                {result.message || 'Persetujuan Resmi Berhasil Diterbitkan'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto dark:text-slate-400">
                Status permohonan peminjaman ruangan telah diperbarui dan tercatat pada riwayat audit resmi kampus YARSI.
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5 text-xs dark:bg-slate-800/70 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <span className="text-slate-400 font-medium">Kode Permohonan:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{result.bookingCode}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <span className="text-slate-400 font-medium">Ruangan:</span>
                <strong className="text-slate-800 dark:text-slate-200">{result.roomName}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <span className="text-slate-400 font-medium">Penanggung Jawab:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{result.applicantName}</span>
              </div>
              {result.passToken && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Security Pass:</span>
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded dark:text-emerald-300 dark:bg-emerald-500/10">
                    {result.passToken}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href={`/verify/${result.passToken || result.bookingCode}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-yarsi-primary hover:bg-yarsi-dark text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <span>Lihat Bukti Verifikasi Resmi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
              >
                Beranda SIPERU
              </Link>
            </div>
          </div>
        ) : preview?.alreadyProcessed ? (
          /* State 2: Already Processed */
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-amber-200 text-center space-y-4 w-full dark:bg-slate-900 dark:border-amber-500/30">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-amber-800 dark:text-amber-200">Permohonan Telah Diproses</h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto dark:text-slate-300">
              {preview.message || `Permohonan ini telah berstatus ${preview.status} dan tidak dapat diubah lagi.`}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href={`/verify/${preview.bookingId || ''}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm dark:hover:bg-emerald-500"
              >
                Lihat Status Permohonan
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
              >
                Ke Beranda
              </Link>
            </div>
          </div>
        ) : (
          /* State 1: Interactive Confirmation Landing Page (Bot-Safe) */
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 text-center space-y-5 w-full dark:bg-slate-900 dark:border-slate-800">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-inner ${
              preview?.action === 'REJECT'
                ? 'bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400'
            }`}>
              {preview?.action === 'REJECT' ? <XCircle className="w-9 h-9" /> : <ShieldCheck className="w-9 h-9" />}
            </div>

            <div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                preview?.action === 'REJECT'
                  ? 'text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-500/15'
                  : 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-500/15'
              }`}>
                KONFIRMASI AKSI {preview?.action === 'REJECT' ? 'PENOLAKAN' : 'PERSETUJUAN'}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 dark:text-slate-100">
                {preview?.action === 'REJECT' ? 'Konfirmasi Penolakan Permohonan' : 'Konfirmasi Persetujuan Permohonan'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto dark:text-slate-400">
                Silakan tinjau rincian kegiatan di bawah ini sebelum mengonfirmasi tindakan. Tindakan ini memerlukan persetujuan manual untuk mencegah auto-trigger dari sistem email.
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5 text-xs dark:bg-slate-800/70 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <span className="text-slate-400 font-medium">Judul Kegiatan:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-right">{preview?.title}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <span className="text-slate-400 font-medium">Ruangan:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{preview?.roomName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <span className="text-slate-400 font-medium">Penanggung Jawab:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{preview?.applicantName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <span className="text-slate-400 font-medium">Penyetuju Ditunjuk:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{preview?.approverName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Kode Permohonan:</span>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded dark:text-emerald-300 dark:bg-emerald-500/10">
                  {preview?.bookingCode}
                </span>
              </div>
            </div>

            {/* Interactive Confirm Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                disabled={executing}
                onClick={handleConfirmAction}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 ${
                  preview?.action === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {executing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : preview?.action === 'REJECT' ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {executing
                    ? 'Memproses Otorisasi...'
                    : preview?.action === 'REJECT'
                      ? 'Konfirmasi Tolak Permohonan'
                      : 'Konfirmasi Setujui Permohonan'}
                </span>
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
              >
                Batalkan & Ke Beranda
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 dark:bg-[#0b1120]">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <QuickApprovalContent />
    </Suspense>
  );
}
