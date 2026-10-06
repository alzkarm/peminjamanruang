'use client';

import React, { useState } from 'react';
import { Booking, Room } from '@/lib/types';
import { Modal } from '@/components/common/Modal';
import { bookingsApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { formatDateIndo } from '@/lib/utils';
import {
  CalendarClock,
  Calendar,
  Clock,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface RescheduleBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RescheduleBookingModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: RescheduleBookingModalProps) {
  const { rooms, fetchBookings } = useAppStore();
  const [newDate, setNewDate] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('08:00');
  const [newEndTime, setNewEndTime] = useState<string>('12:00');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync initial state when booking opens
  React.useEffect(() => {
    if (booking) {
      setNewDate(booking.date || '');
      setNewStartTime(booking.startTime || '08:00');
      setNewEndTime(booking.endTime || '12:00');
      setSelectedRoomId(booking.roomId || '');
      setReason('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [booking]);

  if (!booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newDate) {
      setErrorMessage('Silakan tentukan tanggal pelaksanaan baru.');
      return;
    }

    if (newStartTime >= newEndTime) {
      setErrorMessage('Jam selesai harus lebih akhir dari jam mulai.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Harap isi alasan permohonan pindah jadwal.');
      return;
    }

    try {
      setIsSubmitting(true);
      await bookingsApi.reschedule(booking.id, {
        newDate,
        newStartTime,
        newEndTime,
        newRoomId: selectedRoomId || booking.roomId,
        reason: reason.trim(),
      });

      setSuccessMessage('Pengajuan pindah jadwal berhasil dikirim! Menunggu persetujuan tim LPF.');
      await fetchBookings().catch(() => undefined);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit reschedule:', err);
      setErrorMessage(
        err?.message || 'Gagal mengajukan pindah jadwal. Ruangan mungkin telah terisi pada waktu tersebut.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetRoom = rooms.find((r) => r.id === (selectedRoomId || booking.roomId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajukan Pindah Jadwal (Reschedule)"
      subtitle="Geser jadwal atau ruangan peminjaman tanpa perlu membatalkan pengajuan dari awal"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-slate-800 dark:text-slate-200">
        {/* Current Schedule Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2 dark:border-slate-700 dark:bg-slate-800/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Jadwal Saat Ini (Terdaftar)
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm dark:text-slate-100">{booking.title}</p>
              <p className="text-slate-600 flex items-center gap-1.5 dark:text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-yarsi-primary dark:text-emerald-400" />
                <span>{booking.roomName} (Lt. {booking.floor})</span>
              </p>
            </div>
            <div className="text-left sm:text-right text-slate-700 space-y-0.5 font-medium dark:text-slate-300">
              <p className="flex items-center sm:justify-end gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{formatDateIndo(booking.date)}</span>
              </p>
              <p className="flex items-center sm:justify-end gap-1 font-mono text-yarsi-primary font-bold dark:text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{booking.startTime} - {booking.endTime} WIB</span>
              </p>
            </div>
          </div>
        </div>

        {/* New Schedule Inputs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-yarsi-primary uppercase tracking-wider dark:text-emerald-400">
            <CalendarClock className="w-4 h-4" />
            <span>Pilihan Jadwal Baru yang Diajukan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 dark:text-slate-300">
                Tanggal Baru Pelaksanaan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={newDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-yarsi-primary focus:border-yarsi-primary transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            {/* Room Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 dark:text-slate-300">
                Ruangan Target
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-yarsi-primary focus:border-yarsi-primary transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
              >
                <option value={booking.roomId}>
                  Tetap di {booking.roomName} (Lantai {booking.floor})
                </option>
                {rooms
                  .filter((r) => r.id !== booking.roomId && r.isActive)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Lantai {r.floor} • Kap. {r.capacity || 40})
                    </option>
                  ))}
              </select>
            </div>

            {/* New Start Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 dark:text-slate-300">
                Jam Mulai Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold focus:ring-2 focus:ring-yarsi-primary focus:border-yarsi-primary transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            {/* New End Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 dark:text-slate-300">
                Jam Selesai Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold focus:ring-2 focus:ring-yarsi-primary focus:border-yarsi-primary transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 dark:text-slate-300">
              Alasan Pengajuan Pindah Jadwal <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pembicara berhalangan hadir pada tanggal semula / Perubahan rundown acara dari dekanat..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-yarsi-primary focus:border-yarsi-primary transition-all resize-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/60"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yarsi-primary hover:bg-yarsi-dark text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Kirim Permohonan Reschedule</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
