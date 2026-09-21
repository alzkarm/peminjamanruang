'use client';

import React from 'react';
import { CbtFaculty, CbtSeatBooking } from '@/lib/types';
import { FACULTY_COLORS, formatSeatList } from './CbtSeatMap';
import {
  Calendar,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MousePointer,
  Trash2,
} from 'lucide-react';

const FACULTIES: { code: CbtFaculty; label: string }[] = [
  { code: 'FEB', label: 'FEB — Fakultas Ekonomi & Bisnis' },
  { code: 'FH',  label: 'FH — Fakultas Hukum' },
  { code: 'FTI', label: 'FTI — Fakultas Teknologi Informasi' },
  { code: 'FK',  label: 'FK — Fakultas Kedokteran' },
  { code: 'FKG', label: 'FKG — Fakultas Kedokteran Gigi' },
  { code: 'FP',  label: 'FP — Fakultas Psikologi' },
];

interface CbtBookingFormProps {
  // Controlled fields
  title: string;
  onTitleChange: (v: string) => void;
  faculty: CbtFaculty | '';
  onFacultyChange: (f: CbtFaculty | '') => void;
  capacity: number;
  onCapacityChange: (cap: number) => void;
  notes: string;
  onNotesChange: (n: string) => void;

  // Selected seats multi-select array
  selectedSeats: number[];
  onClearSelection: () => void;

  // Bookings list for instant validation
  bookings: CbtSeatBooking[];

  // Date & Time
  selectedDate: string;
  selectedStartTime: string;
  selectedEndTime: string;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;

  // Submission & state
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

export default function CbtBookingForm({
  title,
  onTitleChange,
  faculty,
  onFacultyChange,
  capacity,
  onCapacityChange,
  notes,
  onNotesChange,
  selectedSeats,
  onClearSelection,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onSubmit,
  isLoading,
  error,
  successMessage,
}: CbtBookingFormProps) {
  const facultyColor = faculty ? FACULTY_COLORS[faculty as CbtFaculty] : null;

  const countMatches = capacity > 0 && selectedSeats.length === capacity;

  // Form validity rules
  const isFormValid =
    Boolean(faculty) &&
    Boolean(title.trim()) &&
    capacity > 0 &&
    capacity <= 200 &&
    selectedSeats.length === capacity &&
    Boolean(selectedDate) &&
    Boolean(selectedStartTime) &&
    Boolean(selectedEndTime);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-fade-in flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Success alert */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 animate-fade-in flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Time Slot Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          Slot Waktu Ujian
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Mulai</label>
            <input
              type="time"
              value={selectedStartTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Selesai</label>
            <input
              type="time"
              value={selectedEndTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-800" />

      {/* Booking Detail Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          Detail Alokasi Kursi
        </h3>

        {/* Faculty selection with border-only faculty color and solid default theme text */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Fakultas Pemohon</label>
          <select
            value={faculty}
            onChange={(e) => onFacultyChange(e.target.value as CbtFaculty | '')}
            className="w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors"
            style={
              facultyColor
                ? { borderColor: facultyColor.border, borderWidth: '2px' }
                : undefined
            }
          >
            <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
              Pilih Fakultas...
            </option>
            {FACULTIES.map((f) => (
              <option
                key={f.code}
                value={f.code}
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Judul Ujian / Kegiatan</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Contoh: Ujian CBT Blok Farmakologi"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
          />
        </div>

        {/* Kapasitas (Single number input) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Kapasitas (Jumlah Kursi)
            </label>
            <span className="text-[10px] text-slate-400">Maks. 200 kursi</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="200"
              value={capacity > 0 ? capacity : ''}
              onChange={(e) => onCapacityChange(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="Ketik jumlah kursi yang dibutuhkan (misal: 30)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
              Kursi
            </div>
          </div>
        </div>

        {/* Multi-Select Status Card with bright blue outline indicator */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-blue-600" />
              Kursi Dipilih ({selectedSeats.length} / {capacity || 0})
            </span>

            {/* Fully Functional 'Hapus Semua' Reset Button */}
            {selectedSeats.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClearSelection();
                }}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                title="Hapus semua kursi yang telah dipilih"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
                Hapus Semua
              </button>
            )}
          </div>

          {selectedSeats.length > 0 ? (
            <div className="space-y-2">
              {/* Box showing selected seats list with bright blue border */}
              <div className="p-2.5 rounded-lg border-2 border-blue-500 bg-blue-50/70 dark:bg-blue-950/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                      Daftar Kursi (Outline Biru):
                    </p>
                    <p className="text-xs font-mono font-bold text-blue-950 dark:text-blue-200 truncate mt-0.5">
                      {formatSeatList(selectedSeats)}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shrink-0">
                    {selectedSeats.length} Kursi
                  </span>
                </div>
              </div>

              {/* Validation status badge */}
              {countMatches ? (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                  <span>Kapasitas lengkap! Siap melakukan booking.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Terpilih {selectedSeats.length} dari {capacity} kursi ({capacity > selectedSeats.length ? `kurang ${capacity - selectedSeats.length}` : `kelebihan ${selectedSeats.length - capacity}`}).
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-center space-y-1">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {capacity > 0
                  ? `Silakan klik kursi di denah untuk memilih hingga ${capacity} kursi.`
                  : 'Ketik nilai Kapasitas di atas, lalu klik kursi pada denah.'}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                Tip: Seret (drag) dari kursi A ke B untuk memilih deretan berurutan, atau Shift+Klik untuk rentang.
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Catatan (opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={2}
            placeholder="Keterangan ujian / proctoring..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 resize-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className={`
          w-full py-2.5 px-4 rounded-xl text-sm font-bold
          transition-all duration-200 flex items-center justify-center gap-2 shadow-sm
          ${
            isFormValid && !isLoading
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 hover:shadow-md active:scale-[0.99] cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Memproses...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            <span>Pesan Kursi CBT ({selectedSeats.length > 0 ? `${selectedSeats.length} Kursi` : 'Pilih di Denah'})</span>
          </>
        )}
      </button>
    </form>
  );
}
