'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { formatDateIndo } from '@/lib/utils';
import {
  Star,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';

export default function FeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.bookingId as string;

  const { bookings, addFeedback, currentUser } = useAppStore();

  const booking = bookings.find((b) => b.id === bookingId);

  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [facilityRating, setFacilityRating] = useState(0);
  const [staffPunctualityRating, setStaffPunctualityRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [reportedIssue, setReportedIssue] = useState('');
  const [hasIssue, setHasIssue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Peminjaman tidak ditemukan</h2>
        <p className="text-xs text-slate-500">ID Peminjaman tidak valid atau telah dihapus.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-yarsi-primary text-white rounded-xl text-xs font-bold"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const overallRating = Math.round(
    (cleanlinessRating + facilityRating + staffPunctualityRating) / 3
  );

  const renderStarPicker = (
    label: string,
    description: string,
    value: number,
    onChange: (val: number) => void
  ) => {
    return (
      <div className="space-y-3 border-b border-slate-100 py-4 last:border-b-0">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800">{label}</h4>
            <p className="text-[11px] text-slate-400">{description}</p>
          </div>
          <span className="border-l-2 border-yarsi-primary pl-2 text-sm font-black text-yarsi-primary">
            {value} / 5
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              aria-label={`Beri nilai ${star} dari 5 untuk ${label}`}
              aria-pressed={star === value}
              className="flex min-h-11 min-w-11 items-center justify-center transition-colors hover:bg-amber-50 focus:outline-none"
            >
              <Star
                className={`w-7 h-7 ${
                  star <= value
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      addFeedback({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        roomId: booking.roomId,
        roomName: booking.roomName,
        userId: currentUser?.id || 'usr-anon',
        userName: currentUser?.name || 'Civitas YARSI',
        cleanlinessRating,
        facilityRating,
        staffPunctualityRating,
        overallRating,
        notes,
        reportedIssue: hasIssue ? reportedIssue : undefined,
      });

      setIsSubmitting(false);
      setSubmitted(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }, 500);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="border-l-4 border-yarsi-primary pl-5">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-yarsi-primary"
        >
          ← Kembali ke Dashboard
        </Link>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-yarsi-primary">Evaluasi penggunaan</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          Bagaimana kondisi ruangnya?
        </h1>
        <p className="text-xs text-slate-500">
          Penilaian singkat Anda membantu LPF menjaga kualitas ruang dan layanan.
        </p>
      </div>

      {submitted ? (
        <div className="p-8 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-center space-y-3 shadow-md animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-emerald-950">
            Terima Kasih Atas Penilaian Anda!
          </h2>
          <p className="text-xs text-emerald-800">
            Laporan evaluasi telah tersimpan dan status peminjaman telah diselesaikan secara penuh.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking Summary Box */}
          <div className="space-y-3 rounded-[16px_4px_16px_16px] border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-mono font-bold text-yarsi-primary bg-emerald-50 px-2 py-0.5 rounded">
                {booking.bookingCode}
              </span>
              <span className="text-xs text-slate-400">{formatDateIndo(booking.date)}</span>
            </div>

            <h3 className="text-base font-bold text-slate-900">{booking.title}</h3>
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-yarsi-primary shrink-0" />
              <span>{booking.roomName} (Lt. {booking.floor})</span>
            </p>
          </div>

          {/* Rating Criteria Cards */}
          <div className="space-y-1 rounded-[16px_4px_16px_16px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Penilaian Kualitas Fasilitas & Petugas</span>
            </h3>

            {renderStarPicker(
              '1. Kebersihan & Kerapian Ruangan',
              'Kondisi lantai, meja, kursi, dan sirkulasi udara saat ruangan dibuka',
              cleanlinessRating,
              setCleanlinessRating
            )}

            {renderStarPicker(
              '2. Kesiapan Fasilitas & Audio-Visual',
              'Kinerja proyektor/LED, mic wireless, speaker, AC, dan WiFi',
              facilityRating,
              setFacilityRating
            )}

            {renderStarPicker(
              '3. Ketepatan Waktu & Keramahan Petugas LPF',
              'Kecepatan pembukaan kunci pintu ruangan dan pendampingan teknisi',
              staffPunctualityRating,
              setStaffPunctualityRating
            )}
          </div>

          {/* Written Feedback & Issue Reporting */}
          <div className="space-y-4 rounded-[16px_4px_16px_16px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan & Saran Perbaikan
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan pengalaman Anda atau apresiasi untuk petugas..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
              />
            </div>

            {/* Toggle Issue report */}
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIssue}
                  onChange={(e) => setHasIssue(e.target.checked)}
                  className="rounded text-yarsi-primary focus:ring-yarsi-primary"
                />
                <span>Ada kerusakan fasilitas atau kendala yang perlu dilaporkan ke teknisi?</span>
              </label>
            </div>

            {hasIssue && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Laporan Kendala Ruangan</span>
                </div>
                <textarea
                  rows={2}
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  placeholder="Contoh: Mic wireless 2 baterai habis, remote AC di meja dosen tidak menyala..."
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Nanti Saja
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || cleanlinessRating === 0 || facilityRating === 0 || staffPunctualityRating === 0}
              className="flex min-h-11 items-center gap-2 rounded-[9px_2px_9px_9px] bg-yarsi-primary px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-yarsi-dark disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              {isSubmitting ? (
                <span>Menyimpan Evaluasi...</span>
              ) : (
                <>
                  <span>Kirim Penilaian & Selesaikan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
