'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Booking } from '@/lib/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import {
  formatDateIndo,
  isRecurringBooking,
  getRecurringScheduleLabel,
  countUniqueBookingApplications,
} from '@/lib/utils';
import { bookingsApi } from '@/lib/api';
import {
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  ShieldCheck,
  Calendar,
  Clock,
  Users,
  Award,
  Phone,
  Download,
  PackageCheck,
  Check,
  Repeat,
  Layers,
  ChevronDown,
  ChevronUp,
  CalendarRange,
} from 'lucide-react';

interface BookingGroup {
  groupId: string;
  isRecurring: boolean;
  masterBooking: Booking;
  bookings: Booking[];
  totalSessions: number;
  startDate: string;
  endDate: string;
}

export default function YayasanApprovalsPage() {
  const { rooms, bookings, approveBookingYayasan, rejectBooking, returnBooking, currentUser } = useAppStore();

  const [isGroupRecurring, setIsGroupRecurring] = useState(true);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

  const [approvalTarget, setApprovalTarget] = useState<Booking | null>(null);
  const [yayasanMemo, setYayasanMemo] = useState(
    'Disetujui oleh Sekretariat Yayasan YARSI. Wajib mematuhi protokol kebersihan dan ketertiban ruangan.'
  );
  const [applyApprovalToGroup, setApplyApprovalToGroup] = useState(true);

  // Reject Modal State (Prioritas 3 - Catatan Wajib)
  const [rejectionTarget, setRejectionTarget] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [applyRejectionToGroup, setApplyRejectionToGroup] = useState(true);

  // Return/Revision Modal State (Prioritas 3 - Catatan Wajib)
  const [returnTarget, setReturnTarget] = useState<Booking | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [applyReturnToGroup, setApplyReturnToGroup] = useState(true);

  // Bookings that require Yayasan approval
  const yayasanQueue = bookings.filter(
    (b) => b.requiresYayasanApproval && b.status === 'RECOMMENDED_YAYASAN'
  );

  const yayasanHistory = bookings.filter(
    (b) =>
      b.requiresYayasanApproval &&
      (b.status === 'APPROVED' || b.status === 'REJECTED' || b.status === 'RETURNED')
  );
  const specialRooms = rooms.filter((room) => room.requiresYayasanApproval);

  // Group recurring bookings for Yayasan
  const groupedYayasanQueue: BookingGroup[] = useMemo(() => {
    if (!isGroupRecurring) {
      return yayasanQueue.map((b) => ({
        groupId: b.id,
        isRecurring: isRecurringBooking(b),
        masterBooking: b,
        bookings: [b],
        totalSessions: 1,
        startDate: b.date,
        endDate: b.date,
      }));
    }

    const groups: { [key: string]: Booking[] } = {};
    const groupOrder: string[] = [];

    for (const b of yayasanQueue) {
      let key = `single_${b.id}`;
      if (b.bulkGroupId) {
        key = `bulk_${b.bulkGroupId}`;
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
  }, [yayasanQueue, isGroupRecurring]);

  // Find related group bookings for modals
  const targetGroupBookings = useMemo(() => {
    if (!approvalTarget) return [];
    if (approvalTarget.bulkGroupId) {
      return bookings.filter(
        (b) => b.bulkGroupId === approvalTarget.bulkGroupId && b.status === 'RECOMMENDED_YAYASAN'
      );
    }
    if (isRecurringBooking(approvalTarget)) {
      return bookings.filter(
        (b) =>
          b.userId === approvalTarget.userId &&
          b.roomId === approvalTarget.roomId &&
          b.title === approvalTarget.title &&
          b.status === 'RECOMMENDED_YAYASAN' &&
          isRecurringBooking(b)
      );
    }
    return [approvalTarget];
  }, [approvalTarget, bookings]);

  const returnGroupBookings = useMemo(() => {
    if (!returnTarget) return [];
    if (returnTarget.bulkGroupId) {
      return bookings.filter(
        (b) => b.bulkGroupId === returnTarget.bulkGroupId && b.status === 'RECOMMENDED_YAYASAN'
      );
    }
    if (isRecurringBooking(returnTarget)) {
      return bookings.filter(
        (b) =>
          b.userId === returnTarget.userId &&
          b.roomId === returnTarget.roomId &&
          b.title === returnTarget.title &&
          b.status === 'RECOMMENDED_YAYASAN' &&
          isRecurringBooking(b)
      );
    }
    return [returnTarget];
  }, [returnTarget, bookings]);

  const rejectionGroupBookings = useMemo(() => {
    if (!rejectionTarget) return [];
    if (rejectionTarget.bulkGroupId) {
      return bookings.filter(
        (b) => b.bulkGroupId === rejectionTarget.bulkGroupId && b.status === 'RECOMMENDED_YAYASAN'
      );
    }
    if (isRecurringBooking(rejectionTarget)) {
      return bookings.filter(
        (b) =>
          b.userId === rejectionTarget.userId &&
          b.roomId === rejectionTarget.roomId &&
          b.title === rejectionTarget.title &&
          b.status === 'RECOMMENDED_YAYASAN' &&
          isRecurringBooking(b)
      );
    }
    return [rejectionTarget];
  }, [rejectionTarget, bookings]);

  const handleApproveYayasan = async (booking: Booking) => {
    await approveBookingYayasan(booking.id, yayasanMemo, currentUser?.name || 'Pengurus Yayasan', applyApprovalToGroup);
    setApprovalTarget(null);
  };

  const handleRejectYayasan = async (booking: Booking) => {
    if (!rejectionReason.trim()) {
      alert('Wajib mengisi memo alasan penolakan.');
      return;
    }
    await rejectBooking(booking.id, rejectionReason.trim(), currentUser?.name || 'Pengurus Yayasan', applyRejectionToGroup);
    setRejectionTarget(null);
    setRejectionReason('');
  };

  const handleReturnYayasan = async (booking: Booking) => {
    if (!returnNotes.trim()) {
      alert('Wajib mengisi catatan revisi permohonan.');
      return;
    }
    await returnBooking(booking.id, returnNotes.trim(), currentUser?.name || 'Pengurus Yayasan', applyReturnToGroup);
    setReturnTarget(null);
    setReturnNotes('');
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Yayasan Header */}
      <div className="relative space-y-3 overflow-hidden rounded-[18px_4px_18px_18px] border border-slate-200/90 border-l-4 border-l-yarsi-primary bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-yarsi-primary">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          <span>Biro Sekretariat & Pengurus Yayasan YARSI</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Keputusan akhir ruang khusus
        </h1>
        <p className="max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
          Tinjau permohonan ruang khusus yang telah diverifikasi dan direkomendasikan oleh LPF.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-bold">
          <span className="border-l-2 border-sky-500 bg-sky-50 px-3 py-2 text-sky-800">Rekomendasi LPF</span>
          <span className="text-slate-400" aria-hidden="true">→</span>
          <span className="border-l-2 border-yarsi-primary bg-emerald-50 px-3 py-2 text-emerald-800">Keputusan Yayasan</span>
        </div>
      </div>

      {/* Queue Counter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Antrean Rekomendasi LPF</p>
            <h3 className="text-2xl font-black text-amber-600">{yayasanQueue.length} Berkas</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Telah Disetujui Yayasan</p>
            <h3 className="text-2xl font-black text-emerald-600">
              {yayasanHistory.filter((b) => b.status === 'APPROVED').length} Berkas
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Ruang Khusus</p>
            <h3 className="text-2xl font-black text-slate-800">{specialRooms.length} Ruangan</h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Pending Yayasan Queue Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>Antrean Berkas Masuk Menunggu Persetujuan Yayasan</span>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              {yayasanQueue.length} Menunggu
            </span>
          </h2>

          <button
            type="button"
            onClick={() => setIsGroupRecurring(!isGroupRecurring)}
            title="Kelompokkan sesi pengulangan rutin menjadi satu pengajuan master"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
              isGroupRecurring
                ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Kelompokkan Rutin: {isGroupRecurring ? 'Aktif' : 'Nonaktif'}</span>
          </button>
        </div>

        {groupedYayasanQueue.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Tidak ada permohonan tertunda di antrean Yayasan
            </h3>
            <p className="text-xs text-slate-400">
              Semua permohonan auditorium telah disetujui atau belum ada rekomendasi baru dari LPF.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedYayasanQueue.map((group) => {
              const booking = group.masterBooking;
              const isGroup = group.totalSessions > 1;
              const isExpanded = expandedGroupIds.includes(group.groupId);

              return (
                <div
                  key={group.groupId}
                  className={`bg-white rounded-xl border-2 p-6 space-y-5 shadow-sm transition-all ${
                    isGroup
                      ? 'border-teal-300 ring-1 ring-teal-500/10'
                      : 'border-amber-300'
                  }`}
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded border border-amber-300">
                        {booking.bookingCode}
                      </span>

                      <span className="text-xs text-slate-500 hidden sm:inline">
                        Rekomendasi LPF: {booking.lpfApprovedAt || 'Baru Saja'} oleh {booking.lpfApprovedBy || 'Admin LPF'}
                      </span>
                    </div>

                    <StatusBadge status={booking.status} size="md" />
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900 leading-snug">
                          {booking.title}
                        </h3>
                        {booking.jenisKegiatan && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            {booking.jenisKegiatan}
                          </span>
                        )}
                        {isRecurringBooking(booking) && !isGroup && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-300">
                            <Repeat className="w-3 h-3 text-teal-600" />
                            <span>Rutin Per Semester</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-700">
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-amber-600" />
                          <span>{booking.roomName}</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          {isGroup ? (
                            <span className="font-semibold text-slate-800">
                              {formatDateIndo(group.startDate)} s.d. {formatDateIndo(group.endDate)} ({group.totalSessions} Sesi)
                            </span>
                          ) : (
                            <span>{formatDateIndo(booking.date)}</span>
                          )}
                        </span>

                        <span className="font-bold text-amber-700 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{booking.startTime} - {booking.endTime} WIB</span>
                        </span>

                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span>Estimasi: {booking.estimatedAttendees} Orang</span>
                        </span>
                      </div>

                      {/* Dedicated Recurring Information Box */}
                      {isRecurringBooking(booking) && (
                        <div className="flex items-start sm:items-center gap-2 px-3 py-2 rounded-xl bg-teal-50/90 border border-teal-200 text-xs text-teal-950 font-medium">
                          <Repeat className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-bold text-teal-900">Jadwal Rutin Pertemuan:</span>
                            <span className="text-teal-800 font-semibold">
                              {getRecurringScheduleLabel(booking)}
                            </span>
                            {isGroup && (
                              <span className="bg-teal-200/70 text-teal-900 text-[11px] font-extrabold px-2 py-0.5 rounded-full ml-1">
                                Total: {group.totalSessions} Sesi Pertemuan
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                        {booking.description}
                      </p>

                      {/* Logistics items */}
                      {booking.logistik && booking.logistik.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <PackageCheck className="w-3.5 h-3.5 text-amber-700" />
                            <span>Daftar Logistik & Fasilitas Diajukan:</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {booking.logistik.map((l, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg font-medium"
                              >
                                <Check className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>{l.jenisItem} ({l.jumlah}x)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* LPF Verification Notes */}
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
                        <p className="font-bold flex items-center gap-1 text-emerald-800">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Catatan Hasil Verifikasi Lapangan LPF:</span>
                        </p>
                        <p className="text-emerald-900 italic">"{booking.lpfNotes || 'Disetujui dan direkomendasikan oleh LPF.'}"</p>
                      </div>

                      {/* Attached proposal file */}
                      {(booking.documentName || booking.dokumenUrl || booking.documentUrl) && (
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-500" />
                            <span className="font-bold text-slate-800">
                              {booking.documentName || 'Dokumen_Proposal_Kegiatan.pdf'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => bookingsApi.downloadAttachment(booking.id).catch(() => undefined)}
                            className="text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1"
                          >
                            <span>Unduh & Review Proposal</span>
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Expandable Sessions List for Grouped Recurring Bookings */}
                      {isGroup && (
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => toggleGroupExpand(group.groupId)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <CalendarRange className="w-4 h-4 text-amber-700" />
                              <span>
                                {isExpanded
                                  ? `Sembunyikan Rincian Sesi (${group.totalSessions} Pertemuan)`
                                  : `Lihat Rincian Seluruh ${group.totalSessions} Sesi Pertemuan`}
                              </span>
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2.5 max-h-64 overflow-y-auto space-y-1.5 pr-1 text-xs">
                              {group.bookings.map((session, idx) => (
                                <div
                                  key={session.id}
                                  className="flex items-center justify-between p-2 rounded-lg border bg-white border-slate-200"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 text-[11px] w-12">
                                      #{idx + 1}
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                      {formatDateIndo(session.date)}
                                    </span>
                                    <span className="text-slate-500 font-mono text-[11px]">
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

                    {/* Right Actions */}
                    <div className="lg:col-span-4 bg-amber-50/50 p-5 rounded-2xl border border-amber-200 flex flex-col justify-between space-y-4">
                      <div className="space-y-1 text-xs">
                        <p className="text-amber-800 font-bold uppercase tracking-wider text-[10px]">
                          Data Pengusul:
                        </p>
                        <p className="font-bold text-slate-900 text-sm">{booking.userName}</p>
                        <p className="text-slate-600 font-mono text-[11px]">
                          {booking.userNimNidn} • {booking.userOrganization}
                        </p>
                        <p className="text-slate-600 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{booking.userPhone}</span>
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-amber-200/60">
                        <button
                          type="button"
                          onClick={() => {
                            setApprovalTarget(booking);
                            setApplyApprovalToGroup(true);
                          }}
                          className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isGroup
                              ? 'Setujui Izin Seluruh Sesi Yayasan'
                              : 'Setujui Izin Yayasan'}
                          </span>
                        </button>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReturnTarget(booking);
                              setReturnNotes('');
                              setApplyReturnToGroup(true);
                            }}
                            className="py-2 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Revisi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectionTarget(booking);
                              setRejectionReason('');
                              setApplyRejectionToGroup(true);
                            }}
                            className="py-2 px-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* APPROVAL MEMO MODAL */}
      {approvalTarget && (
        <Modal
          isOpen={!!approvalTarget}
          onClose={() => setApprovalTarget(null)}
          title="Otorisasi & Memo Persetujuan Yayasan YARSI"
          subtitle={
            applyApprovalToGroup && targetGroupBookings.length > 1
              ? `${approvalTarget.bookingCode} (Total ${targetGroupBookings.length} Sesi)`
              : approvalTarget.bookingCode
          }
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Building2 className="w-4 h-4 text-amber-700" />
                <span>{approvalTarget.roomName}</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{approvalTarget.title}</p>
              <p className="text-slate-600">
                Waktu: {formatDateIndo(approvalTarget.date)} ({approvalTarget.startTime} - {approvalTarget.endTime} WIB)
              </p>
              {isRecurringBooking(approvalTarget) && (
                <div className="flex items-center gap-2 text-xs text-teal-900 bg-teal-100/70 p-2 rounded-lg border border-teal-200 font-medium mt-1">
                  <Repeat className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span>Pengulangan: {getRecurringScheduleLabel(approvalTarget)}</span>
                </div>
              )}
            </div>

            {/* Recurring Group Notification Box in Modal */}
            {isRecurringBooking(approvalTarget) && targetGroupBookings.length > 1 && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                  <Repeat className="w-4 h-4 text-teal-600" />
                  <span>Pengajuan Peminjaman Rutin ({targetGroupBookings.length} Sesi Terjadwal)</span>
                </div>
                <label className="flex items-center gap-2 pt-1 text-xs font-bold text-teal-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyApprovalToGroup}
                    onChange={(e) => setApplyApprovalToGroup(e.target.checked)}
                    className="rounded border-teal-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>Terapkan persetujuan izin Yayasan untuk seluruh {targetGroupBookings.length} sesi pertemuan sekaligus</span>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="yayasanMemoInput" className="block text-xs font-bold text-slate-700 mb-1">
                Memo Resmi Persetujuan Sekretariat Yayasan:
              </label>
              <textarea
                id="yayasanMemoInput"
                rows={3}
                value={yayasanMemo}
                onChange={(e) => setYayasanMemo(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
            </div>

            <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Dengan mengklik setujui, sistem akan otomatis menerbitkan E-Ticket QR Code resmi dan mengirimkan notifikasi persetujuan kepada pemohon.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovalTarget(null)}
                className="min-h-10 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleApproveYayasan(approvalTarget)}
                className="min-h-10 px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition-all"
              >
                {applyApprovalToGroup && targetGroupBookings.length > 1
                  ? `Setujui Seluruh ${targetGroupBookings.length} Sesi & Terbitkan Izin`
                  : 'Setujui & Terbitkan Izin'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* RETURN / REVISION MODAL (Prioritas 3 - Catatan Wajib) */}
      {returnTarget && (
        <Modal
          isOpen={!!returnTarget}
          onClose={() => setReturnTarget(null)}
          title="Kembalikan Permohonan Venue Yayasan untuk Revisi"
          subtitle={
            applyReturnToGroup && returnGroupBookings.length > 1
              ? `${returnTarget.bookingCode} (Total ${returnGroupBookings.length} Sesi)`
              : returnTarget.bookingCode
          }
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950">
              <p className="font-bold">{returnTarget.title}</p>
              <p>{returnTarget.userName} ({returnTarget.userOrganization})</p>
            </div>

            {isRecurringBooking(returnTarget) && returnGroupBookings.length > 1 && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                  <Repeat className="w-4 h-4 text-teal-600" />
                  <span>Pengajuan Peminjaman Rutin ({returnGroupBookings.length} Sesi)</span>
                </div>
                <label className="flex items-center gap-2 pt-1 text-xs font-bold text-teal-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyReturnToGroup}
                    onChange={(e) => setApplyReturnToGroup(e.target.checked)}
                    className="rounded border-teal-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>Terapkan catatan revisi untuk seluruh {returnGroupBookings.length} sesi pertemuan sekaligus</span>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="returnNotesYayasanInput" className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Revisi Yayasan (Wajib Diisi) *
              </label>
              <textarea
                id="returnNotesYayasanInput"
                rows={4}
                required
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Tuliskan hal-hal yang perlu diperbaiki atau disesuaikan sebelum disetujui Yayasan..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="min-h-10 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!returnNotes.trim()}
                onClick={() => handleReturnYayasan(returnTarget)}
                className="min-h-10 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {applyReturnToGroup && returnGroupBookings.length > 1
                  ? `Kirim Catatan Revisi Seluruh ${returnGroupBookings.length} Sesi`
                  : 'Kirim Catatan Revisi'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* REJECT MODAL (Prioritas 3 - Catatan Wajib) */}
      {rejectionTarget && (
        <Modal
          isOpen={!!rejectionTarget}
          onClose={() => setRejectionTarget(null)}
          title="Tolak Izin Penggunaan Venue Yayasan"
          subtitle={
            applyRejectionToGroup && rejectionGroupBookings.length > 1
              ? `${rejectionTarget.bookingCode} (Total ${rejectionGroupBookings.length} Sesi)`
              : rejectionTarget.bookingCode
          }
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
              <p className="font-bold">{rejectionTarget.title}</p>
              <p>{rejectionTarget.userName} ({rejectionTarget.userOrganization})</p>
            </div>

            {isRecurringBooking(rejectionTarget) && rejectionGroupBookings.length > 1 && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                  <Repeat className="w-4 h-4 text-teal-600" />
                  <span>Pengajuan Peminjaman Rutin ({rejectionGroupBookings.length} Sesi)</span>
                </div>
                <label className="flex items-center gap-2 pt-1 text-xs font-bold text-teal-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyRejectionToGroup}
                    onChange={(e) => setApplyRejectionToGroup(e.target.checked)}
                    className="rounded border-teal-400 text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  <span>Terapkan penolakan untuk seluruh {rejectionGroupBookings.length} sesi pertemuan sekaligus</span>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="rejectReasonYayasanInput" className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Penolakan Yayasan (Wajib Diisi) *
              </label>
              <textarea
                id="rejectReasonYayasanInput"
                rows={4}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tuliskan memo alasan penolakan permohonan..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="min-h-10 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={() => handleRejectYayasan(rejectionTarget)}
                className="min-h-10 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {applyRejectionToGroup && rejectionGroupBookings.length > 1
                  ? `Konfirmasi Tolak Seluruh ${rejectionGroupBookings.length} Sesi`
                  : 'Konfirmasi Tolak Izin'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
