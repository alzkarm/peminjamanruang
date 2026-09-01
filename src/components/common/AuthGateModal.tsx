'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import {
  Lock,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UserCheck,
  QrCode,
  CalendarCheck,
  Layers,
} from 'lucide-react';

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
  actionTitle = 'Peminjaman Ruangan Memerlukan Autentikasi',
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="md"
    >
      <div className="space-y-6 pt-2 pb-2">
        {/* Header Visual */}
        <div className="relative rounded-2xl bg-gradient-to-br from-yarsi-dark via-yarsi-primary to-emerald-900 text-white p-6 overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur text-[11px] font-bold text-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Autentikasi Civitas YARSI</span>
              </div>
              <h3 className="text-xl font-black text-white leading-tight mt-1">
                {actionTitle}
              </h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed mt-1">
                {customMessage ||
                  'Anda saat ini sedang menjelajah dalam Mode Tamu (Guest Mode). Untuk mengajukan reservasi ruangan kampus atau melihat status peminjaman, silakan masuk menggunakan akun LDAP SSO YARSI.'}
              </p>
            </div>
          </div>
        </div>

        {/* Selected Room Context Box (If user clicked Pinjam on specific room) */}
        {targetRoomName && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yarsi-primary text-white flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Ruangan yang Dipilih</p>
                <p className="text-sm font-extrabold text-slate-800">{targetRoomName}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-yarsi-primary bg-white px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs">
              Tersimpan Otomatis
            </span>
          </div>
        )}

        {/* Features Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <UserCheck className="w-4 h-4 text-yarsi-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Single Sign-On (SSO)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Gunakan NIM, NIDN, NIK aktif civitas kampus.</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <QrCode className="w-4 h-4 text-yarsi-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Tiket Akses Digital QR</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Akses check-in cepat di pos satpam & LPF.</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <CalendarCheck className="w-4 h-4 text-yarsi-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Persetujuan Digital Multi-Level</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Tracking status verifikasi LPF & Yayasan real-time.</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-yarsi-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Logistik & Fasilitas Lengkap</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Pemesanan proyektor, audio, hingga videotron.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-3 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-center"
          >
            Lanjut Jelajahi Saja (Mode Tamu)
          </button>

          <button
            type="button"
            onClick={handleGoToLogin}
            className="w-full sm:w-auto flex-1 py-3 px-4 text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
          >
            <span>Masuk Melalui LDAP SSO</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
