'use client';

import React from 'react';
import { Booking, AcademicBlock } from '@/lib/types';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateIndo } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  Building,
  User,
  Users,
  ShieldCheck,
  FileText,
  Sparkles,
  GraduationCap,
  Info,
  CheckCircle2,
  XCircle,
  Phone,
  Building2,
} from 'lucide-react';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: Booking | null;
  academicBlock?: AcademicBlock | null;
  dateStr?: string;
}

export function EventDetailModal({
  isOpen,
  onClose,
  booking,
  academicBlock,
  dateStr,
}: EventDetailModalProps) {
  if (!isOpen) return null;

  if (academicBlock) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Jadwal Perkuliahan Reguler"
        subtitle="Diblokir otomatis untuk perkuliahan semester"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0 mt-0.5">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                {academicBlock.courseCode}
              </span>
              <h3 className="text-base font-bold text-purple-950 mt-1">
                {academicBlock.title}
              </h3>
              <p className="text-xs text-purple-800 font-medium">
                {academicBlock.semester} • {academicBlock.faculty}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <p className="text-slate-400 font-medium">Ruangan & Lokasi</p>
              <p className="font-semibold text-slate-800 mt-0.5">{academicBlock.roomName}</p>
              <p className="text-slate-500">{academicBlock.building}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Waktu Perkuliahan</p>
              <p className="font-semibold text-slate-800 mt-0.5">
                {academicBlock.startTime} - {academicBlock.endTime} WIB
              </p>
              <p className="text-slate-500">
                Setiap {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][academicBlock.dayOfWeek - 1]}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Dosen Pengampu</p>
              <p className="font-semibold text-slate-800 mt-0.5">{academicBlock.lecturerName}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Kelompok Mahasiswa</p>
              <p className="font-semibold text-slate-800 mt-0.5">{academicBlock.studentGroup}</p>
            </div>
          </div>

          <div className="bg-slate-100 p-3 rounded-xl text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Ruangan ini dikunci untuk kegiatan perkuliahan universitas dan tidak dapat dipinjam umum pada jam ini.</span>
          </div>
        </div>
      </Modal>
    );
  }

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Peminjaman Ruangan"
      subtitle={booking.bookingCode}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Status and Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kategori: {booking.category.toUpperCase()}
            </span>
            <h2 className="text-lg font-bold text-slate-900 leading-snug mt-0.5">
              {booking.title}
            </h2>
          </div>
          <div>
            <StatusBadge status={booking.status} size="lg" />
          </div>
        </div>

        {/* Schedule & Location Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-yarsi-primary" />
              <span>Tanggal Pelaksanaan</span>
            </span>
            <p className="text-sm font-bold text-slate-800">
              {formatDateIndo(booking.date)}
            </p>
            <p className="text-xs font-semibold text-yarsi-primary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{booking.startTime} - {booking.endTime} WIB</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-yarsi-primary" />
              <span>Ruangan & Lokasi</span>
            </span>
            <p className="text-sm font-bold text-slate-800">
              {booking.roomName}
            </p>
            <p className="text-xs text-slate-600">
              {booking.building} (Lantai {booking.floor})
            </p>
          </div>
        </div>

        {/* Applicant Details */}
        <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-yarsi-primary" />
            <span>Informasi Pemohon / Penanggung Jawab</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Nama Pemohon</p>
              <p className="font-semibold text-slate-800 mt-0.5">{booking.userName}</p>
              <p className="text-[11px] text-slate-500">{booking.userNimNidn}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Unit / Ormawa</p>
              <p className="font-semibold text-slate-800 mt-0.5">{booking.userOrganization}</p>
              <p className="text-[11px] text-slate-500">{booking.department}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Kontak & Peserta</p>
              <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>{booking.userPhone}</span>
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span>~{booking.estimatedAttendees} Peserta</span>
              </p>
            </div>
          </div>
        </div>

        {/* Description & Equipment */}
        <div className="space-y-3 text-xs">
          <div>
            <h4 className="font-bold text-slate-700 mb-1">Deskripsi Kegiatan:</h4>
            <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
              {booking.description}
            </p>
          </div>

          {booking.equipments && booking.equipments.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 mb-1.5">Fasilitas / Peralatan Tambahan:</h4>
              <div className="flex flex-wrap gap-1.5">
                {booking.equipments.map((eq, i) => (
                  <span
                    key={i}
                    className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{eq.equipmentName} ({eq.quantity} unit)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {booking.documentName && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-500" />
                <span className="font-medium text-slate-700">{booking.documentName}</span>
              </div>
              <span className="text-[11px] font-bold text-yarsi-primary bg-emerald-50 px-2 py-0.5 rounded">
                Dokumen Terlampir
              </span>
            </div>
          )}
        </div>

        {/* Approval Timeline / Verification Notes */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-yarsi-primary" />
            <span>Catatan Verifikasi & Persetujuan</span>
          </h4>

          {booking.lpfNotes && (
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800">Review LPF Universitas</span>
                <span className="text-[10px] text-slate-400">{booking.lpfApprovedAt}</span>
              </div>
              <p className="text-slate-600 mt-1">{booking.lpfNotes}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Petugas: {booking.lpfApprovedBy}</p>
            </div>
          )}

          {booking.yayasanNotes && (
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800">Persetujuan Sekretariat Yayasan</span>
                <span className="text-[10px] text-slate-400">{booking.yayasanApprovedAt}</span>
              </div>
              <p className="text-slate-600 mt-1">{booking.yayasanNotes}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Petugas: {booking.yayasanApprovedBy}</p>
            </div>
          )}

          {booking.rejectionReason && (
            <div className="bg-rose-50 text-rose-800 p-2.5 rounded-lg border border-rose-200">
              <div className="flex items-center gap-1 font-bold">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Alasan Penolakan</span>
              </div>
              <p className="mt-1">{booking.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
