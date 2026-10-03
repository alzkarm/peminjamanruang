'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  AlertTriangle,
  ArrowRight,
  Home,
  FileText,
  Sparkles,
  Users,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { formatDateIndo } from '@/lib/utils';

interface BookingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onViewStatus?: () => void;
  onBackToHome?: () => void;
}

export function BookingSuccessModal({
  isOpen,
  onClose,
  booking,
  onViewStatus,
  onBackToHome,
}: BookingSuccessModalProps) {
  const router = useRouter();

  const [isUnderstood, setIsUnderstood] = useState(false);
  const [canCheck, setCanCheck] = useState(false);

  // 1.5-second timer delay before checkbox can be checked (to ensure reading focus)
  useEffect(() => {
    if (!isOpen) {
      setIsUnderstood(false);
      setCanCheck(false);
      return;
    }

    setIsUnderstood(false);
    setCanCheck(false);

    const timer = setTimeout(() => {
      setCanCheck(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleViewStatus = () => {
    if (!isUnderstood) return;
    onClose();
    if (onViewStatus) {
      onViewStatus();
    } else {
      router.push('/dashboard');
    }
  };

  const handleBackToHome = () => {
    if (!isUnderstood) return;
    onClose();
    if (onBackToHome) {
      onBackToHome();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[20px_6px_20px_20px] border border-slate-200/90 bg-white p-4 sm:p-6 shadow-2xl relative space-y-3.5">
        {/* Compact Celebration Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-yarsi-primary text-white mx-auto flex items-center justify-center shadow-md shadow-emerald-900/20 ring-4 ring-emerald-50">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-0.5">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Tiket Antrean Terbit</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              🎉 Pengajuan Peminjaman Berhasil Dikirim!
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
              Permohonan Anda telah masuk ke dalam antrean sistem SIPERU Universitas YARSI.
            </p>
          </div>
        </div>

        {/* Compact Booking Summary Box */}
        {booking && (
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <FileText className="w-3.5 h-3.5 text-yarsi-primary shrink-0" />
                <span className="truncate max-w-[280px]">{booking.title}</span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 font-bold border border-slate-200 shrink-0">
                ID: {booking.id.slice(0, 8)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-semibold text-slate-800">
                  {booking.roomName || 'Ruangan'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{formatDateIndo(booking.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{booking.startTime} - {booking.endTime} WIB</span>
              </div>
              {booking.estimatedAttendees && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>± {booking.estimatedAttendees} Orang</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compact 1x24 Jam Warning Box */}
        <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 font-extrabold text-[11px] text-amber-900 uppercase tracking-wide">
            <div className="p-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
            </div>
            <span>⚠️ Batas Waktu Verifikasi (1x24 Jam)</span>
          </div>

          <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
            Pengajuan wajib di-follow up. Permohonan yang tidak diproses oleh Admin dalam 1x24 jam akan <strong>dibatalkan secara otomatis</strong> oleh sistem.
          </p>
        </div>

        {/* Compact Checkbox Konfirmasi Pemahaman Aturan 1x24 Jam */}
        <div
          className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
            isUnderstood
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20'
              : !canCheck
                ? 'bg-slate-50 border-slate-200/90'
                : 'bg-amber-50/60 border-amber-300 hover:bg-amber-50/90'
          }`}
        >
          <label
            htmlFor="understood1x24Check"
            className={`flex items-start gap-2.5 select-none ${
              !canCheck ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
            }`}
          >
            <div className="relative flex items-center pt-0.5">
              <input
                type="checkbox"
                id="understood1x24Check"
                disabled={!canCheck}
                checked={isUnderstood}
                onChange={(e) => setIsUnderstood(e.target.checked)}
                className="w-4 h-4 rounded text-yarsi-primary focus:ring-yarsi-primary border-slate-300 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed accent-emerald-600 transition-all"
              />
            </div>
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  Konfirmasi Pemahaman Batas Waktu *
                </p>
                {!canCheck && (
                  <span className="text-[9.5px] font-extrabold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full shrink-0">
                    Tunggu 1.5s
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Saya telah membaca dan memahami bahwa pengajuan ini <strong>wajib di-follow up</strong> dan akan <strong>otomatis dibatalkan oleh sistem</strong> jika tidak diproses oleh Admin dalam waktu <strong>1x24 jam</strong>.
              </p>
            </div>
          </label>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            disabled={!isUnderstood}
            onClick={handleViewStatus}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              !isUnderstood
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                : 'bg-yarsi-primary hover:bg-yarsi-dark text-white shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer'
            }`}
          >
            <span>Lihat Status Peminjaman</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={!isUnderstood}
            onClick={handleBackToHome}
            className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all border ${
              !isUnderstood
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 opacity-60 shadow-none'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 border-slate-200 cursor-pointer'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-slate-500" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
