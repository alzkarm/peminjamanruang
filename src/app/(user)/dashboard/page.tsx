'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { useAppStore } from '@/lib/store';
import { Booking, BookingStatus } from '@/lib/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import {
  formatDateIndo,
  getJakartaDateString,
  isRecurringBooking,
  getRecurringScheduleLabel,
  countUniqueBookingApplications,
} from '@/lib/utils';
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
  Check,
  Repeat,
  ChevronDown,
  ChevronUp,
  CalendarRange,
  Loader2,
  ExternalLink,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { bookingsApi } from '@/lib/api';
import { RescheduleBookingModal } from '@/components/booking/RescheduleBookingModal';
import { CalendarExportButtons } from '@/components/common/CalendarExportButtons';

interface UserBookingGroup {
  groupId: string;
  isRecurring: boolean;
  masterBooking: Booking;
  bookings: Booking[];
  totalSessions: number;
  startDate: string;
  endDate: string;
}

export default function UserDashboardPage() {
  const { currentUser, bookings, cancelBooking, fetchBookings, fetchRooms } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [activePenalties, setActivePenalties] = useState<any[]>([]);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const ticketCardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const getTicketVerificationUrl = (booking: Booking) => {
    const code = booking.passToken || booking.bookingCode || booking.id;
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/verify/${code}`;
    }
    return `https://siperu.yarsi.ac.id/verify/${code}`;
  };

  const handleDownloadTicketImage = async () => {
    if (!ticketCardRef.current || !selectedTicket) return;
    try {
      setIsDownloading(true);
      const dataUrl = await toPng(ticketCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `E-Ticket-SIPERU-${selectedTicket.bookingCode}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture ticket image:', err);
      alert('Gagal mengunduh gambar E-Ticket. Silakan coba kembali.');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchBookings().catch(() => undefined);
    fetchRooms().catch(() => undefined);

    bookingsApi
      .getMyPenalties()
      .then((data) => {
        if (Array.isArray(data)) {
          const active = data.filter((p: any) => p.isActive && new Date(p.coolingDownUntil) > new Date());
          setActivePenalties(active);
        }
      })
      .catch(() => undefined);
  }, [fetchBookings, fetchRooms]);

  // Filter user's bookings (admin sees all; pemilik tetap bisa lihat miliknya)
  const userBookings = bookings.filter((b) => {
    if (!currentUser) return false;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    if (isAdmin) {
      return true;
    }
    return b.userId === currentUser.id || b.userNimNidn === currentUser.identifier || (currentUser?.email && b.userEmail === currentUser.email);
  });

  const filteredBookings = userBookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return b.status === 'PENDING' || b.status === 'VERIFIED';
    if (activeTab === 'approved') return b.status === 'APPROVED';
    if (activeTab === 'returned') return b.status === 'RETURNED';
    if (activeTab === 'completed') return b.status === 'COMPLETED';
    if (activeTab === 'rejected') return b.status === 'REJECTED' || b.status === 'CANCELLED';
    return true;
  });

  // Group recurring bookings into single master card
  const groupedBookings: UserBookingGroup[] = useMemo(() => {
    const groups: { [key: string]: Booking[] } = {};
    const groupOrder: string[] = [];

    for (const b of filteredBookings) {
      let key = `single_${b.id}`;
      if (b.bulkGroupId) {
        key = `bulk_${b.bulkGroupId}_${b.status}`;
      } else if (isRecurringBooking(b)) {
        const userKey = b.userId || b.userNimNidn || (b as any).userEmail || b.userName || 'user';
        key = `recur_${userKey}_${b.roomId}_${b.title}_${b.status}`;
      }

      if (!groups[key]) {
        groups[key] = [];
        groupOrder.push(key);
      }
      groups[key].push(b);
    }

    return groupOrder.map((key) => {
      const items = [...groups[key]].sort((a, b) => a.date.localeCompare(b.date));
      const masterBooking = items[0];
      const isRecurring = items.length > 1 || isRecurringBooking(masterBooking);

      return {
        groupId: key,
        isRecurring,
        masterBooking,
        bookings: items,
        totalSessions: items.length,
        startDate: items[0]?.date || '',
        endDate: items[items.length - 1]?.date || '',
      };
    });
  }, [filteredBookings]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const approvedCount = countUniqueBookingApplications(userBookings.filter((b) => b.status === 'APPROVED'));
  const pendingCount = countUniqueBookingApplications(userBookings.filter((b) => b.status === 'PENDING' || b.status === 'VERIFIED'));
  const returnedCount = countUniqueBookingApplications(userBookings.filter((b) => b.status === 'RETURNED'));
  const completedCount = countUniqueBookingApplications(userBookings.filter((b) => b.status === 'COMPLETED'));
  const totalUserBookingsCount = countUniqueBookingApplications(userBookings);
  const todayDate = getJakartaDateString();
  const upcomingBooking = userBookings
    .filter((booking) => booking.status === 'APPROVED' && booking.date >= todayDate)
    .sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`))[0];

  const handleConfirmCancel = async () => {
    if (cancelTargetId) {
      await cancelBooking(cancelTargetId, cancelReason);
      setCancelTargetId(null);
      setCancelReason('');
    }
  };

  const renderStepper = (booking: Booking) => {
    // Dua tahap: Pengajuan -> Menunggu -> Terverifikasi (admin) -> Disetujui (superadmin).
    const steps = [
      { label: 'Pengajuan', key: 'SUBMITTED' },
      { label: 'Menunggu', key: 'PENDING' },
      { label: 'Terverifikasi', key: 'VERIFIED' },
      { label: 'Disetujui', key: 'APPROVED' },
    ];

    let currentStepIndex = 1;
    if (booking.status === 'PENDING') currentStepIndex = 1;
    else if (booking.status === 'VERIFIED') currentStepIndex = 2;
    else if (booking.status === 'APPROVED' || booking.status === 'COMPLETED')
      currentStepIndex = steps.length - 1;
    else if (booking.status === 'RETURNED' || booking.status === 'REJECTED' || booking.status === 'CANCELLED')
      currentStepIndex = -1;

    if (booking.status === 'RETURNED') {
      return (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 rounded-2xl text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Permohonan Dikembalikan untuk Revisi</span>
              {booking.rejectionReason && (
                <p className="text-[11px] text-amber-900 dark:text-amber-200 mt-0.5">
                  <strong>Catatan Verifikator:</strong> {booking.rejectionReason}
                </p>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/booking/new?roomId=${booking.roomId}&date=${booking.date}&startTime=${booking.startTime}&endTime=${booking.endTime}`}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] shrink-0 text-center shadow-sm transition-all"
          >
            Ajukan Ulang / Perbaiki
          </Link>
        </div>
      );
    }

    if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') {
      return (
        <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-bold">
              {booking.status === 'REJECTED' ? 'Permohonan Ditolak' : 'Peminjaman Dibatalkan'}
            </span>
          </div>
          {booking.rejectionReason && (
            <span className="text-[11px] text-rose-700 dark:text-rose-400 italic max-w-md truncate">
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
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700 z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-yarsi-primary dark:bg-emerald-500 z-0 transition-all duration-500"
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
                      ? 'bg-yarsi-primary dark:bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-500/30'
                      : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[10px] mt-1 font-semibold text-center whitespace-nowrap ${
                    isCurrent
                      ? 'text-yarsi-primary dark:text-emerald-400 font-bold'
                      : isCompleted
                      ? 'text-slate-700 dark:text-slate-300'
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
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/15 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Memuat data sesi SIPERU...</p>
        </div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-yarsi-primary dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-yarsi-primary dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
              Autentikasi Diperlukan
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
              Masuk ke Akun Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Halaman ini menampilkan seluruh riwayat peminjaman ruangan dan E-Ticket akses Anda.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-yarsi-primary dark:bg-emerald-600 hover:bg-yarsi-dark dark:hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all"
            >
              <span>Login Akun SSO</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Top Welcome Header */}
      <header className="space-y-4 rounded-[18px_4px_18px_18px] border border-slate-200/90 dark:border-slate-700 border-l-4 border-l-yarsi-primary bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-yarsi-primary dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
              Dashboard Mahasiswa & Civitas
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
              Selamat datang, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">
              NIM/NIDN: {currentUser.identifier} • {currentUser.organization || currentUser.department}
            </p>
          </div>

          <Link
            href="/dashboard/booking/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-yarsi-primary dark:bg-emerald-600 hover:bg-yarsi-dark dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajukan Peminjaman Baru</span>
          </Link>
        </div>
      </header>

      {/* Active Penalty Warning Banner (Task 2.2) */}
      {activePenalties.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Pemberitahuan Sanksi Cooling-Down (No-Show Ruangan)</span>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
            Akun Anda terdeteksi tidak hadir pada jadwal peminjaman yang telah disetujui sebelumnya tanpa melakukan pembatalan. Hak pengajuan peminjaman ruangan baru ditangguhkan sementara hingga{' '}
            <span className="font-bold underline">
              {new Date(activePenalties[0].coolingDownUntil).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            . Alasan: {activePenalties[0].reason}
          </p>
        </div>
      )}

      {/* Upcoming Approved Booking Banner (If any) */}
      {upcomingBooking && (
        <div className="relative overflow-hidden rounded-[18px_4px_18px_18px] border-2 border-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
                  Jadwal Mendatang Terdekat
                </span>
                <span className="font-mono text-xs text-emerald-100 font-bold">
                  {upcomingBooking.bookingCode}
                </span>
              </div>
              <h3 className="text-xl font-black">{upcomingBooking.title}</h3>
              <p className="text-xs text-emerald-100 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-semibold">{upcomingBooking.roomName} (Lt. {upcomingBooking.floor})</span>
                <span>•</span>
                <span>{formatDateIndo(upcomingBooking.date)}</span>
                <span>•</span>
                <span>{upcomingBooking.startTime} - {upcomingBooking.endTime} WIB</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTicket(upcomingBooking)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-200 font-bold text-xs shadow hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all shrink-0"
            >
              <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Buka E-Ticket & QR Check-in</span>
            </button>
          </div>
        </div>
      )}

      {/* Booking History & Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Riwayat & Status Peminjaman Ruang
          </h2>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: `Semua (${totalUserBookingsCount})` },
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
                    ? 'bg-yarsi-primary dark:bg-emerald-600 text-white border-yarsi-primary dark:border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings Card List */}
        {groupedBookings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-4">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Belum ada data peminjaman</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan ajukan permohonan peminjaman ruangan baru untuk kegiatan akademik atau organisasi Anda.
            </p>
            <Link
              href="/dashboard/booking/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-yarsi-primary dark:bg-emerald-600 hover:bg-yarsi-dark dark:hover:bg-emerald-500 rounded-xl shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Pengajuan Baru</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedBookings.map((group) => {
              const booking = group.masterBooking;
              const isGroup = group.totalSessions > 1;
              const isExpanded = expandedGroupIds.includes(group.groupId);

              return (
                <div
                  key={group.groupId}
                  className={`space-y-4 rounded-[16px_4px_16px_16px] border bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors ${
                    isGroup
                      ? 'border-teal-200 dark:border-teal-500/40 hover:border-teal-400'
                      : 'border-slate-200/90 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50'
                  }`}
                >
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-yarsi-primary dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
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
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          {booking.title}
                        </h3>
                        {booking.jenisKegiatan && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 text-yarsi-primary dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40">
                            {booking.jenisKegiatan}
                          </span>
                        )}
                        {isRecurringBooking(booking) && !isGroup && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-500/40 shadow-2xs">
                            <Repeat className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            <span>Rutin Per Semester</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <Building2 className="w-4 h-4 text-yarsi-primary dark:text-emerald-400" />
                          <span>{booking.roomName} (Lt. {booking.floor})</span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Calendar className="w-4 h-4 text-yarsi-primary dark:text-emerald-400" />
                          {isGroup ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatDateIndo(group.startDate)} s.d. {formatDateIndo(group.endDate)} ({group.totalSessions} Sesi)
                            </span>
                          ) : (
                            <span>{formatDateIndo(booking.date)}</span>
                          )}
                        </span>

                        <span className="flex items-center gap-1 font-semibold text-yarsi-primary dark:text-emerald-400">
                          <Clock className="w-4 h-4" />
                          <span>{booking.startTime} - {booking.endTime} WIB</span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>~{booking.estimatedAttendees} Peserta</span>
                        </span>
                      </div>

                      {/* Dedicated Recurring Information Box */}
                      {isRecurringBooking(booking) && (
                        <div className="flex items-start sm:items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50/90 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 text-xs text-teal-950 dark:text-teal-100 font-medium">
                          <Repeat className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-bold text-teal-900 dark:text-teal-200">Jadwal Rutin Pertemuan:</span>
                            <span className="text-teal-800 dark:text-teal-300 font-semibold">
                              {getRecurringScheduleLabel(booking)}
                            </span>
                            {isGroup && (
                              <span className="bg-teal-200/70 dark:bg-teal-500/20 text-teal-900 dark:text-teal-200 text-[11px] font-extrabold px-2 py-0.5 rounded-full ml-1">
                                Total: {group.totalSessions} Sesi Pertemuan
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pt-1 leading-relaxed">
                        {booking.description}
                      </p>

                      {/* Logistics items preview */}
                      {booking.logistik && booking.logistik.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {booking.logistik.map((l, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-medium"
                            >
                              <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{l.jenisItem} ({l.jumlah}x)</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expandable Sessions List for Grouped Recurring Bookings */}
                      {isGroup && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => toggleGroupExpand(group.groupId)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <CalendarRange className="w-4 h-4 text-yarsi-primary dark:text-emerald-400" />
                              <span>
                                {isExpanded
                                  ? `Sembunyikan Rincian Sesi (${group.totalSessions} Pertemuan)`
                                  : `Lihat Rincian Seluruh ${group.totalSessions} Sesi Pertemuan`}
                              </span>
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2.5 max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                              {group.bookings.map((session, idx) => (
                                <div
                                  key={session.id}
                                  className="flex items-center justify-between p-2 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] w-12">
                                      #{idx + 1}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {formatDateIndo(session.date)}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                      ({session.startTime} - {session.endTime} WIB)
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {session.bookingCode}
                                    </span>
                                  </div>
                                  <StatusBadge status={session.status} size="sm" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Actions & QR Preview */}
                    <div className="md:col-span-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-4 space-y-3">
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
                            onClick={() => setRescheduleTarget(booking)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-500/30 transition-colors"
                          >
                            <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Ajukan Pindah Jadwal</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCancelTargetId(booking.id)}
                            className="w-full text-center text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 py-1 hover:underline"
                          >
                            Batalkan Peminjaman
                          </button>
                        </div>
                      ) : booking.status === 'COMPLETED' ? (
                        <div className="space-y-2">
                          {booking.feedbackSubmitted ? (
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                            className="w-full text-center text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            Lihat Arsip Tiket
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(booking)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Detail Pengajuan</span>
                          </button>

                          {booking.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => setRescheduleTarget(booking)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-500/30 transition-colors"
                            >
                              <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Pindah Jadwal</span>
                            </button>
                          )}

                          {(booking.status as string) === 'RESCHEDULE_PENDING' && (
                            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-300 text-[11px] font-semibold text-center">
                              Pindah jadwal sedang ditinjau LPF
                            </div>
                          )}

                          {booking.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => setCancelTargetId(booking.id)}
                              className="w-full text-center text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 py-1 hover:underline"
                            >
                              Batalkan Permohonan
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Stepper Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    {renderStepper(booking)}
                  </div>
                </div>
              );
            })}
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
            <div
              ref={ticketCardRef}
              className="bg-gradient-to-br from-yarsi-dark via-yarsi-primary to-emerald-950 text-white rounded-2xl p-6 shadow-xl border border-emerald-800/30 relative overflow-hidden space-y-6"
            >

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
                {/* Scannable Dynamic QR Code */}
                <div className="w-28 h-28 bg-white p-2 rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-200 shadow-sm relative">
                  <QRCodeSVG
                    value={getTicketVerificationUrl(selectedTicket)}
                    size={96}
                    level="M"
                    includeMargin={false}
                    className="w-full h-full"
                  />
                </div>

                <div className="space-y-1 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
                      Akses Resmi Terverifikasi
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      Scan via Kamera HP
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                    {selectedTicket.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    {selectedTicket.roomName}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 font-semibold">
                    {selectedTicket.passToken ? `Pass ID: ${selectedTicket.passToken}` : `Token: ${selectedTicket.qrCodeToken}`}
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

                {selectedTicket.logistik && selectedTicket.logistik.length > 0 && (
                  <div className="col-span-2 bg-white/10 p-3 rounded-xl backdrop-blur text-xs border border-white/15">
                    <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-teal-300" />
                      <span>Logistik Tambahan yang Disetujui:</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTicket.logistik.map((l, idx) => (
                        <span key={idx} className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded font-medium">
                          {l.jenisItem.replace(/_/g, ' ')}: <strong className="text-amber-200">{l.jumlah} unit</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {isRecurringBooking(selectedTicket) && (
                  <div className="col-span-2 bg-white/15 p-3 rounded-xl backdrop-blur flex items-start sm:items-center gap-2.5 text-xs border border-white/20">
                    <Repeat className="w-4 h-4 text-teal-300 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider">Jadwal Rutin Pertemuan:</p>
                      <p className="font-bold text-white text-xs mt-0.5">{getRecurringScheduleLabel(selectedTicket)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Security & Verification Notice */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tunjukkan tiket ini kepada Petugas Keamanan / LPF Lantai.</span>
                </span>
              </div>
            </div>

            {/* Calendar Integration (Task 2.5) */}
            <CalendarExportButtons booking={selectedTicket} />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadTicketImage}
                disabled={isDownloading}
                className="flex-1 py-2.5 px-4 bg-yarsi-primary dark:bg-emerald-600 hover:bg-yarsi-dark dark:hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isDownloading ? 'Menyimpan Gambar...' : 'Unduh E-Ticket (Gambar)'}</span>
              </button>

              <a
                href={getTicketVerificationUrl(selectedTicket)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                title="Buka Halaman Bukti Verifikasi Resmi"
              >
                <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Uji Scan QR</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
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
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Apakah Anda yakin ingin membatalkan permohonan ini?</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                Slot ruangan akan segera dibebaskan kembali secara real-time di kalender dan riwayat pembatalan dicatat di Audit Log sistem.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Pembatalan:
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Agenda acara dipindahkan atau dibatalkan..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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

      {/* RESCHEDULE MODAL (Task 2.1) */}
      {rescheduleTarget && (
        <RescheduleBookingModal
          booking={rescheduleTarget}
          isOpen={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={() => fetchBookings().catch(() => undefined)}
        />
      )}
    </div>
  );
}
