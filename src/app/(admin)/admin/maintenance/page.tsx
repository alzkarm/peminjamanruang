'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { maintenanceApi, bookingsApi } from '@/lib/api';
import { RoomMaintenance } from '@/lib/types';
import { formatDateIndo } from '@/lib/utils';
import { Modal } from '@/components/common/Modal';
import {
  Wrench,
  PlusCircle,
  Building2,
  Calendar,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Sparkles,
  UserX,
} from 'lucide-react';

export default function AdminMaintenancePage() {
  const { rooms, currentUser } = useAppStore();
  const [maintenances, setMaintenances] = useState<RoomMaintenance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [roomId, setRoomId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endDate, setEndDate] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('17:00');

  // No-Show scanner state
  const [isScanningNoShow, setIsScanningNoShow] = useState<boolean>(false);
  const [noShowResult, setNoShowResult] = useState<string | null>(null);

  const fetchMaintenances = async () => {
    try {
      setIsLoading(true);
      const data = await maintenanceApi.getAll();
      setMaintenances(data);
    } catch (err: any) {
      console.error('Failed to load maintenance schedules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenances();
  }, []);

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    if (!roomId) {
      setActionMessage({ type: 'error', text: 'Silakan pilih ruangan yang akan dipelihara.' });
      return;
    }
    if (!startDate || !endDate) {
      setActionMessage({ type: 'error', text: 'Harap tentukan tanggal mulai dan selesai.' });
      return;
    }

    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      setActionMessage({ type: 'error', text: 'Waktu selesai harus lebih akhir dari waktu mulai.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await maintenanceApi.create({
        roomId,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
      });

      setActionMessage({
        type: 'success',
        text: 'Jadwal pemeliharaan ruangan berhasil disimpan dan slot telah diblokir!',
      });
      setIsModalOpen(false);
      resetForm();
      fetchMaintenances();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Gagal menyimpan jadwal pemeliharaan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, roomName: string) => {
    if (!confirm(`Hapus jadwal pemeliharaan untuk ${roomName}? Slot reservasi akan dibuka kembali.`)) return;

    try {
      await maintenanceApi.remove(id);
      setActionMessage({
        type: 'success',
        text: 'Jadwal pemeliharaan berhasil dihapus. Ruangan kini dapat dipesan kembali.',
      });
      fetchMaintenances();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Gagal menghapus jadwal pemeliharaan.',
      });
    }
  };

  const handleRunNoShowDetection = async () => {
    try {
      setIsScanningNoShow(true);
      setNoShowResult(null);
      const res = await bookingsApi.detectNoShow();
      setNoShowResult(res.message);
    } catch (err: any) {
      setNoShowResult(err?.message || 'Gagal menjalankan pemindaian No-Show.');
    } finally {
      setIsScanningNoShow(false);
    }
  };

  const resetForm = () => {
    setRoomId('');
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('08:00');
    setEndDate('');
    setEndTime('17:00');
  };

  const now = new Date();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-16">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200/90 border-l-4 border-l-amber-500 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full border border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30">
            Fasilitas & Operasional Sarpras
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 dark:text-slate-100">
            Pemeliharaan Ruang (Maintenance)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 dark:text-slate-400">
            Jadwalkan renovasi, perbaikan AC, atau pengecatan untuk memblokir reservasi ruangan secara otomatis di kalender.
          </p>
        </div>

        <div className="flex w-full flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunNoShowDetection}
            disabled={isScanningNoShow}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs shadow-2xs transition-colors dark:border-rose-500/30 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-200"
            title="Scan peminjam approved yang tidak hadir setelah 45 menit jadwal dimulai"
          >
            {isScanningNoShow ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-400" />
            ) : (
              <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>Scan Pelanggaran No-Show</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 min-h-11 sm:min-h-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Jadwal Pemeliharaan</span>
          </button>
        </div>
      </header>

      {/* Notifications */}
      {actionMessage && (
        <div
          className={`flex items-start gap-2.5 p-4 rounded-xl border text-xs font-semibold ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 dark:text-rose-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {noShowResult && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-xs font-semibold dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 dark:text-blue-400" />
          <span>{noShowResult}</span>
        </div>
      )}

      {/* System Policy Card */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600 flex items-start gap-3 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
        <Wrench className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-200">Kebijakan Pemeliharaan Ruangan:</p>
          <p className="leading-relaxed">
            Setiap jadwal pemeliharaan yang aktif akan otomatis menandai slot waktu pada Kalender Publik sebagai <strong>[PEMELIHARAAN]</strong> berwarna abu-abu. Peminjam umum yang mencoba memilih ruangan tersebut pada jam yang beririsan akan langsung ditolak oleh sistem validasi anti-bentrok.
          </p>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
          Daftar Ruangan dalam Masa Pemeliharaan ({maintenances.length})
        </h2>

        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto dark:text-amber-400" />
            <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">Memuat jadwal pemeliharaan...</p>
          </div>
        ) : maintenances.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 dark:bg-slate-900 dark:border-slate-700">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto dark:text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada pemeliharaan aktif</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Seluruh ruangan saat ini berstatus normal dan siap dipesan untuk kegiatan akademik maupun umum.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maintenances.map((item) => {
              const start = new Date(item.startTime);
              const end = new Date(item.endTime);
              const isOngoing = now >= start && now <= end;
              const isUpcoming = now < start;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-amber-300 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-500/40"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          isOngoing
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40'
                            : isUpcoming
                            ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/30'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {isOngoing ? 'Sedang Berlangsung' : isUpcoming ? 'Akan Datang' : 'Telah Lewat'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.roomName || 'Ruangan')}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 transition-colors dark:hover:text-rose-400"
                        title="Hapus pemeliharaan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug dark:text-slate-100">
                        {item.title}
                      </h3>
                      <p className="text-xs font-semibold text-yarsi-primary mt-1 flex items-center gap-1.5 dark:text-emerald-400">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{item.roomName} (Lantai {item.floor})</span>
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatDateIndo(start.toISOString().split('T')[0])} s.d.{' '}
                          {formatDateIndo(end.toISOString().split('T')[0])}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {start.toTimeString().slice(0, 5)} - {end.toTimeString().slice(0, 5)} WIB
                        </span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed dark:text-slate-400">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between dark:border-slate-800">
                    <span>Oleh: {item.createdBy}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Jadwalkan Pemeliharaan Ruangan"
        subtitle="Blokir reservasi ruangan untuk renovasi, pengecatan, perbaikan fasilitas"
        maxWidth="md"
      >
        <form onSubmit={handleCreateMaintenance} className="space-y-4 text-slate-800 dark:text-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
              Pilih Ruangan <span className="text-rose-500">*</span>
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">-- Pilih Ruangan Kampus --</option>
              {rooms
                .filter((r) => r.isActive)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Lantai {r.floor} • {r.building || 'Menara YARSI'})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
              Judul / Jenis Pemeliharaan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Perbaikan AC Central & Pengecatan Dinding"
              required
              className="w-full px-3.5 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                Jam Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                Tanggal Selesai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                Jam Selesai <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
              Catatan / Deskripsi Rincian
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruksi tambahan bagi petugas kebersihan atau teknisi..."
              className="w-full px-3.5 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan & Blokir Slot Ruangan</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
