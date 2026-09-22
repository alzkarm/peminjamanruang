'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Booking, BookingStatus } from '@/lib/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import {
  formatDateIndo,
  checkTimeOverlap,
  isRecurringBooking,
  getRecurringScheduleLabel,
  countUniqueBookingApplications,
} from '@/lib/utils';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Users,
  Search,
  Send,
  PackageCheck,
  Phone,
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
  hasClash: boolean;
  clashingBookings: { session: Booking; clashWith: Booking }[];
}

export default function LpfApprovalsPage() {
  const { bookings, approveBookingLPF, rejectBooking, returnBooking, currentUser } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'pending' | 'yayasan' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGroupRecurring, setIsGroupRecurring] = useState(true);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

  // Modals state
  const [approvalTarget, setApprovalTarget] = useState<Booking | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [applyApprovalToGroup, setApplyApprovalToGroup] = useState(true);

  // Reject Modal State (Prioritas 3)
  const [rejectionTarget, setRejectionTarget] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [applyRejectionToGroup, setApplyRejectionToGroup] = useState(true);

  // Revision / Return Modal State (Prioritas 3)
  const [returnTarget, setReturnTarget] = useState<Booking | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [applyReturnToGroup, setApplyReturnToGroup] = useState(true);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter bookings
  const lpfQueue = bookings.filter((b) => {
    // search
    if (
      searchQuery &&
      !b.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.userName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.roomName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (activeFilter === 'pending') return b.status === 'PENDING_LPF';
    if (activeFilter === 'yayasan') return b.status === 'RECOMMENDED_YAYASAN';
    return true; // all
  });

  const pendingCount = countUniqueBookingApplications(bookings.filter((b) => b.status === 'PENDING_LPF'));
  const yayasanCount = countUniqueBookingApplications(bookings.filter((b) => b.status === 'RECOMMENDED_YAYASAN'));
  const totalCount = countUniqueBookingApplications(bookings);

  // Conflict detector between pending bookings in the same room/time
  const getSimultaneousClash = (targetBooking: Booking) => {
    return bookings.find(
      (b) =>
        b.id !== targetBooking.id &&
        b.roomId === targetBooking.roomId &&
        b.date === targetBooking.date &&
        ['PENDING_LPF', 'RECOMMENDED_YAYASAN', 'APPROVED'].includes(b.status) &&
        checkTimeOverlap(
          targetBooking.startTime,
          targetBooking.endTime,
          b.startTime,
          b.endTime
        )
    );
  };

  // Group bookings when isGroupRecurring is active
  const groupedQueue: BookingGroup[] = useMemo(() => {
    if (!isGroupRecurring) {
      return lpfQueue.map((b) => {
        const clash = getSimultaneousClash(b);
        return {
          groupId: b.id,
          isRecurring: isRecurringBooking(b),
          masterBooking: b,
          bookings: [b],
          totalSessions: 1,
          startDate: b.date,
          endDate: b.date,
          hasClash: !!clash,
          clashingBookings: clash ? [{ session: b, clashWith: clash }] : [],
        };
      });
    }

    const groups: { [key: string]: Booking[] } = {};
    const groupOrder: string[] = [];

    for (const b of lpfQueue) {
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

      const clashingBookings: { session: Booking; clashWith: Booking }[] = [];
      for (const item of items) {
        const clash = getSimultaneousClash(item);
        if (clash) {
          clashingBookings.push({ session: item, clashWith: clash });
        }
      }

      return {
        groupId: key,
        isRecurring,
        masterBooking,
        bookings: items,
        totalSessions: items.length,
        startDate: items[0]?.date || '',
        endDate: items[items.length - 1]?.date || '',
        hasClash: clashingBookings.length > 0,
        clashingBookings,
      };
    });
  }, [lpfQueue, isGroupRecurring, bookings]);

  // Find related group bookings for modals
  const targetGroupBookings = useMemo(() => {
    if (!approvalTarget) return [];
    if (approvalTarget.bulkGroupId) {
      return bookings.filter(
        (b) => b.bulkGroupId === approvalTarget.bulkGroupId && b.status === approvalTarget.status
      );
    }
    if (isRecurringBooking(approvalTarget)) {
      return bookings.filter(
        (b) =>
          b.userId === approvalTarget.userId &&
          b.roomId === approvalTarget.roomId &&
          b.title === approvalTarget.title &&
          b.status === approvalTarget.status &&
          isRecurringBooking(b)
      );
    }
    return [approvalTarget];
  }, [approvalTarget, bookings]);

  const returnGroupBookings = useMemo(() => {
    if (!returnTarget) return [];
    if (returnTarget.bulkGroupId) {
      return bookings.filter(
        (b) => b.bulkGroupId === returnTarget.bulkGroupId && b.status === returnTarget.status
      );
    }
    if (isRecurringBooking(returnTarget)) {
      return bookings.filter(
        (b) =>
          b.userId === returnTarget.userId &&
          b.roomId === returnTarget.roomId &&
          b.title === returnTarget.title &&
          b.status === returnTarget.status &&
          isRecurringBooking(b)
      );
    }
    return [returnTarget];
  }, [returnTarget, bookings]);

  const rejectionGroupBookings = useMemo(() => {
    if (!rejectionTarget) return [];
    if (rejectionTarget.bulkGroupId) {
      return bookings.filter(
        (b) => b.bulkGroupId === rejectionTarget.bulkGroupId && b.status === rejectionTarget.status
      );
    }
    if (isRecurringBooking(rejectionTarget)) {
      return bookings.filter(
        (b) =>
          b.userId === rejectionTarget.userId &&
          b.roomId === rejectionTarget.roomId &&
          b.title === rejectionTarget.title &&
          b.status === rejectionTarget.status &&
          isRecurringBooking(b)
      );
    }
    return [rejectionTarget];
  }, [rejectionTarget, bookings]);

  const handleApprove = async (booking: Booking) => {
    await approveBookingLPF(booking.id, approvalNotes, currentUser?.name || 'Admin LPF', applyApprovalToGroup);
    setApprovalTarget(null);
    setApprovalNotes('');
  };

  const handleReject = async (booking: Booking) => {
    if (!rejectionReason.trim()) {
      alert('Catatan/alasan penolakan wajib diisi.');
      return;
    }
    await rejectBooking(booking.id, rejectionReason.trim(), currentUser?.name || 'Admin LPF', applyRejectionToGroup);
    setRejectionTarget(null);
    setRejectionReason('');
  };

  const handleReturn = async (booking: Booking) => {
    if (!returnNotes.trim()) {
      alert('Catatan perbaikan / revisi wajib diisi agar pemohon mengetahui hal yang perlu diperbaiki.');
      return;
    }
    await returnBooking(booking.id, returnNotes.trim(), currentUser?.name || 'Admin LPF', applyReturnToGroup);
    setReturnTarget(null);
    setReturnNotes('');
  };

  const handleBulkApprove = () => {
    selectedIds.forEach((id) => {
      approveBookingLPF(id, 'Disetujui melalui bulk approval LPF', currentUser?.name || 'Admin LPF', false);
    });
    setSelectedIds([]);
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-col justify-between gap-4 rounded-[18px_4px_18px_18px] border border-slate-200/90 border-l-4 border-l-yarsi-primary bg-white p-6 shadow-sm sm:p-8 md:flex-row md:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-yarsi-primary">
            <ShieldCheck className="w-4 h-4 text-yarsi-primary" />
            <span>Biro Layanan Pengelolaan Fasilitas (LPF Univ)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Antrean persetujuan LPF
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola verifikasi ruang kuliah, lab, aula, dan alur rekomendasi Auditorium ke Yayasan.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-2xl border border-emerald-300 animate-fade-in">
            <span className="text-xs font-bold text-emerald-900 px-2">
              {selectedIds.length} dipilih
            </span>
            <button
              type="button"
              onClick={handleBulkApprove}
              className="min-h-10 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              Setujui Semua Terpilih
            </button>
          </div>
        )}
      </header>

      {/* Filter Tabs, Grouping Toggle & Search */}
      <div className="sticky top-[104px] z-20 flex flex-col justify-between gap-3 rounded-[14px_3px_14px_14px] border border-slate-200/80 bg-white/95 p-3 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.5)] backdrop-blur sm:flex-row sm:items-center sm:p-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveFilter('pending')}
            aria-pressed={activeFilter === 'pending'}
            className={`min-h-11 whitespace-nowrap border px-3.5 py-2 text-xs font-bold ${
              activeFilter === 'pending'
                ? 'bg-yarsi-primary text-white border-yarsi-primary shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Antrean Baru LPF ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('yayasan')}
            aria-pressed={activeFilter === 'yayasan'}
            className={`min-h-11 whitespace-nowrap border px-3.5 py-2 text-xs font-bold ${
              activeFilter === 'yayasan'
                ? 'bg-yarsi-primary text-white border-yarsi-primary shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Direkomendasikan ke Yayasan ({yayasanCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            aria-pressed={activeFilter === 'all'}
            className={`min-h-11 whitespace-nowrap border px-3.5 py-2 text-xs font-bold ${
              activeFilter === 'all'
                ? 'bg-yarsi-primary text-white border-yarsi-primary shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Semua Riwayat ({totalCount})
          </button>
        </div>

        {/* Grouping Toggle & Search Box */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGroupRecurring(!isGroupRecurring)}
            title="Kelompokkan sesi pengulangan rutin menjadi satu pengajuan master"
            className={`flex items-center gap-1.5 min-h-11 px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${
              isGroupRecurring
                ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">Kelompokkan Rutin:</span>
            <span>{isGroupRecurring ? 'Aktif' : 'Nonaktif'}</span>
          </button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cari pemohon, ruang, kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari permohonan"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none hover:border-slate-300 focus:border-yarsi-primary focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Approvals Table / Card Queue */}
      {groupedQueue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          {searchQuery ? <Search className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" /> : <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />}
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? 'Permohonan tidak ditemukan' : 'Tidak ada permohonan dalam antrean ini'}
          </h3>
          <p className="text-xs text-slate-400">
            {searchQuery ? `Tidak ada hasil yang cocok dengan “${searchQuery}”.` : 'Semua permohonan peminjaman ruangan telah selesai diverifikasi oleh Admin LPF.'}
          </p>
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-yarsi-primary">Hapus pencarian</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedQueue.map((group) => {
            const booking = group.masterBooking;
            const isGroup = group.totalSessions > 1;
            const isExpanded = expandedGroupIds.includes(group.groupId);

            return (
              <div
                key={group.groupId}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-sm space-y-4 ${
                  group.hasClash
                    ? 'border-amber-400 ring-2 ring-amber-500/10'
                    : isGroup
                    ? 'border-teal-200 ring-1 ring-teal-500/10 hover:border-teal-400'
                    : 'border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                {/* Top Row: Code, Group Badge, Status, and Potential Clash */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-yarsi-primary bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      {booking.bookingCode}
                    </span>

                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Diajukan: {booking.createdAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {group.hasClash && (
                      <span className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Bentrok Waktu ({group.clashingBookings.length} Sesi)</span>
                      </span>
                    )}

                    <StatusBadge status={booking.status} size="md" />
                  </div>
                </div>

                {/* Middle Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {booking.title}
                      </h3>
                      {booking.jenisKegiatan && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-yarsi-primary border border-emerald-300">
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

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-yarsi-primary" />
                        <span>{booking.roomName} (Lt. {booking.floor})</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-yarsi-primary" />
                        {isGroup ? (
                          <span className="font-semibold text-slate-800">
                            {formatDateIndo(group.startDate)} s.d. {formatDateIndo(group.endDate)} ({group.totalSessions} Sesi)
                          </span>
                        ) : (
                          <span>{formatDateIndo(booking.date)}</span>
                        )}
                      </span>

                      <span className="font-bold text-yarsi-primary flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{booking.startTime} - {booking.endTime} WIB</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>~{booking.estimatedAttendees} Peserta</span>
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

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                      <p><strong>Deskripsi:</strong> {booking.description}</p>
                    </div>

                    {/* Logistics items */}
                    {booking.logistik && booking.logistik.length > 0 && (
                      <div className="pt-1">
                        <p className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                          <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kebutuhan Logistik & Fasilitas:</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {booking.logistik.map((l, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-lg font-medium"
                            >
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{l.jenisItem} ({l.jumlah}x) {l.catatan ? `— ${l.catatan}` : ''}</span>
                            </span>
                          ))}
                        </div>
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
                            <CalendarRange className="w-4 h-4 text-yarsi-primary" />
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
                            {group.bookings.map((session, idx) => {
                              const sessionClash = getSimultaneousClash(session);
                              return (
                                <div
                                  key={session.id}
                                  className={`flex items-center justify-between p-2 rounded-lg border ${
                                    sessionClash
                                      ? 'bg-amber-50/80 border-amber-300'
                                      : 'bg-white border-slate-200'
                                  }`}
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

                                  <div className="flex items-center gap-2">
                                    {sessionClash && (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                        Bentrok: {sessionClash.bookingCode}
                                      </span>
                                    )}
                                    <StatusBadge status={session.status} size="sm" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Col: Applicant Info & Actions */}
                  <div className="lg:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-4">
                    <div className="space-y-1 text-xs">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Pemohon:
                      </p>
                      <p className="font-bold text-slate-900 text-sm">{booking.userName}</p>
                      <p className="text-slate-500 font-mono text-[11px]">
                        {booking.userNimNidn} • {booking.userOrganization}
                      </p>
                      <p className="text-slate-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{booking.userPhone}</span>
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {booking.status === 'PENDING_LPF' ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        {booking.requiresYayasanApproval ? (
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalTarget(booking);
                              setApprovalNotes(
                                isGroup
                                  ? `Kesiapan fasilitas LPF terverifikasi lengkap. Seluruh ${group.totalSessions} sesi permohonan rutin direkomendasikan ke Sekretariat Yayasan YARSI.`
                                  : 'Kesiapan fasilitas LPF terverifikasi lengkap. Direkomendasikan ke Sekretariat Yayasan YARSI untuk izin Auditorium.'
                              );
                              setApplyApprovalToGroup(true);
                            }}
                            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition-all"
                          >
                            <Send className="w-4 h-4" />
                            <span>
                              {isGroup
                                ? 'Rekomendasikan Seluruh Sesi'
                                : 'Rekomendasikan ke Yayasan'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalTarget(booking);
                              setApprovalNotes(
                                isGroup
                                  ? `Disetujui secara resmi oleh Biro Layanan Pengelolaan Fasilitas (LPF) untuk seluruh ${group.totalSessions} sesi pertemuan rutin.`
                                  : 'Disetujui secara resmi oleh Biro Layanan Pengelolaan Fasilitas (LPF).'
                              );
                              setApplyApprovalToGroup(true);
                            }}
                            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {isGroup
                                ? 'Setujui Seluruh Sesi Rutin'
                                : 'Setujui Permohonan'}
                            </span>
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReturnTarget(booking);
                              setReturnNotes('');
                              setApplyReturnToGroup(true);
                            }}
                            className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Kembalikan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectionTarget(booking);
                              setRejectionReason('');
                              setApplyRejectionToGroup(true);
                            }}
                            className="py-1.5 px-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-slate-500 font-medium">
                        {booking.lpfNotes && <p className="italic">"{booking.lpfNotes}"</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPROVE MODAL */}
      {approvalTarget && (
        <Modal
          isOpen={!!approvalTarget}
          onClose={() => setApprovalTarget(null)}
          title={
            approvalTarget.requiresYayasanApproval
              ? 'Rekomendasikan ke Yayasan YARSI'
              : 'Konfirmasi Persetujuan LPF'
          }
          subtitle={
            applyApprovalToGroup && targetGroupBookings.length > 1
              ? `${approvalTarget.bookingCode} (Total ${targetGroupBookings.length} Sesi)`
              : approvalTarget.bookingCode
          }
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold">{approvalTarget.title}</p>
              <p>{approvalTarget.roomName} • {formatDateIndo(approvalTarget.date)} ({approvalTarget.startTime} - {approvalTarget.endTime})</p>
            </div>

            {/* Recurring Group Notification Box in Modal */}
            {isRecurringBooking(approvalTarget) && targetGroupBookings.length > 1 && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                  <Repeat className="w-4 h-4 text-teal-600" />
                  <span>Pengajuan Peminjaman Rutin ({targetGroupBookings.length} Sesi Terjadwal)</span>
                </div>
                <p className="text-[11px] text-teal-800">
                  Jadwal: {getRecurringScheduleLabel(approvalTarget)}
                </p>
                <label className="flex items-center gap-2 pt-1 text-xs font-bold text-teal-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyApprovalToGroup}
                    onChange={(e) => setApplyApprovalToGroup(e.target.checked)}
                    className="rounded border-teal-400 text-yarsi-primary focus:ring-yarsi-primary h-4 w-4"
                  />
                  <span>Terapkan persetujuan untuk seluruh {targetGroupBookings.length} sesi pertemuan sekaligus</span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Verifikasi LPF:
              </label>
              <textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
              />
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
                onClick={() => handleApprove(approvalTarget)}
                className="min-h-10 px-5 py-2.5 text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark rounded-lg shadow-sm transition-all"
              >
                {approvalTarget.requiresYayasanApproval
                  ? applyApprovalToGroup && targetGroupBookings.length > 1
                    ? `Kirim Rekomendasi Seluruh ${targetGroupBookings.length} Sesi`
                    : 'Kirim Rekomendasi ke Yayasan'
                  : applyApprovalToGroup && targetGroupBookings.length > 1
                  ? `Setujui Seluruh ${targetGroupBookings.length} Sesi & Terbitkan Tiket`
                  : 'Setujui & Terbitkan Tiket'}
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
          title="Kembalikan Permohonan untuk Revisi"
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
                    className="rounded border-teal-400 text-yarsi-primary focus:ring-yarsi-primary h-4 w-4"
                  />
                  <span>Terapkan catatan revisi untuk seluruh {returnGroupBookings.length} sesi pertemuan sekaligus</span>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="returnNotesInput" className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Revisi / Hal yang Perlu Diperbaiki (Wajib Diisi) *
              </label>
              <textarea
                id="returnNotesInput"
                rows={4}
                required
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Contoh: Mohon perbaiki estimasi jumlah peserta dan lampirkan surat rekomendasi resmi Dekanat..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Catatan ini akan tampil langsung di halaman dashboard pemohon.
              </p>
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
                onClick={() => handleReturn(returnTarget)}
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
          title="Tolak Permohonan Peminjaman"
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
              <label htmlFor="rejectReasonInput" className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Penolakan Resmi (Wajib Diisi) *
              </label>
              <textarea
                id="rejectReasonInput"
                rows={4}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan secara jelas agar pemohon memahami pertimbangan LPF..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Alasan ini akan disimpan di Audit Log dan ditampilkan ke pemohon.
              </p>
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
                onClick={() => handleReject(rejectionTarget)}
                className="min-h-10 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {applyRejectionToGroup && rejectionGroupBookings.length > 1
                  ? `Konfirmasi Tolak Seluruh ${rejectionGroupBookings.length} Sesi`
                  : 'Konfirmasi Tolak Permohonan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
