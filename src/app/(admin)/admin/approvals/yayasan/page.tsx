'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Booking } from '@/lib/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { formatDateIndo } from '@/lib/utils';
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
} from 'lucide-react';

export default function YayasanApprovalsPage() {
  const { bookings, approveBookingYayasan, rejectBooking, returnBooking, currentUser } = useAppStore();

  const [approvalTarget, setApprovalTarget] = useState<Booking | null>(null);
  const [yayasanMemo, setYayasanMemo] = useState(
    'Disetujui oleh Sekretariat Yayasan YARSI. Wajib mematuhi protokol kebersihan dan ketertiban gedung.'
  );

  // Reject Modal State (Prioritas 3 - Catatan Wajib)
  const [rejectionTarget, setRejectionTarget] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Return/Revision Modal State (Prioritas 3 - Catatan Wajib)
  const [returnTarget, setReturnTarget] = useState<Booking | null>(null);
  const [returnNotes, setReturnNotes] = useState('');

  // Bookings that require Yayasan approval
  const yayasanQueue = bookings.filter(
    (b) => b.requiresYayasanApproval && b.status === 'RECOMMENDED_YAYASAN'
  );

  const yayasanHistory = bookings.filter(
    (b) =>
      b.requiresYayasanApproval &&
      (b.status === 'APPROVED' || b.status === 'REJECTED' || b.status === 'RETURNED')
  );

  const handleApproveYayasan = async (booking: Booking) => {
    await approveBookingYayasan(booking.id, yayasanMemo, currentUser.name);
    setApprovalTarget(null);
  };

  const handleRejectYayasan = async (booking: Booking) => {
    if (!rejectionReason.trim()) {
      alert('Wajib mengisi memo alasan penolakan.');
      return;
    }
    await rejectBooking(booking.id, rejectionReason.trim(), currentUser.name);
    setRejectionTarget(null);
    setRejectionReason('');
  };

  const handleReturnYayasan = async (booking: Booking) => {
    if (!returnNotes.trim()) {
      alert('Wajib mengisi catatan revisi permohonan.');
      return;
    }
    await returnBooking(booking.id, returnNotes.trim(), currentUser.name);
    setReturnTarget(null);
    setReturnNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Yayasan Header */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-amber-600/30 relative overflow-hidden space-y-3">

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-bold border border-white/20">
          <Building2 className="w-4 h-4 text-amber-300" />
          <span>Biro Sekretariat & Pengurus Yayasan YARSI</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black">
          Persetujuan Khusus Auditorium & Ruang Senat
        </h1>
        <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl leading-relaxed">
          Otorisasi tingkat tinggi untuk penggunaan Auditorium Ar-Rahman (700 pax), Auditorium Ar-Razi (350 pax), dan Ruang Sidang Senat Universitas.
        </p>
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
            <p className="text-xs text-slate-400 font-semibold">Venue Tier Khusus</p>
            <h3 className="text-2xl font-black text-slate-800">3 Ruangan</h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Pending Yayasan Queue Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span>Antrean Berkas Masuk Menunggu Persetujuan Yayasan</span>
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
            {yayasanQueue.length} Menunggu
          </span>
        </h2>

        {yayasanQueue.length === 0 ? (
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
            {yayasanQueue.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-xl border-2 border-amber-300 shadow-sm p-6 space-y-5"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded border border-amber-300">
                      {booking.bookingCode}
                    </span>
                    <span className="text-xs text-slate-500">
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
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-700">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <span>{booking.roomName} ({booking.building})</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>{formatDateIndo(booking.date)}</span>
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
                        <a
                          href={booking.dokumenUrl || booking.documentUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1"
                        >
                          <span>Unduh & Review Proposal</span>
                          <Download className="w-3.5 h-3.5" />
                        </a>
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
                        onClick={() => setApprovalTarget(booking)}
                        className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Setujui Izin Yayasan</span>
                      </button>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReturnTarget(booking);
                            setReturnNotes('');
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
            ))}
          </div>
        )}
      </div>

      {/* APPROVAL MEMO MODAL */}
      {approvalTarget && (
        <Modal
          isOpen={!!approvalTarget}
          onClose={() => setApprovalTarget(null)}
          title="Otorisasi & Memo Persetujuan Yayasan YARSI"
          subtitle={approvalTarget.bookingCode}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Building2 className="w-4 h-4 text-amber-700" />
                <span>{approvalTarget.roomName} • {approvalTarget.building}</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{approvalTarget.title}</p>
              <p className="text-slate-600">
                Waktu: {formatDateIndo(approvalTarget.date)} ({approvalTarget.startTime} - {approvalTarget.endTime} WIB)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Memo Resmi Persetujuan Sekretariat Yayasan:
              </label>
              <textarea
                rows={3}
                value={yayasanMemo}
                onChange={(e) => setYayasanMemo(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Dengan mengklik setujui, sistem akan otomatis menerbitkan E-Ticket QR Code resmi dan mengirimkan notifikasi persetujuan kepada pemohon.
              </span>
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
                onClick={() => handleApproveYayasan(approvalTarget)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md"
              >
                Terbitkan Persetujuan Yayasan
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
                Catatan Revisi Yayasan (Wajib Diisi) *
              </label>
              <textarea
                rows={4}
                required
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Tuliskan hal-hal yang perlu diperbaiki atau disesuaikan sebelum disetujui Yayasan..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
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
                onClick={() => handleReturnYayasan(returnTarget)}
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
          title="Tolak Izin Penggunaan Venue Yayasan"
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
                Alasan Penolakan Yayasan (Wajib Diisi) *
              </label>
              <textarea
                rows={4}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tuliskan memo alasan penolakan permohonan..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
              />
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
                onClick={() => handleRejectYayasan(rejectionTarget)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Konfirmasi Tolak Izin
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
