'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { exportToCSV, formatDateIndo, formatShortDateIndo } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Building2,
  Filter,
  FileSpreadsheet,
  Star,
  Users,
  CheckCircle2,
  TrendingUp,
  PieChart,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function ReportsAnalyticsPage() {
  const { rooms, bookings, feedbacks } = useAppStore();

  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-31');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const buildings = Array.from(new Set(rooms.map((r) => r.building)));

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    if (b.date < startDate || b.date > endDate) return false;
    if (selectedBuilding !== 'all' && b.building !== selectedBuilding) return false;
    if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
    return true;
  });

  // Calculate Metrics
  const totalBookings = filteredBookings.length;
  const approvedBookings = filteredBookings.filter((b) => b.status === 'APPROVED').length;
  const completedBookings = filteredBookings.filter((b) => b.status === 'COMPLETED').length;
  const rejectedBookings = filteredBookings.filter((b) => b.status === 'REJECTED').length;

  const approvalRate =
    totalBookings > 0
      ? Math.round(((approvedBookings + completedBookings) / totalBookings) * 100)
      : 0;

  // Average Rating
  const avgRating =
    feedbacks.length > 0
      ? (
          feedbacks.reduce((acc, curr) => acc + curr.overallRating, 0) /
          feedbacks.length
        ).toFixed(1)
      : '5.0';

  // Room Popularity Counter
  const roomUsageCount: Record<string, number> = {};
  filteredBookings.forEach((b) => {
    roomUsageCount[b.roomName] = (roomUsageCount[b.roomName] || 0) + 1;
  });

  // Category Breakdown Counter
  const categoryCount: Record<string, number> = {};
  filteredBookings.forEach((b) => {
    categoryCount[b.category] = (categoryCount[b.category] || 0) + 1;
  });

  // Handle Export to CSV
  const handleExportCSV = () => {
    const rows = filteredBookings.map((b) => ({
      'Kode Booking': b.bookingCode,
      'Nama Ruangan': b.roomName,
      Gedung: b.building,
      Lantai: b.floor,
      'Nama Pemohon': b.userName,
      'NIM / NIDN': b.userNimNidn,
      'Unit / Ormawa': b.userOrganization,
      'Judul Kegiatan': b.title,
      Kategori: b.category,
      'Tanggal Pelaksanaan': b.date,
      'Jam Mulai': b.startTime,
      'Jam Selesai': b.endTime,
      'Estimasi Peserta': b.estimatedAttendees,
      Status: b.status,
      'Izin Yayasan': b.requiresYayasanApproval ? 'Ya' : 'Tidak',
      'Tanggal Diajukan': b.createdAt,
    }));

    exportToCSV(`Laporan_Peminjaman_Ruang_YARSI_${startDate}_sd_${endDate}.csv`, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-yarsi-primary text-xs font-bold mb-2 border border-emerald-200">
            <BarChart3 className="w-4 h-4 text-yarsi-primary" />
            <span>Executive Analytics & Reporting System</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Laporan Pemanfaatan Ruang & Analitik Kampus
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ekspor rekapitulasi data peminjaman ke format Excel/CSV dan evaluasi okupansi ruangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor ke Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            Dari Tanggal:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary font-sans"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            Sampai Tanggal:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary font-sans"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            Filter Gedung:
          </label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary font-sans"
          >
            <option value="all">Semua Gedung</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            Filter Status:
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary font-sans"
          >
            <option value="all">Semua Status</option>
            <option value="APPROVED">Disetujui</option>
            <option value="COMPLETED">Selesai Digunakan</option>
            <option value="PENDING_LPF">Pending LPF</option>
            <option value="RECOMMENDED_YAYASAN">Antrean Yayasan</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-yarsi-primary rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Total Peminjaman</p>
            <h3 className="text-xl font-black text-slate-800">{totalBookings} Acara</h3>
            <p className="text-[10px] text-slate-400">Periode Terpilih</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Approval Rate</p>
            <h3 className="text-xl font-black text-emerald-600">{approvalRate}%</h3>
            <p className="text-[10px] text-emerald-600 font-medium">Tingkat Persetujuan</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Kepuasan Fasilitas</p>
            <h3 className="text-xl font-black text-amber-700">{avgRating} / 5.0</h3>
            <p className="text-[10px] text-amber-600 font-medium">{feedbacks.length} Feedback Masuk</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Total Partisipan</p>
            <h3 className="text-xl font-black text-purple-900">
              {filteredBookings.reduce((a, c) => a + (c.estimatedAttendees || 0), 0)} Orang
            </h3>
            <p className="text-[10px] text-purple-700">Estimasi Pengguna</p>
          </div>
        </div>
      </div>

      {/* Analytics Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Utilized Rooms */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-yarsi-primary" />
              <span>Pemanfaatan Ruangan Terpopuler</span>
            </h3>
            <span className="text-xs text-slate-400">Total Sesi</span>
          </div>

          <div className="space-y-3 pt-2">
            {rooms.slice(0, 5).map((room) => {
              const count = roomUsageCount[room.name] || 0;
              const maxVal = Math.max(...Object.values(roomUsageCount), 1);
              const percentage = Math.round((count / maxVal) * 100);

              return (
                <div key={room.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 truncate">{room.name}</span>
                    <span className="text-yarsi-primary font-bold">{count} Sesi</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yarsi-primary to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-yarsi-primary" />
              <span>Distribusi Kategori Kegiatan</span>
            </h3>
            <span className="text-xs text-slate-400">Proporsi</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { key: 'seminar', label: 'Seminar & Kuliah Tamu', color: 'bg-emerald-500' },
              { key: 'workshop', label: 'Workshop & Pelatihan', color: 'bg-blue-500' },
              { key: 'rapat', label: 'Rapat Kerja & Pleno', color: 'bg-amber-500' },
              { key: 'kemahasiswaan', label: 'Ormawa & BEM', color: 'bg-purple-500' },
              { key: 'kuliah', label: 'Perkuliahan', color: 'bg-teal-500' },
              { key: 'yayasan', label: 'Acara Yayasan', color: 'bg-rose-500' },
            ].map((cat) => {
              const count = categoryCount[cat.key] || 0;
              return (
                <div
                  key={cat.key}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                    <span className="text-xs font-semibold text-slate-700">{cat.label}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Tabel Rekapitulasi Peminjaman ({filteredBookings.length} Data)
          </h3>
          <span className="text-xs text-slate-400">
            Terfilter: {startDate} s/d {endDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">Kode & Tanggal</th>
                <th className="p-3.5">Ruangan</th>
                <th className="p-3.5">Judul Kegiatan</th>
                <th className="p-3.5">Pemohon</th>
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada data peminjaman dalam rentang filter ini.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-yarsi-primary bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {b.bookingCode}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{b.date}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{b.roomName}</p>
                      <p className="text-[11px] text-slate-500">{b.building}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800 line-clamp-1">{b.title}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{b.category}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800">{b.userName}</p>
                      <p className="text-[10px] text-slate-500">{b.userOrganization}</p>
                    </td>
                    <td className="p-3.5 font-medium whitespace-nowrap">
                      {b.startTime} - {b.endTime} WIB
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={b.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
