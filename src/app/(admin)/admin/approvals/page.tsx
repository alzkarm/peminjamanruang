'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Booking, BookingStatus } from '@/lib/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { formatDateIndo, checkTimeOverlap } from '@/lib/utils';
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
  FileText,
  Search,
  Send,
  PackageCheck,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

export default function LpfApprovalsPage() {
  const { bookings, approveBookingLPF, rejectBooking, returnBooking, currentUser } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'pending' | 'yayasan' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [approvalTarget, setApprovalTarget] = useState<Booking | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Reject Modal State (Prioritas 3)
  const [rejectionTarget, setRejectionTarget] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Revision / Return Modal State (Prioritas 3)
  const [returnTarget, setReturnTarget] = useState<Booking | null>(null);
  const [returnNotes, setReturnNotes] = useState('');

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

  const pendingCount = bookings.filter((b) => b.status === 'PENDING_LPF').length;
  const yayasanCount = bookings.filter((b) => b.status === 'RECOMMENDED_YAYASAN').length;

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

  const handleApprove = async (booking: Booking) => {
    await approveBookingLPF(booking.id, approvalNotes, currentUser.name);
    setApprovalTarget(null);
    setApprovalNotes('');
  };

  const handleReject = async (booking: Booking) => {
    if (!rejectionReason.trim()) {
      alert('Catatan/alasan penolakan wajib diisi.');
      return;
    }
    await rejectBooking(booking.id, rejectionReason.trim(), currentUser.name);
    setRejectionTarget(null);
    setRejectionReason('');
  };

  const handleReturn = async (booking: Booking) => {
    if (!returnNotes.trim()) {
      alert('Catatan perbaikan / revisi wajib diisi agar pemohon mengetahui hal yang perlu diperbaiki.');
      return;
    }
    await returnBooking(booking.id, returnNotes.trim(), currentUser.name);
    setReturnTarget(null);
    setReturnNotes('');
  };

  const handleBulkApprove = () => {
    selectedIds.forEach((id) => {
      approveBookingLPF(id, 'Disetujui melalui bulk approval LPF', currentUser.name);
    });
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-yarsi-primary text-xs font-bold mb-2 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-yarsi-primary" />
            <span>Biro Layanan Pengelolaan Fasilitas (LPF Univ)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Verifikasi & Persetujuan Peminjaman Ruang
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
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Setujui Semua Terpilih
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveFilter('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeFilter === 'all'
                ? 'bg-yarsi-primary text-white border-yarsi-primary shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Semua Riwayat ({bookings.length})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari pemohon, ruang, kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
          />
        </div>
      </div>

      {/* Approvals Table / Card Queue */}
      {lpfQueue.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Tidak ada permohonan dalam antrean ini
          </h3>
          <p className="text-xs text-slate-400">
            Semua permohonan peminjaman ruangan telah selesai diverifikasi oleh Admin LPF.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lpfQueue.map((booking) => {
            const clash = getSimultaneousClash(booking);
            const isSelected = selectedIds.includes(booking.id);

            return (
              <div
                key={booking.id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-sm space-y-4 ${
                  clash
                    ? 'border-amber-400 ring-2 ring-amber-500/10'
                    : 'border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                {/* Top Row: Code, Status, and Potential Clash */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    {booking.status === 'PENDING_LPF' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, booking.id]);
                          } else {
                            setSelectedIds(selectedIds.filter((id) => id !== booking.id));
                          }
                        }}
                        className="rounded text-yarsi-primary focus:ring-yarsi-primary"
                      />
                    )}

                    <span className="font-mono text-xs font-bold text-yarsi-primary bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      {booking.bookingCode}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      Diajukan: {booking.createdAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {clash && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Bentrok Waktu dengan: {clash.bookingCode} ({clash.userName})</span>
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
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-yarsi-primary" />
                        <span>{booking.roomName} ({booking.building} Lt. {booking.floor})</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-yarsi-primary" />
                        <span>{formatDateIndo(booking.date)}</span>
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
                              className="text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-lg font-medium"
                            >
                              ✓ {l.jenisItem} ({l.jumlah}x) {l.catatan ? `— ${l.catatan}` : ''}
                            </span>
                          ))}
                        </div>
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
                              setApprovalNotes('Kesiapan fasilitas LPF terverifikasi lengkap. Direkomendasikan ke Sekretariat Yayasan YARSI untuk izin Auditorium.');
                            }}
                            className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                          >
                            <Send className="w-4 h-4" />
                            <span>Rekomendasikan ke Yayasan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalTarget(booking);
                              setApprovalNotes('Disetujui secara resmi oleh Biro Layanan Pengelolaan Fasilitas (LPF).');
                            }}
                            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Setujui Permohonan</span>
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReturnTarget(booking);
                              setReturnNotes('');
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
          subtitle={approvalTarget.bookingCode}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold">{approvalTarget.title}</p>
              <p>{approvalTarget.roomName} • {formatDateIndo(approvalTarget.date)} ({approvalTarget.startTime} - {approvalTarget.endTime})</p>
            </div>

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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleApprove(approvalTarget)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark rounded-xl shadow-md"
              >
                {approvalTarget.requiresYayasanApproval
                  ? 'Kirim Rekomendasi ke Yayasan'
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
          subtitle={returnTarget.bookingCode}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950">
              <p className="font-bold">{returnTarget.title}</p>
              <p>{returnTarget.userName} ({returnTarget.userOrganization})</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Revisi / Hal yang Perlu Diperbaiki (Wajib Diisi) *
              </label>
              <textarea
                rows={4}
                required
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Contoh: Mohon perbaiki estimasi jumlah peserta dan lampirkan surat rekomendasi resmi Dekanat..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Catatan ini akan tampil langsung di halaman dashboard pemohon.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!returnNotes.trim()}
                onClick={() => handleReturn(returnTarget)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Kirim Catatan Revisi
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
          subtitle={rejectionTarget.bookingCode}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
              <p className="font-bold">{rejectionTarget.title}</p>
              <p>{rejectionTarget.userName} ({rejectionTarget.userOrganization})</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Penolakan Resmi (Wajib Diisi) *
              </label>
              <textarea
                rows={4}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan secara jelas agar pemohon memahami pertimbangan LPF..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Alasan ini akan disimpan di Audit Log dan ditampilkan ke pemohon.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={() => handleReject(rejectionTarget)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Konfirmasi Tolak Permohonan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
