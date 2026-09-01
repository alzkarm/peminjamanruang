'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Booking, BookingStatus } from '@/lib/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { formatDateIndo } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Building2,
  Users,
  PlusCircle,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Ban,
  FileText,
  Star,
  Download,
  RotateCcw,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';

export default function UserDashboardPage() {
  const { currentUser, bookings, cancelBooking } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Agenda internal dibatalkan / dipindahkan');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter user's bookings (or all if admin)
  const userBookings = bookings.filter((b) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin_lpf' || currentUser.role === 'admin_yayasan') {
      return true;
    }
    return b.userId === currentUser.id || b.userNimNidn === currentUser.identifier;
  });

  const filteredBookings = userBookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return b.status === 'PENDING_LPF' || b.status === 'RECOMMENDED_YAYASAN';
    if (activeTab === 'approved') return b.status === 'APPROVED';
    if (activeTab === 'returned') return b.status === 'RETURNED';
    if (activeTab === 'completed') return b.status === 'COMPLETED';
    if (activeTab === 'rejected') return b.status === 'REJECTED' || b.status === 'CANCELLED';
    return true;
  });

  // Calculate statistics
  const totalCount = userBookings.length;
  const approvedCount = userBookings.filter((b) => b.status === 'APPROVED').length;
  const pendingCount = userBookings.filter(
    (b) => b.status === 'PENDING_LPF' || b.status === 'RECOMMENDED_YAYASAN'
  ).length;
  const returnedCount = userBookings.filter((b) => b.status === 'RETURNED').length;
  const completedCount = userBookings.filter((b) => b.status === 'COMPLETED').length;

  const handleConfirmCancel = async () => {
    if (cancelTargetId) {
      await cancelBooking(cancelTargetId, cancelReason);
      setCancelTargetId(null);
      setCancelReason('Agenda internal dibatalkan / dipindahkan');
    }
  };

  const renderStepper = (booking: Booking) => {
    const isYayasan = booking.requiresYayasanApproval;

    // Steps definition
    const steps = [
      { label: 'Pengajuan', key: 'SUBMITTED' },
      { label: 'Review LPF', key: 'LPF' },
      ...(isYayasan ? [{ label: 'Review Yayasan', key: 'YAYASAN' }] : []),
      { label: 'Disetujui', key: 'APPROVED' },
    ];

    let currentStepIndex = 1;
    if (booking.status === 'PENDING_LPF') currentStepIndex = 1;
    else if (booking.status === 'RECOMMENDED_YAYASAN') currentStepIndex = 2;
    else if (booking.status === 'APPROVED' || booking.status === 'COMPLETED')
      currentStepIndex = steps.length - 1;
    else if (booking.status === 'RETURNED' || booking.status === 'REJECTED' || booking.status === 'CANCELLED')
      currentStepIndex = -1;

    if (booking.status === 'RETURNED') {
      return (
        <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Permohonan Dikembalikan untuk Revisi</span>
              {booking.rejectionReason && (
                <p className="text-[11px] text-amber-900 mt-0.5">
                  <strong>Catatan Verifikator:</strong> {booking.rejectionReason}
                </p>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/booking/new?roomId=${booking.roomId}&date=${booking.date}&startTime=${booking.startTime}&endTime=${booking.endTime}`}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] shrink-0 text-center shadow-sm"
          >
            Ajukan Ulang / Perbaiki
          </Link>
        </div>
      );
    }

    if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') {
      return (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">
              {booking.status === 'REJECTED' ? 'Permohonan Ditolak' : 'Peminjaman Dibatalkan'}
            </span>
          </div>
          {booking.rejectionReason && (
            <span className="text-[11px] text-rose-700 italic max-w-md truncate">
              Alasan: {booking.rejectionReason}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="py-2">
        <div className="flex items-center justify-between relative">
          {/* Progress bar line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-yarsi-primary z-0 transition-all duration-500"
            style={{
              width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
            }}
          />

          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                    isCompleted
                      ? 'bg-yarsi-primary text-white ring-4 ring-emerald-100'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[10px] mt-1 font-semibold text-center whitespace-nowrap ${
                    isCurrent
                      ? 'text-yarsi-primary font-bold'
                      : isCompleted
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isGuest = !mounted || !currentUser || currentUser.role === 'guest';

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Memuat data sesi SIPERU...</p>
        </div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-yarsi-primary mx-auto flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-yarsi-primary bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Autentikasi Diperlukan
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Akses Dashboard Peminjaman Saya
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Anda sedang menjelajah dalam Mode Tamu. Silakan masuk menggunakan akun SSO LDAP Universitas YARSI untuk melihat riwayat reservasi, status verifikasi LPF & Yayasan, serta mengunduh E-Ticket QR Anda.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
            >
              Kembali ke Beranda
            </Link>

            <Link
              href="/auth/login?redirect=/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Masuk Melalui LDAP SSO</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Profile & Stats Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
            alt={currentUser?.name || 'User'}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-md"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {currentUser?.name}
              </h1>
              <span className="text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-yarsi-primary border border-emerald-300">
                {currentUser?.role?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              {currentUser?.identifier} • {currentUser?.organization || currentUser?.department}
            </p>
            <p className="text-xs text-slate-400">{currentUser?.email} • {currentUser?.phone}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/booking/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-yarsi-primary hover:bg-yarsi-dark text-white shadow-md hover:shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajukan Peminjaman Ruang</span>
          </Link>
        </div>
      </div>

      {/* Summary Counter Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Total Pengajuan</p>
            <h3 className="text-2xl font-black text-slate-800">{totalCount}</h3>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Antrean Review</p>
            <h3 className="text-2xl font-black text-amber-600">{pendingCount}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Perlu Revisi</p>
            <h3 className="text-2xl font-black text-amber-700">{returnedCount}</h3>
          </div>
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Disetujui (Ready)</p>
            <h3 className="text-2xl font-black text-emerald-600">{approvedCount}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Selesai Digunakan</p>
            <h3 className="text-2xl font-black text-teal-700">{completedCount}</h3>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Star className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Booking List & Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-900">
            Riwayat & Status Peminjaman Ruang
          </h2>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: `Semua (${userBookings.length})` },
              { id: 'pending', label: `Antrean (${pendingCount})` },
              { id: 'returned', label: `Revisi (${returnedCount})` },
              { id: 'approved', label: `Disetujui (${approvedCount})` },
              { id: 'completed', label: `Selesai (${completedCount})` },
              { id: 'rejected', label: 'Ditolak / Batal' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activeTab === tab.id
                    ? 'bg-yarsi-primary text-white border-yarsi-primary shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings Card List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Belum ada data peminjaman</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan ajukan permohonan peminjaman ruangan baru untuk kegiatan akademik atau organisasi Anda.
            </p>
            <Link
              href="/dashboard/booking/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark rounded-xl shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Pengajuan Baru</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 hover:border-emerald-300 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-yarsi-primary bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {booking.bookingCode}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Diajukan: {booking.createdAt}
                    </span>
                  </div>

                  <div>
                    <StatusBadge status={booking.status} size="md" />
                  </div>
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {booking.title}
                      </h3>
                      {booking.jenisKegiatan && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-yarsi-primary border border-emerald-300">
                          {booking.jenisKegiatan}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Building2 className="w-4 h-4 text-yarsi-primary" />
                        <span>{booking.roomName} ({booking.building} Lt. {booking.floor})</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-700">
                        <Calendar className="w-4 h-4 text-yarsi-primary" />
                        <span>{formatDateIndo(booking.date)}</span>
                      </span>

                      <span className="flex items-center gap-1 font-semibold text-yarsi-primary">
                        <Clock className="w-4 h-4" />
                        <span>{booking.startTime} - {booking.endTime} WIB</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>~{booking.estimatedAttendees} Peserta</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 pt-1 leading-relaxed">
                      {booking.description}
                    </p>

                    {/* Logistics items preview */}
                    {booking.logistik && booking.logistik.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {booking.logistik.map((l, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium"
                          >
                            ✓ {l.jenisItem} ({l.jumlah}x)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Actions & QR Preview */}
                  <div className="md:col-span-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 space-y-3">
                    {booking.status === 'APPROVED' ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(booking)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Lihat E-Ticket & QR Akses</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelTargetId(booking.id)}
                          className="w-full text-center text-xs font-medium text-rose-600 hover:text-rose-800 py-1 hover:underline"
                        >
                          Batalkan Peminjaman
                        </button>
                      </div>
                    ) : booking.status === 'COMPLETED' ? (
                      <div className="space-y-2">
                        {booking.feedbackSubmitted ? (
                          <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Feedback Telah Terisi</span>
                          </div>
                        ) : (
                          <Link
                            href={`/dashboard/feedback/${booking.id}`}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all"
                          >
                            <Star className="w-4 h-4 fill-slate-950" />
                            <span>Beri Penilaian Ruang</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(booking)}
                          className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          Lihat Arsip Tiket
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(booking)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Detail Pengajuan</span>
                        </button>

                        {(booking.status === 'PENDING_LPF' ||
                          booking.status === 'RECOMMENDED_YAYASAN') && (
                          <button
                            type="button"
                            onClick={() => setCancelTargetId(booking.id)}
                            className="w-full text-center text-xs font-medium text-rose-600 hover:text-rose-800 py-1 hover:underline"
                          >
                            Batalkan Permohonan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Stepper Bar */}
                <div className="pt-2 border-t border-slate-100">
                  {renderStepper(booking)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* E-TICKET & DETAIL MODAL */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title="E-Ticket Akses Ruangan Resmi"
          subtitle="Universitas YARSI • Biro Layanan Pengelolaan Fasilitas"
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Ticket Card Container */}
            <div className="bg-gradient-to-br from-yarsi-dark via-yarsi-primary to-emerald-950 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/20 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white text-yarsi-dark flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-wide">UNIVERSITAS YARSI</h3>
                    <p className="text-[10px] text-emerald-200">E-TICKET IZIN PEMINJAMAN</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold bg-white/20 px-2 py-1 rounded">
                    {selectedTicket.bookingCode}
                  </span>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="bg-white text-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-inner">
                {/* Simulated QR Code Canvas */}
                <div className="w-28 h-28 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-2 text-white shrink-0 relative">
                  <QrCode className="w-20 h-20 text-white" />
                  <span className="text-[7px] font-mono text-emerald-300 mt-0.5">VERIFIED</span>
                </div>

                <div className="space-y-1 text-center sm:text-left flex-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
                    Akses Resmi Terverifikasi
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                    {selectedTicket.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    {selectedTicket.roomName} ({selectedTicket.building})
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Token: {selectedTicket.qrCodeToken}
                  </p>
                </div>
              </div>

              {/* Event Time & Applicant Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur">
                  <p className="text-emerald-200 text-[10px]">Waktu Pelaksanaan:</p>
                  <p className="font-bold text-white mt-0.5">{formatDateIndo(selectedTicket.date)}</p>
                  <p className="font-semibold text-amber-300">{selectedTicket.startTime} - {selectedTicket.endTime} WIB</p>
                </div>

                <div className="bg-white/10 p-3 rounded-xl backdrop-blur">
                  <p className="text-emerald-200 text-[10px]">Penanggung Jawab:</p>
                  <p className="font-bold text-white mt-0.5">{selectedTicket.userName}</p>
                  <p className="text-slate-300 text-[11px]">{selectedTicket.userNimNidn} • {selectedTicket.userOrganization}</p>
                </div>
              </div>

              {/* Security & Verification Notice */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tunjukkan tiket ini kepada Petugas Keamanan / LPF Lantai.</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => alert('Fitur Cetak / Simpan E-Ticket PDF berhasil disimulasikan!')}
                className="flex-1 py-2.5 px-4 bg-yarsi-primary hover:bg-yarsi-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Unduh E-Ticket (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCEL CONFIRMATION MODAL (Prioritas 6 - Real-time cancel + Soft-cancel) */}
      {cancelTargetId && (
        <Modal
          isOpen={!!cancelTargetId}
          onClose={() => setCancelTargetId(null)}
          title="Konfirmasi Pembatalan Peminjaman"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Apakah Anda yakin ingin membatalkan permohonan ini?</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Slot ruangan akan segera dibebaskan kembali secara real-time di kalender dan riwayat pembatalan dicatat di Audit Log sistem.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan:
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Agenda acara dipindahkan atau dibatalkan..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                Ya, Batalkan Peminjaman
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
