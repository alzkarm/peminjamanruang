'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, CalendarCheck2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoomId?: string;
  targetRoomName?: string;
  targetDate?: string;
  targetStartTime?: string;
  targetEndTime?: string;
  actionTitle?: string;
  customMessage?: string;
}

export function AuthGateModal({
  isOpen,
  onClose,
  targetRoomId,
  targetRoomName,
  targetDate,
  targetStartTime,
  targetEndTime,
  actionTitle = 'Masuk untuk melanjutkan',
  customMessage,
}: AuthGateModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToLogin = () => {
    onClose();
    const queryParams = new URLSearchParams();
    queryParams.append('redirect', '/dashboard/booking/new');
    if (targetRoomId) queryParams.append('roomId', targetRoomId);
    if (targetDate) queryParams.append('date', targetDate);
    if (targetStartTime) queryParams.append('startTime', targetStartTime);
    if (targetEndTime) queryParams.append('endTime', targetEndTime);

    router.push(`/auth/login?${queryParams.toString()}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="md">
      <div className="overflow-hidden rounded-[18px_4px_18px_18px] border border-emerald-900/10 bg-white">
        <div className="relative overflow-hidden bg-[#063d30] p-6 text-white sm:p-7">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(135deg,transparent,rgba(52,211,153,0.13))]" aria-hidden="true" />
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-[11px_3px_11px_11px] border border-white/15 bg-white/10 text-emerald-200">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.17em] text-emerald-300">Akun civitas YARSI</p>
            <h2 className="mt-2 max-w-sm text-2xl font-black tracking-tight">{actionTitle}</h2>
            <p className="mt-3 max-w-md text-xs leading-5 text-emerald-50/75 sm:text-sm">
              {customMessage || 'Peminjaman dan riwayat permohonan tersedia setelah Anda masuk menggunakan akun SSO Universitas YARSI.'}
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {targetRoomName && (
            <div className="mb-5 flex items-center gap-3 border-l-2 border-yarsi-primary bg-emerald-50/70 px-4 py-3">
              <Building2 className="h-5 w-5 shrink-0 text-yarsi-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Pilihan tersimpan</p>
                <p className="truncate text-sm font-bold text-slate-900">{targetRoomName}</p>
                {(targetDate || targetStartTime) && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{targetDate}{targetStartTime ? ` · ${targetStartTime}–${targetEndTime} WIB` : ''}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3 border-y border-slate-100 py-4 text-xs text-slate-600 sm:grid-cols-2">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yarsi-primary" aria-hidden="true" />Identitas kampus terverifikasi</span>
            <span className="flex items-center gap-2"><CalendarCheck2 className="h-4 w-4 text-yarsi-primary" aria-hidden="true" />Pilihan jadwal tetap tersimpan</span>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 px-4 text-sm font-bold text-slate-600 hover:bg-slate-100">
              Kembali menjelajah
            </button>
            <button type="button" onClick={handleGoToLogin} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px_2px_9px_9px] bg-yarsi-primary px-5 text-sm font-bold text-white shadow-sm hover:bg-yarsi-dark">
              Masuk dengan SSO <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
